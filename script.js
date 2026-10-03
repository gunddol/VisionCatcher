const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
const heroSlides = [...document.querySelectorAll('.hero-bg')];
const slideButtons = [...document.querySelectorAll('[data-slide]')];
const filterTabs = [...document.querySelectorAll('[data-filter]')];
const portfolioItems = [...document.querySelectorAll('[data-portfolio-gallery] .gallery-item')];
const isInnerPage = document.body.classList.contains('inner-page') || document.body.classList.contains('page-portfolio');
const menuLabel = document.querySelector('[data-menu-label]');
if (isInnerPage) {
  document.querySelectorAll('.page-hero-inner, main .section > .container').forEach((item) => item.setAttribute('data-reveal', ''));
}
const revealItems = [...document.querySelectorAll('[data-reveal]')];
const countItems = [...document.querySelectorAll('[data-count]')];
const hero = document.querySelector('.hero-renewal');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let currentSlide = 0;
let slideTimer;

function syncHeader() {
  header?.classList.toggle('is-scrolled', isInnerPage || window.scrollY > 10);
}

function openSlide(index) {
  currentSlide = index;
  heroSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  slideButtons.forEach((button, i) => button.classList.toggle('is-active', i === index));
}

function startSlideTimer() {
  window.clearInterval(slideTimer);
  if (reduceMotion.matches || heroSlides.length < 2 || document.hidden) return;
  slideTimer = window.setInterval(() => {
    openSlide((currentSlide + 1) % heroSlides.length);
  }, 5200);
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
    element.textContent = String(target);
    return;
  }
  const duration = 1200;
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = String(Math.round(target * eased));
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

slideButtons.forEach((button) => {
  button.addEventListener('click', () => {
    openSlide(Number(button.dataset.slide));
    startSlideTimer();
  });
});

if (heroSlides.length > 1) {
  startSlideTimer();
  hero?.addEventListener('pointerenter', () => window.clearInterval(slideTimer));
  hero?.addEventListener('pointerleave', startSlideTimer);
  document.addEventListener('visibilitychange', startSlideTimer);
  reduceMotion.addEventListener('change', startSlideTimer);
}

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

hero?.addEventListener('pointermove', (event) => {
  if (reduceMotion.matches) return;
  const x = (event.clientX / window.innerWidth - 0.5) * 2;
  const y = (event.clientY / window.innerHeight - 0.5) * 2;
  hero.style.setProperty('--mx', x.toFixed(3));
  hero.style.setProperty('--my', y.toFixed(3));
});

filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const filter = tab.dataset.filter;

    filterTabs.forEach((button) => {
      const isActive = button === tab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });

    portfolioItems.forEach((item) => {
      const shouldShow = filter === 'all' || item.dataset.category === filter;
      item.hidden = !shouldShow;
    });
  });
});
