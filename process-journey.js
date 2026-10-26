(() => {
  const line = document.querySelector('.process-line');
  if (!line || !('requestAnimationFrame' in window)) return;
  const steps = [...line.querySelectorAll('.process-step')];
  if (!steps.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = 0;
  const update = () => {
    scheduled = 0;
    if (reduced.matches) {
      line.classList.remove('process-animated');
      steps.forEach(step => step.classList.remove('is-active', 'is-complete'));
      line.style.removeProperty('--process-progress');
      return;
    }
    const bounds = line.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight * .82 - bounds.top) / (innerHeight * .5 + bounds.height)));
    const active = Math.min(steps.length - 1, Math.floor(progress * steps.length));
    line.classList.add('process-animated');
    line.style.setProperty('--process-progress', String(progress));
    steps.forEach((step, index) => {
      step.classList.toggle('is-active', index === active);
      step.classList.toggle('is-complete', index < active);
    });
  };
  const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  reduced.addEventListener?.('change', schedule);
  schedule();
})();
