const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
const heroSlides = [...document.querySelectorAll('.hero-bg')];
const slideButtons = [...document.querySelectorAll('[data-slide]')];
const filterTabs = [...document.querySelectorAll('[data-filter]')];
const portfolioItems = [...document.querySelectorAll('[data-portfolio-gallery] .gallery-item')];
let currentSlide = 0;
let slideTimer;

function syncHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 10);
}

function openSlide(index) {
  currentSlide = index;
  heroSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  slideButtons.forEach((button, i) => button.classList.toggle('is-active', i === index));
}

function startSlideTimer() {
  window.clearInterval(slideTimer);
  slideTimer = window.setInterval(() => {
    openSlide((currentSlide + 1) % heroSlides.length);
  }, 5200);
}

window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();

menuButton?.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

slideButtons.forEach((button) => {
  button.addEventListener('click', () => {
    openSlide(Number(button.dataset.slide));
    startSlideTimer();
  });
});

if (heroSlides.length > 1) startSlideTimer();

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
