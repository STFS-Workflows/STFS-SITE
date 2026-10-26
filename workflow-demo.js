(() => {
  const demo = document.querySelector('[data-workflow-demo]');
  if (!demo) return;

  const steps = Array.from(demo.querySelectorAll('[data-demo-step]'));
  const panels = Array.from(demo.querySelectorAll('[data-demo-panel]'));
  const toggle = demo.querySelector('[data-demo-toggle]');
  const replay = demo.querySelector('[data-demo-replay]');
  const count = demo.querySelector('[data-demo-count]');
  const progress = demo.querySelector('[data-demo-progress]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let playing = !reducedMotion.matches;
  let visible = false;
  let timer;

  function render() {
    steps.forEach((step, position) => {
      if (position === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      step.classList.toggle('is-complete', position < index);
      panels[position].hidden = position !== index;
    });
    const number = String(index + 1);
    count.textContent = number + ' / 5';
    progress.textContent = 'ETAP ' + number + ' / 5';
    toggle.textContent = playing ? 'Wstrzymaj Ⅱ' : 'Odtwórz ▶';
    toggle.setAttribute('aria-label', playing ? 'Wstrzymaj animację' : 'Odtwórz animację');
  }

  function schedule() {
    clearTimeout(timer);
    if (!playing || !visible || document.hidden) return;
    timer = setTimeout(() => {
      if (index < steps.length - 1) index += 1;
      if (index === steps.length - 1) playing = false;
      render();
      schedule();
    }, 4000);
  }

  toggle.addEventListener('click', () => {
    if (!playing && index === steps.length - 1) index = 0;
    playing = !playing;
    render();
    schedule();
  });

  replay.addEventListener('click', () => {
    index = 0;
    playing = true;
    render();
    schedule();
  });

  steps.forEach((step, position) => {
    step.addEventListener('click', () => {
      index = position;
      playing = false;
      render();
      schedule();
    });
  });

  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) {
      playing = false;
      render();
      schedule();
    }
  });

  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      schedule();
    }, { threshold: 0.15 });
    observer.observe(demo);
  } else {
    visible = true;
  }

  render();
  schedule();
})();
