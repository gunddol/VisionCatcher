import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const s3 = new S3Client({});
const ssm = new SSMClient({});

const bucketName = process.env.SITE_BUCKET_NAME;
const parameterName = process.env.INSTAGRAM_TOKEN_PARAMETER;
const feedKey = process.env.FEED_KEY || 'instagram-feed.json';
const mediaPrefix = process.env.MEDIA_PREFIX || 'instagram-media/';
const graphVersion = process.env.GRAPH_API_VERSION || 'v24.0';
const maxItems = Number(process.env.MAX_ITEMS || 18);
const refreshAfterDays = Number(process.env.REFRESH_AFTER_DAYS || 7);

const categoryRules = [
  { id: 'school', label: '학교축제', words: ['학교', '대학교', '대학', '축제', '입학식', '졸업식', '오리엔테이션'] },
  { id: 'religion', label: '종교행사', words: ['교회', '예배', '부흥회', '수련회', '성당', '기독교', '찬양'] },
  { id: 'corporate', label: '기업·단체', words: ['기업', '포럼', '학회', '컨벤션', '기념식', '개소식', '세미나', '스트리밍'] },
  { id: 'performance', label: '공연 행사', words: ['공연', '콘서트', '무대', '뮤지컬', '페스티벌', '음향', '조명'] },
];

function categoryFor(caption = '') {
  const normalized = caption.toLowerCase();
  return categoryRules.find(({ words }) => words.some((word) => normalized.includes(word))) || {
    id: 'performance',
    label: '현장 기록',
  };
}

function extensionFor(contentType, sourceUrl) {
  const known = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
  };
  if (known[contentType]) return known[contentType];
  const match = new URL(sourceUrl).pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

async function getJsonObject(key) {
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    return JSON.parse(await result.Body.transformToString());
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const message = body.error?.message || `HTTP ${response.status}`;
    throw new Error(`Instagram API request failed: ${message}`);
  }
  return body;
}

async function refreshTokenIfNeeded(token) {
  const metadataKey = `${mediaPrefix}_sync-metadata.json`;
  const metadata = await getJsonObject(metadataKey);
  const lastRefreshed = metadata?.tokenRefreshedAt ? Date.parse(metadata.tokenRefreshedAt) : 0;
  const refreshAge = refreshAfterDays * 24 * 60 * 60 * 1000;
  if (Date.now() - lastRefreshed < refreshAge) return { token, tokenRefreshedAt: metadata.tokenRefreshedAt };

  try {
    const url = new URL(`https://graph.instagram.com/${graphVersion}/refresh_access_token`);
    url.searchParams.set('grant_type', 'ig_refresh_token');
    url.searchParams.set('access_token', token);
    const refreshed = await fetchJson(url);
    if (!refreshed.access_token) throw new Error('Refresh response did not contain an access token');
    await ssm.send(new PutParameterCommand({
      Name: parameterName,
      Type: 'SecureString',
      Value: refreshed.access_token,
      Overwrite: true,
    }));
    return { token: refreshed.access_token, tokenRefreshedAt: new Date().toISOString() };
  } catch (error) {
    console.warn('Token refresh skipped; the current token will be used.', error.message);
    return { token, tokenRefreshedAt: metadata?.tokenRefreshedAt || null };
  }
}

async function cacheMedia(item) {
  const sourceUrl = item.thumbnail_url || item.media_url;
  if (!sourceUrl) return null;
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Media download failed: HTTP ${response.status}`);
  const contentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];
  if (!contentType.startsWith('image/')) return null;
  const key = `${mediaPrefix}${item.id}.${extensionFor(contentType, sourceUrl)}`;
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: Buffer.from(await response.arrayBuffer()),
    ContentType: contentType,
    CacheControl: 'public,max-age=604800,immutable',
  }));
  return `/${key}`;
}

export async function handler() {
  if (!bucketName || !parameterName) throw new Error('Required environment variables are missing');

  const secret = await ssm.send(new GetParameterCommand({ Name: parameterName, WithDecryption: true }));
  const currentToken = secret.Parameter?.Value;
  if (!currentToken) throw new Error('Instagram access token is empty');
  const refreshed = await refreshTokenIfNeeded(currentToken);

  const url = new URL(`https://graph.instagram.com/${graphVersion}/me/media`);
  url.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username');
  url.searchParams.set('limit', String(maxItems));
  url.searchParams.set('access_token', refreshed.token);
  const response = await fetchJson(url);

  const posts = [];
  for (const item of response.data || []) {
    try {
      const imageUrl = await cacheMedia(item);
      if (!imageUrl) continue;
      const category = categoryFor(item.caption);
      posts.push({
        id: item.id,
        caption: item.caption || '',
        mediaType: item.media_type,
        imageUrl,
        permalink: item.permalink,
        timestamp: item.timestamp,
        category: category.id,
        categoryLabel: category.label,
      });
    } catch (error) {
      console.warn(`Skipping media ${item.id}:`, error.message);
    }
  }

  if (!posts.length) throw new Error('Instagram returned no displayable posts; the existing feed was preserved');

  const generatedAt = new Date().toISOString();
  const payload = {
    account: 'visioncatcher_',
    generatedAt,
    posts,
  };
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: feedKey,
    Body: JSON.stringify(payload),
    ContentType: 'application/json; charset=utf-8',
    CacheControl: 'public,max-age=300,must-revalidate',
  }));
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: `${mediaPrefix}_sync-metadata.json`,
    Body: JSON.stringify({ lastSuccessfulSync: generatedAt, tokenRefreshedAt: refreshed.tokenRefreshedAt }),
    ContentType: 'application/json; charset=utf-8',
    CacheControl: 'no-store',
  }));

  console.log(`Instagram feed updated with ${posts.length} posts.`);
  return { statusCode: 200, postCount: posts.length, generatedAt };
}
