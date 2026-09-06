(function () {
  try {
    if (sessionStorage.getItem('autodocs.pageTransition')) {
      document.documentElement.classList.add('autodocs-page-transition-pending');
    }
  } catch (_) {
    /* ignore */
  }
})();
