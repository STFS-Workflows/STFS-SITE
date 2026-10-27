(() => {
  const key = 'stfs-project-transition';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  // Native cross-document transitions retain the outgoing page while the
  // destination loads, avoiding a flash of the browser background.
  if ('CSSViewTransitionRule' in window) return;
  try {
    if (sessionStorage.getItem(key) === location.pathname && !motion.matches) {
      document.documentElement.classList.add('page-enter');
      sessionStorage.removeItem(key);
      window.addEventListener('load', () => setTimeout(() => document.documentElement.classList.remove('page-enter'), 700), { once: true });
    } else {
      sessionStorage.removeItem(key);
    }
  } catch { /* Navigation still works when storage is unavailable. */ }

  let leaving = false;
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || motion.matches || leaving) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !['/projekty', '/projekt'].includes(url.pathname) || url.href === location.href) return;
    event.preventDefault();
    leaving = true;
    try { sessionStorage.setItem(key, url.pathname); } catch { /* Continue with the exit only. */ }
    document.documentElement.style.setProperty('--transition-scroll', `${window.scrollY}px`);
    document.documentElement.classList.remove('page-enter');
    document.documentElement.classList.add('page-leave');
    setTimeout(() => location.assign(url.href), 360);
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      leaving = false;
      document.documentElement.classList.remove('page-leave', 'page-enter');
    }
  });
})();
