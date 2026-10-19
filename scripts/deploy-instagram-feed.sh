#!/usr/bin/env bash
set -euo pipefail

profile="${AWS_PROFILE:-visioncatcher-prod}"
region="${AWS_REGION:-ap-northeast-2}"
site_stack="visioncatcher-static-site"
feed_stack="visioncatcher-instagram-feed"
code_key="deployment/instagram-feed.zip"
temporary_directory="$(mktemp -d -t visioncatcher-instagram-feed)"
archive="${temporary_directory}/instagram-feed.zip"
trap 'rm -rf "$temporary_directory"' EXIT

site_bucket="$(aws cloudformation describe-stacks \
  --profile "$profile" --region "$region" --stack-name "$site_stack" \
  --query "Stacks[0].Outputs[?OutputKey=='SiteBucketName'].OutputValue | [0]" --output text)"

if [[ -z "$site_bucket" || "$site_bucket" == "None" ]]; then
  echo '기존 사이트 버킷을 찾지 못했습니다.' >&2
  exit 1
fi

zip -j -q "$archive" lambda/instagram-feed/index.mjs
aws s3 cp "$archive" "s3://${site_bucket}/${code_key}" \
  --profile "$profile" --region "$region" \
  --content-type application/zip \
  --cache-control no-store

aws cloudformation deploy \
  --profile "$profile" \
  --region "$region" \
  --stack-name "$feed_stack" \
  --template-file infra/instagram-feed.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    "SiteBucketName=${site_bucket}" \
    "CodeBucketName=${site_bucket}" \
    "CodeObjectKey=${code_key}" \
  --no-fail-on-empty-changeset

echo "Instagram feed infrastructure deployed: ${feed_stack}"
