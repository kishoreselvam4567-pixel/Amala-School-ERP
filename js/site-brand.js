(function () {
  const LOGO_PATH = '/image/school logo.jpg';

  if (typeof window !== 'undefined') {
    window.SCHOOL_LOGO_DATA_URL = LOGO_PATH;
    window.SCHOOL_LOGO_URL = LOGO_PATH;
    window.getSchoolLogoUrl = function () {
      return (document.querySelector('[data-school-logo]') ? document.querySelector('[data-school-logo]').src : LOGO_PATH);
    };
  }

  function applyLogo() {
    const logoEls = document.querySelectorAll('[data-school-logo]');
    if (!logoEls.length) return;
    logoEls.forEach(function (el) {
      if (!el.src || el.src.indexOf('school%20logo.jpg') === -1) {
        el.src = LOGO_PATH;
      }
      if (!el.getAttribute('alt')) {
        el.setAttribute('alt', 'Amala Higher Secondary School Logo');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLogo);
  } else {
    applyLogo();
  }
})();
