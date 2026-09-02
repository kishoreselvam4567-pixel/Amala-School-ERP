(function () {
  const LOGO_PATH = '/image/school logo.jpg';

  function applyLogo() {
    const logoEls = document.querySelectorAll('[data-school-logo]');
    if (!logoEls.length) return;
    logoEls.forEach((el) => {
      el.src = LOGO_PATH;
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
