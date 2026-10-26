// Only changes the local portfolio preview, never the original client files.
(() => {
  if (window.parent === window) return;
  const style = document.createElement('style');
  style.textContent = 'html{overflow:hidden!important;scroll-behavior:auto!important}body{min-height:0!important}.hero{height:900px!important;min-height:900px!important}.garden-banner{height:720px!important}.rating-card{bottom:54px!important}.reveal{opacity:1!important;transform:none!important;transition:none!important}';
  document.head.append(style);
  let queued = false;
  const report = () => {
    queued = false;
    const sections = {};
    document.querySelectorAll('main > section').forEach(section => {
      const key = section.id || section.classList[0];
      sections[key] = { y: section.getBoundingClientRect().top + scrollY, height: section.offsetHeight };
    });
    parent.postMessage({ type: 'stfs-showcase-layout', height: Math.ceil(document.body.getBoundingClientRect().height), sections }, '*');
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(report); } };
  const normalizeNumbers = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!/^[\d\s/]+$/.test(node.nodeValue)) continue;
      const clean = node.nodeValue.replace(/\b0([1-9])\b/g, '$1');
      if (clean !== node.nodeValue) node.nodeValue = clean;
    }
  };
  new ResizeObserver(schedule).observe(document.body);
  new MutationObserver(normalizeNumbers).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.querySelectorAll('img').forEach(img => { img.loading = 'eager'; img.addEventListener('load', schedule); });
  document.fonts?.ready.then(schedule);
  window.addEventListener('load', schedule);
  normalizeNumbers();schedule();
})();
