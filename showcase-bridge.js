// Only changes the local portfolio preview, never the original client files.
(() => {
  if (window.parent === window) return;
  const style = document.createElement('style');
  style.textContent = 'html{overflow:hidden!important;scroll-behavior:auto!important}body{min-height:0!important}.hero{height:900px!important;min-height:900px!important}.garden-banner{height:720px!important}.rating-card{bottom:54px!important}.reveal{opacity:1!important;transform:none!important;transition:none!important}.stfs-stage{transition:opacity .42s ease-out!important}@media(prefers-reduced-motion:reduce){.stfs-stage{transition:none!important}}';
  document.head.append(style);
  let queued = false, stages = [];
  const observed = new WeakSet(), readiness = new Map();
  const signal = (key, ready) => {
    if (readiness.get(key) === ready) return;
    readiness.set(key, ready);
    parent.postMessage({ type: 'stfs-stage-ready', key, ready }, '*');
  };
  const report = () => {
    queued = false;
    const sections = {};
    stages = [...document.querySelectorAll('main > section')].map(section => {
      const key = section.id || section.classList[0];
      sections[key] = { y: section.getBoundingClientRect().top + scrollY, height: section.offsetHeight };
      section.classList.add('stfs-stage');
      if (!observed.has(section)) {
        observed.add(section);
        section.addEventListener('transitionend', event => {
          if (event.propertyName === 'opacity' && Number(section.style.opacity) >= .99) signal(key, true);
        });
      }
      return { node: section, key, y: sections[key].y };
    });
    parent.postMessage({ type: 'stfs-showcase-layout', height: Math.ceil(document.body.getBoundingClientRect().height), sections }, '*');
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(report); } };
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'stfs-showcase-scroll') return;
    const { frameTop, scale, viewportHeight } = event.data;
    if (![frameTop, scale, viewportHeight].every(Number.isFinite) || scale <= 0 || scale > 2 || viewportHeight <= 0) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const distance = Math.min(320, viewportHeight * .36);
    for (const stage of stages) {
      const top = frameTop + stage.y * scale;
      const progress = reduced ? 1 : Math.max(0, Math.min(1, (viewportHeight - top) / distance));
      const opacity = String(Math.round(progress * 100) / 100);
      if (stage.node.style.opacity !== opacity) stage.node.style.setProperty('opacity', opacity, 'important');
      if (progress < .99) signal(stage.key, false);
      else if (readiness.get(stage.key) !== true && (reduced || Number(getComputedStyle(stage.node).opacity) >= .99)) signal(stage.key, true);
    }
  });
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
