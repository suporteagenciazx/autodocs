(function () {
  try {
    if (localStorage.getItem('autodocs.navdrawer.collapsed') === '1') {
      document.documentElement.classList.add('navdrawer-collapsed');
    }
    if (localStorage.getItem('autodocs.theme.mode') === 'dark') {
      document.documentElement.classList.add('theme-dark');
    }
  } catch (_) {
    /* ignore */
  }
})();
