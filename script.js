const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
const filterTabs = [...document.querySelectorAll('[data-filter]')];
const mediaTabs = [...document.querySelectorAll('[data-media]')];
const portfolioGallery = document.querySelector('[data-portfolio-gallery]');
const feedStatus = document.querySelector('[data-feed-status]');
const feedEmpty = document.querySelector('[data-feed-empty]');
const isInnerPage = document.body.classList.contains('inner-page') || document.body.classList.contains('page-portfolio');
const menuLabel = document.querySelector('[data-menu-label]');
if (isInnerPage) {
  document.querySelectorAll('.page-hero-inner, main .section > .container').forEach((item) => item.setAttribute('data-reveal', ''));
}
const revealItems = [...document.querySelectorAll('[data-reveal]')];
const countItems = [...document.querySelectorAll('[data-count]')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const numberFormat = new Intl.NumberFormat('ko-KR');
const postDateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
const updatedDateFormat = new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
let activePortfolioFilter = 'all';
let activeMediaFilter = 'all';
const SCOPE_BY_CATEGORY = {
  school: '기획 · 무대 · 음향 · 조명 · 운영',
  performance: '음향 · 조명 · 중계 · 영상',
  religion: '음향 · 중계 · 조명 · 시공',
  corporate: '연출 · 중계 · 디자인 · 의전',
};

function getPortfolioItems() {
  return [...document.querySelectorAll('[data-portfolio-gallery] .gallery-item')];
}

function applyPortfolioFilter() {
  const items = getPortfolioItems();
  let visibleCount = 0;
  items.forEach((item) => {
    const categoryMatch = activePortfolioFilter === 'all' || item.dataset.category === activePortfolioFilter;
    const mediaType = item.dataset.media || 'IMAGE';
    const mediaMatch = activeMediaFilter === 'all'
      || mediaType === activeMediaFilter
      || (activeMediaFilter === 'IMAGE' && mediaType === 'CAROUSEL_ALBUM');
    const hidden = !(categoryMatch && mediaMatch);
    item.hidden = hidden;
    if (!hidden) visibleCount += 1;
  });
  if (feedEmpty) {
    const showEmpty = items.length > 0 && visibleCount === 0;
    feedEmpty.hidden = !showEmpty;
    feedEmpty.classList.toggle('is-visible', showEmpty);
  }
}

function truncateText(value, length) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  return normalized.length > length ? `${normalized.slice(0, length).trim()}…` : normalized;
}

function buildInstagramCard(post, index) {
  const link = document.createElement('a');
  link.className = 'gallery-item gallery-item--live';
  link.href = post.permalink;
  link.target = '_blank';
  link.rel = 'noopener';
  link.dataset.category = post.category || 'performance';
  link.dataset.media = post.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE';
  link.dataset.scope = SCOPE_BY_CATEGORY[link.dataset.category] || '기획 · 무대 · 기술 · 운영';
  link.style.setProperty('--feed-index', String(Math.min(index, 8)));

  const thumb = document.createElement('div');
  thumb.className = 'gallery-thumb gallery-thumb--image';
  thumb.dataset.scope = link.dataset.scope;
  const image = document.createElement('img');
  image.className = 'gallery-thumb-image';
  image.src = post.imageUrl;
  image.alt = truncateText(post.caption, 80) || '비전캐처 Instagram 현장 사진';
  image.loading = index < 2 ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.width = 720;
  image.height = 720;
  if (index === 0) image.fetchPriority = 'high';
  image.addEventListener('error', () => {
    thumb.classList.add('has-image-error');
    image.remove();
  }, { once: true });
  thumb.append(image);

  if (post.mediaType === 'VIDEO') {
    const mediaBadge = document.createElement('span');
    mediaBadge.className = 'gallery-media-badge';
    mediaBadge.textContent = 'PLAY';
    thumb.append(mediaBadge);
  } else if (post.mediaType === 'CAROUSEL_ALBUM') {
    const mediaBadge = document.createElement('span');
    mediaBadge.className = 'gallery-media-badge';
    mediaBadge.textContent = 'ALBUM';
    thumb.append(mediaBadge);
  }

  const body = document.createElement('div');
  body.className = 'gallery-body';
  const tag = document.createElement('span');
  tag.className = 'gallery-tag';
  tag.textContent = post.categoryLabel || '현장 기록';
  const title = document.createElement('h3');
  title.textContent = truncateText(post.caption, 58) || 'VISION CATCHER 현장 기록';
  const date = document.createElement('p');
  const published = new Date(post.timestamp);
  date.textContent = Number.isNaN(published.getTime())
    ? 'Instagram에서 게시글 보기'
    : `${postDateFormat.format(published)} · Instagram`;
  body.append(tag, title, date);
  link.append(thumb, body);
  return link;
}

async function loadInstagramFeed() {
  if (!portfolioGallery) return;
  try {
    const feedUrl = new URL('portfolio-feed.json', document.baseURI);
    feedUrl.searchParams.set('v', String(Date.now()));
    const response = await fetch(feedUrl, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const feed = await response.json();
    if (!Array.isArray(feed.posts) || !feed.posts.length) throw new Error('Empty feed');
    const fragment = document.createDocumentFragment();
    feed.posts.forEach((post, index) => fragment.append(buildInstagramCard(post, index)));
    portfolioGallery.replaceChildren(fragment);
    portfolioGallery.dataset.feedLoaded = 'true';
    applyPortfolioFilter();
    if (feedStatus) {
      const updated = new Date(feed.generatedAt);
      const updatedText = Number.isNaN(updated.getTime())
        ? ''
        : ` · ${updatedDateFormat.format(updated)} 업데이트`;
      feedStatus.textContent = `Instagram 최신 게시물 ${feed.posts.length}개${updatedText}`;
      feedStatus.classList.add('is-loaded');
    }
  } catch (error) {
    if (feedStatus) feedStatus.textContent = '최신 피드를 불러오지 못해 대표 작업을 표시합니다.';
    console.warn('Instagram feed fallback is active.', error.message);
  } finally {
    portfolioGallery.setAttribute('aria-busy', 'false');
  }
}

function syncHeader() {
  header?.classList.toggle('is-scrolled', isInnerPage || window.scrollY > 10);
}

function closeMobileMenu() {
  if (!mobileMenu || !menuButton) return;
  mobileMenu.classList.remove('is-open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  menuButton.setAttribute('aria-expanded', 'false');
  menuLabel && (menuLabel.textContent = '메뉴 열기');
  document.body.classList.remove('menu-open');
}

function animateCount(element) {
  if (element.dataset.counted === 'true') return;
  element.dataset.counted = 'true';
  const target = Number(element.dataset.count);
  if (!Number.isFinite(target) || reduceMotion.matches) {
    element.textContent = numberFormat.format(target);
    return;
  }
  const duration = 1200;
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = numberFormat.format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();
mobileMenu?.setAttribute('aria-hidden', 'true');

menuButton?.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  mobileMenu.setAttribute('aria-hidden', String(!isOpen));
  menuLabel && (menuLabel.textContent = isOpen ? '메뉴 닫기' : '메뉴 열기');
  document.body.classList.toggle('menu-open', isOpen);
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMobileMenu);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenu?.classList.contains('is-open')) {
    closeMobileMenu();
    menuButton?.focus();
  }
});

document.addEventListener('click', (event) => {
  if (!mobileMenu?.classList.contains('is-open')) return;
  if (mobileMenu.contains(event.target) || menuButton?.contains(event.target)) return;
  closeMobileMenu();
});

if ('IntersectionObserver' in window && !reduceMotion.matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
    revealObserver.observe(item);
  });

  const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
  countItems.forEach((item) => countObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
  countItems.forEach(animateCount);
}

filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    activePortfolioFilter = tab.dataset.filter;
    filterTabs.forEach((button) => {
      const isActive = button === tab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    applyPortfolioFilter();
  });
});

mediaTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    activeMediaFilter = tab.dataset.media;
    mediaTabs.forEach((button) => {
      const isActive = button === tab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    applyPortfolioFilter();
  });
});

loadInstagramFeed();

function initHeroShowreel() {
  const showreel = document.querySelector('[data-hero-showreel]');
  if (!showreel) return;

  const scenes = [...showreel.querySelectorAll('[data-hero-scene]')];
  const stepsRoot = showreel.querySelector('[data-hero-steps]');
  const toggle = showreel.querySelector('[data-hero-toggle]');
  if (!scenes.length || !stepsRoot || !toggle) return;

  let activeIndex = 0;
  let timer = 0;
  let userPaused = false;
  let inView = true;
  const steps = scenes.map((scene, index) => {
    const button = document.createElement('button');
    button.className = 'vc-hero-step';
    button.type = 'button';
    button.setAttribute('aria-label', `${scene.dataset.label || `${index + 1}번째`} 장면 보기`);
    button.innerHTML = '<span aria-hidden="true"></span>';
    button.addEventListener('click', () => {
      userPaused = false;
      showScene(index);
    });
    stepsRoot.append(button);
    return button;
  });

  function animateHeroCounts(scene) {
    scene.querySelectorAll('[data-hero-count]').forEach((element) => {
      const target = Number(element.dataset.heroCount);
      if (!Number.isFinite(target)) return;
      if (reduceMotion.matches) {
        element.textContent = numberFormat.format(target);
        return;
      }
      element.textContent = '0';
      const startedAt = performance.now();
      const duration = 1400;
      const tick = (now) => {
        if (!scene.classList.contains('is-active')) return;
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        element.textContent = numberFormat.format(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function shouldPlay() {
    return !userPaused && inView && !document.hidden && !reduceMotion.matches;
  }

  function syncToggle() {
    const paused = !shouldPlay();
    showreel.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', userPaused ? '자동 재생' : '일시정지');
    toggle.firstElementChild.textContent = userPaused ? '▶' : 'Ⅱ';
  }

  function scheduleNext() {
    window.clearTimeout(timer);
    syncToggle();
    if (!shouldPlay() || scenes.length < 2) return;
    const duration = Number(scenes[activeIndex].dataset.duration) || 6000;
    steps[activeIndex].style.setProperty('--scene-duration', `${duration}ms`);
    timer = window.setTimeout(() => showScene((activeIndex + 1) % scenes.length), duration);
  }

  function showScene(nextIndex) {
    const previousIndex = activeIndex;
    activeIndex = (nextIndex + scenes.length) % scenes.length;
    scenes.forEach((scene, index) => {
      const isActive = index === activeIndex;
      scene.classList.toggle('is-active', isActive);
      scene.classList.toggle('is-leaving', index === previousIndex && index !== activeIndex);
      scene.setAttribute('aria-hidden', String(!isActive));
      scene.inert = !isActive;
      if (isActive) window.setTimeout(() => scene.classList.remove('is-leaving'), 950);
    });
    steps.forEach((step, index) => {
      step.classList.remove('is-active');
      step.classList.toggle('is-complete', index < activeIndex);
      step.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
    });
    void steps[activeIndex].offsetWidth;
    steps[activeIndex].classList.add('is-active');
    animateHeroCounts(scenes[activeIndex]);
    scheduleNext();
  }

  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    scheduleNext();
  });

  showreel.addEventListener('pointermove', (event) => {
    if (reduceMotion.matches) return;
    const bounds = showreel.getBoundingClientRect();
    showreel.style.setProperty('--mx', ((event.clientX - bounds.left) / bounds.width - .5).toFixed(3));
    showreel.style.setProperty('--my', ((event.clientY - bounds.top) / bounds.height - .5).toFixed(3));
  });

  if ('IntersectionObserver' in window) {
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio > .25;
      scheduleNext();
    }, { threshold: [.25, .55] });
    visibilityObserver.observe(showreel);
  }

  document.addEventListener('visibilitychange', scheduleNext);
  reduceMotion.addEventListener('change', () => showScene(activeIndex));
  showScene(0);
}

function initSectionSnap() {
  const isHome = document.body.classList.contains('home-page-v3');
  const desktop = window.matchMedia('(min-width: 761px) and (hover: hover)');
  if (!isHome || !desktop.matches || reduceMotion.matches) return;

  const panels = [...document.querySelectorAll('.snap-panel')];
  if (panels.length < 2) return;
  document.documentElement.classList.add('home-scroll-ready');

  let locked = false;
  let accumulatedDelta = 0;
  let resetTimer = 0;

  window.addEventListener('wheel', (event) => {
    if (event.ctrlKey || locked || document.body.classList.contains('menu-open')) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    const direction = Math.sign(event.deltaY);
    const currentIndex = panels.reduce((closest, panel, index) => {
      const distance = Math.abs(panel.getBoundingClientRect().top);
      return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Infinity }).index;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= panels.length) return;

    event.preventDefault();
    accumulatedDelta += event.deltaY;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => { accumulatedDelta = 0; }, 180);
    if (Math.abs(accumulatedDelta) < 12) return;

    accumulatedDelta = 0;
    locked = true;
    panels[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => { locked = false; }, 900);
  }, { passive: false });
}

function collectIntakeLines(form) {
  const data = new FormData(form);
  const scopes = data.getAll('scope').filter(Boolean);
  return [
    `[${form.dataset.formName || '프로젝트 문의'}]`,
    `행사 유형: ${data.get('event_type') || '-'}`,
    `예상 일정: ${data.get('event_date') || '-'}`,
    `행사 장소: ${data.get('event_venue') || '-'}`,
    `예상 인원: ${data.get('audience') || '-'}`,
    `필요 범위: ${scopes.length ? scopes.join(', ') : '-'}`,
    `연락처: ${String(data.get('contact') || '').trim()}`,
    `요청 내용: ${String(data.get('message') || '-').trim()}`,
  ].filter((line) => !line.endsWith(': -') || line.startsWith('[') || line.startsWith('연락처') || line.startsWith('행사 유형'));
}

function initIntakeForms() {
  document.querySelectorAll('[data-intake-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const contact = String(new FormData(form).get('contact') || '').trim();
      const status = form.querySelector('[data-form-status]');
      if (!contact) {
        if (status) status.textContent = '연락처를 입력해주세요.';
        return;
      }
      const body = collectIntakeLines(form).join('\n');
      const mailto = `mailto:biz@visioncatcher.kr?subject=${encodeURIComponent('비전캐처 프로젝트 문의')}&body=${encodeURIComponent(body)}`;
      if (status) status.textContent = '문의 내용이 준비되었습니다. 확인 후 전송해주세요.';
      window.location.href = mailto;
    });
  });
}

function prefillIntakeFromQuery() {
  const form = document.querySelector('.project-form[data-intake-form]');
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  const scope = params.get('scope');
  const scale = params.get('scale');
  const place = params.get('place');
  const note = params.get('note');
  if (type) {
    const select = form.querySelector('[name="event_type"]');
    const option = [...(select?.options || [])].find((item) => item.value === type || item.textContent === type);
    if (option) select.value = option.value;
  }
  if (scope) {
    const wanted = scope.split(/[·,]/).map((item) => item.trim()).filter(Boolean);
    form.querySelectorAll('[name="scope"]').forEach((input) => {
      input.checked = wanted.some((item) => input.value.includes(item) || item.includes(input.value));
    });
  }
  if (scale && form.elements.audience && !form.elements.audience.value) form.elements.audience.value = scale;
  if (place && form.elements.event_venue && !form.elements.event_venue.value) form.elements.event_venue.value = place;
  if (note && form.elements.message && !form.elements.message.value) form.elements.message.value = note;
}

function initEventPlanner() {
  const root = document.querySelector('[data-event-planner]');
  if (!root) return;
  const type = root.querySelector('[data-planner-type]');
  const scale = root.querySelector('[data-planner-scale]');
  const place = root.querySelector('[data-planner-place]');
  const result = root.querySelector('[data-planner-result]');
  const mail = root.querySelector('[data-planner-mail]');
  if (!type || !scale || !place || !result || !mail) return;

  const plans = {
    school: {
      title: '무대 · 음향 · 조명 · 현장 운영',
      copy: '학교축제와 공연 흐름에 맞춰 출연진 전환, 리허설, 객석 동선까지 함께 설계합니다.',
      items: ['큐시트 기반 진행', '공간 맞춤 음향', '조명 연출', '운영 스태프'],
    },
    corporate: {
      title: '연출 · 중계 · 디자인 · 의전',
      copy: '공식 행사의 브랜드 톤과 진행 안정성을 기준으로 화면, 음향, 동선을 맞춥니다.',
      items: ['행사 목적별 연출안', '중계·송출 화면', '음향 안정화', '의전 동선'],
    },
    concert: {
      title: '라이브 사운드 · 조명 · 영상',
      copy: '아티스트와 관객 경험을 기준으로 무대 몰입도와 송출 품질을 함께 만듭니다.',
      items: ['라이브 믹싱', '무대 조명', '영상 연동', '리허설 운영'],
    },
    religion: {
      title: '음향 · 중계 · 조명 · 시공',
      copy: '공간의 울림과 예배 흐름을 고려해 안정적인 전달 시스템을 구성합니다.',
      items: ['공간 음향 튜닝', '화면 중계', '조명 구성', '필요 시 시공'],
    },
    streaming: {
      title: '촬영 · 중계 · 음향 · 화면 구성',
      copy: '현장감이 온라인에서도 유지되도록 촬영, 송출, 음향을 한 흐름으로 연결합니다.',
      items: ['멀티 카메라', '송출 시스템', '음향 믹싱', '화면 그래픽'],
    },
  };

  function renderPlanner() {
    const plan = plans[type.value] || plans.school;
    const extras = place.value === 'outdoor'
      ? ['야외 전원', '우천 대비']
      : place.value === 'hybrid'
        ? ['현장+온라인 송출', '화면 구성']
        : ['실내 튜닝'];
    const scaleCopy = scale.value === 'large'
      ? '대형 인원 기준으로 여유 장비와 운영 인력을 더합니다.'
      : scale.value === 'small'
        ? '소규모에 맞춰 꼭 필요한 범위만 제안합니다.'
        : '중규모 행사의 안정적인 운영 구성을 기준으로 합니다.';
    result.querySelector('h3').textContent = plan.title;
    result.querySelector('p').textContent = `${plan.copy} ${scaleCopy}`;
    result.querySelector('ul').replaceChildren(...[...plan.items, ...extras].map((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
    const query = new URLSearchParams({
      type: type.selectedOptions[0].textContent,
      scope: plan.title.replace(/\s/g, ''),
      scale: scale.selectedOptions[0].textContent,
      place: place.selectedOptions[0].textContent,
      note: `${plan.copy} ${scaleCopy}`,
    });
    mail.href = `contact.html?${query.toString()}#intake-title`;
  }

  [type, scale, place].forEach((field) => field.addEventListener('change', renderPlanner));
  renderPlanner();
}

initHeroShowreel();
initSectionSnap();
initIntakeForms();
prefillIntakeFromQuery();
initEventPlanner();
