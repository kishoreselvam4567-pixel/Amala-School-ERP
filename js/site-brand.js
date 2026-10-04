(function () {
  const CANDIDATE_PATHS = [
    'image/school logo.jpg',
    '/image/school logo.jpg',
    '../image/school logo.jpg',
    '../../image/school logo.jpg',
    'public/image/school logo.jpg',
    '/public/image/school logo.jpg',
    'image/school-logo.jpg',
    '/image/school-logo.jpg',
    '../image/school-logo.jpg',
    'image/logo.jpg',
    '/image/logo.jpg'
  ];

  const PRIMARY_PATH = 'image/school logo.jpg';

  if (typeof window !== 'undefined') {
    window.SCHOOL_LOGO_DATA_URL = PRIMARY_PATH;
    window.SCHOOL_LOGO_URL = PRIMARY_PATH;
    window.getSchoolLogoUrl = function () {
      const el = document.querySelector('[data-school-logo], .erp-logo img, .brand-logo img');
      return (el && el.src ? el.src : PRIMARY_PATH);
    };
  }

  function handleLogoError(img) {
    if (!img) return;
    if (typeof img._tryIndex === 'undefined') {
      img._tryIndex = 0;
    }
    img._tryIndex++;
    if (img._tryIndex < CANDIDATE_PATHS.length) {
      img.src = CANDIDATE_PATHS[img._tryIndex];
    }
  }

  function applyLogo() {
    const logoEls = document.querySelectorAll('[data-school-logo], .erp-logo img, .brand-logo img');
    if (!logoEls.length) return;
    logoEls.forEach(function (el) {
      el.addEventListener('error', function () {
        handleLogoError(this);
      });
      if (!el.getAttribute('alt')) {
        el.setAttribute('alt', 'Amala Higher Secondary School Logo');
      }
      if (!el.src || el.src.endsWith('/')) {
        el.src = PRIMARY_PATH;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLogo);
  } else {
    applyLogo();
  }
})();
