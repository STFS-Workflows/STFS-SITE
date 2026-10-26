(() => {
  const line = document.querySelector('.process-line');
  if (!line || !('requestAnimationFrame' in window)) return;
  const steps = [...line.querySelectorAll('.process-step')];
  if (!steps.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const descriptions = [
    'Poznajemy Twoje potrzeby i ustalamy wspólny cel.',
    'Analizujemy sytuację i wybieramy najlepszy kierunek.',
    'Zmieniamy ustalenia w działającą stronę lub automatyzację.',
    'Mierzymy efekty i rozwijamy rozwiązanie razem z Tobą.'
  ];
  const current = document.createElement('div');
  current.className = 'process-current';
  current.setAttribute('aria-hidden', 'true');
  const indicator = document.createElement('span');
  indicator.className = 'process-current-dot';
  const counter = document.createElement('span');
  counter.className = 'process-current-count';
  const copy = document.createElement('span');
  copy.className = 'process-current-copy';
  current.append(indicator, counter, copy);
  line.after(current);
  let scheduled = 0, lastActive = -1;
  const update = () => {
    scheduled = 0;
    if (reduced.matches) {
      line.classList.remove('process-animated');
      steps.forEach(step => step.classList.remove('is-active', 'is-complete'));
      line.style.removeProperty('--process-progress');
      current.hidden = true;
      lastActive = -1;
      return;
    }
    const bounds = line.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight * .82 - bounds.top) / (innerHeight * .5 + bounds.height)));
    const active = Math.min(steps.length - 1, Math.floor(progress * steps.length));
    line.classList.add('process-animated');
    current.hidden = false;
    line.style.setProperty('--process-progress', String(progress));
    steps.forEach((step, index) => {
      step.classList.toggle('is-active', index === active);
      step.classList.toggle('is-complete', index < active);
    });
    if (active !== lastActive) {
      lastActive = active;
      counter.textContent = `ETAP ${active + 1} / ${steps.length}`;
      copy.textContent = descriptions[active] || steps[active].querySelector('h3')?.textContent || '';
      copy.classList.remove('is-changing');
      void copy.offsetWidth;
      copy.classList.add('is-changing');
    }
  };
  const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  reduced.addEventListener?.('change', schedule);
  schedule();
})();
