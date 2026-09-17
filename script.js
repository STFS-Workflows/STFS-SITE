// ---------- mobile nav ----------
const navToggle = document.getElementById('navToggle');
const navMobile = document.getElementById('navMobile');

navToggle.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

navMobile.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMobile.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ---------- clean-URL anchor navigation ----------
(() => {
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Arriving from another page via a link like "/#uslugi": let the browser do
  // its native jump, then strip the hash so the address bar goes back to
  // just the clean page URL instead of showing the fragment forever.
  if (location.hash) {
    const stripHash = () => setTimeout(() => history.replaceState(null, '', location.pathname + location.search), 50);
    if (document.readyState === 'complete') stripHash();
    else window.addEventListener('load', stripHash);
  }

  // Same-page anchor links (nav, logo, CTAs): scroll smoothly without ever
  // touching the URL bar in the first place.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: noMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();

// ---------- scroll reveal ----------
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealEls = document.querySelectorAll('.reveal');

if (reduceMotion) {
  revealEls.forEach(el => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach(el => io.observe(el));
}

// ---------- hero particle network canvas ----------
(() => {
  const canvas = document.getElementById('network');
  if (!canvas) return;
  // Decorative particle animation fights the browser's native momentum
  // scroll on touch devices and burns CPU for no visual payoff there —
  // skip it entirely on touch, matching the standing mobile-performance rule.
  if (window.matchMedia('(hover: none)').matches) {
    canvas.style.display = 'none';
    return;
  }
  const ctx = canvas.getContext('2d');
  let width, height, dpr;
  let particles = [];
  let animId = null;

  const POINT_COUNT_BASE = 60;
  const LINK_DIST = 130;
  const ACCENT = '53, 224, 193';

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const area = width * height;
    const count = Math.max(24, Math.min(70, Math.round(area / 18000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }));
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.35;
          ctx.strokeStyle = `rgba(${ACCENT}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ACCENT}, 0.8)`;
      ctx.fill();
    }

    animId = requestAnimationFrame(step);
  }

  if (!reduceMotion) {
    resize();
    // Only run the (O(n^2) per frame) animation loop while the canvas is
    // actually visible — it was previously running forever in the
    // background even after scrolling past the hero, wasting CPU/GPU on
    // every frame for the rest of the page's lifetime (a real cause of
    // mobile jank/slowness).
    let isVisible = false;

    const io = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
      if (isVisible && animId === null) {
        step();
      } else if (!isVisible && animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    });
    io.observe(canvas);

    window.addEventListener('resize', () => {
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      resize();
      if (isVisible) step();
    });
  } else {
    resize();
    step();
    cancelAnimationFrame(animId);
  }
})();

// ---------- hero AI terminal demo ----------
(() => {
  const body = document.getElementById('termBody');
  if (!body) return;

  const script = [
    { who: 'user', text: 'Cześć, jakie usługi oferuje STFS?' },
    { who: 'ai', text: 'Marketing z AI, strony internetowe, automatyzacja Gmaila, rezerwacje, monitoring opinii i arkusze Google.' },
    { who: 'user', text: 'Ile trwa i kosztuje konsultacja?' },
    { who: 'ai', text: '30 minut, całkowicie za darmo, bez zobowiązań.' },
    { who: 'user', text: 'Jak umówić termin?' },
    { who: 'ai', text: 'Wybierz dzień i godzinę w panelu rezerwacji poniżej: potwierdzenie przyjdzie mailem.' },
  ];

  if (reduceMotion) {
    script.forEach((line) => {
      const el = document.createElement('div');
      el.className = `term-line ${line.who}`;
      el.textContent = line.text;
      body.appendChild(el);
    });
    return;
  }

  let i = 0;

  function typeLine() {
    const line = script[i % script.length];
    const el = document.createElement('div');
    el.className = `term-line ${line.who}`;
    const cursor = document.createElement('span');
    cursor.className = 'term-cursor';
    el.appendChild(cursor);
    body.appendChild(el);

    let c = 0;
    const typeInterval = setInterval(() => {
      c++;
      el.textContent = line.text.slice(0, c);
      el.appendChild(cursor);
      // Writing scrollTop right after a DOM mutation still forces a
      // synchronous layout flush (the browser needs fresh layout to clamp
      // the value) — defer it to the next frame so it rides the layout
      // the browser was going to do anyway instead of forcing an extra one.
      requestAnimationFrame(() => { body.scrollTop = 1e9; });
      if (c >= line.text.length) {
        clearInterval(typeInterval);
        cursor.remove();
        i++;
        if (i % script.length === 0) {
          setTimeout(() => {
            body.innerHTML = '';
            typeLine();
          }, 2400);
        } else {
          setTimeout(typeLine, 700);
        }
      }
    }, 22);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        typeLine();
        io.disconnect();
      }
    });
  }, { threshold: 0.3 });
  io.observe(body);
})();

// ---------- mobile card sliders (Jak to dziala, Usługi, Współpraca) ----------
(() => {
  const sliders = [
    { grid: document.querySelector('#jak-to-dziala .flow-slider'), key: 'jak-to-dziala' },
    { grid: document.querySelector('#uslugi .services-grid--6'), key: 'uslugi' },
    { grid: document.querySelector('#wspolpraca .collab-models'), key: 'wspolpraca' },
  ];

  sliders.forEach(({ grid, key }) => {
    if (!grid) return;
    const cards = Array.from(grid.children);
    const dotsBox = document.querySelector(`[data-slider-dots="${key}"]`);
    const navBox = document.querySelector(`[data-slider-nav="${key}"]`);
    if (!dotsBox || !navBox || cards.length < 2) return;

    // Horizontal slides must not wait for scroll-reveal — otherwise every
    // swipe shows a blank card until IntersectionObserver catches up.
    cards.forEach((card) => card.classList.add('in'));

    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slider-dot';
      dot.setAttribute('aria-label', `Pokaż ${i + 1} z ${cards.length}`);
      dot.addEventListener('click', () => {
        cards[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'start' });
      });
      dotsBox.appendChild(dot);
    });
    const dots = Array.from(dotsBox.children);

    function activeIndex() {
      let best = 0, bestDist = Infinity;
      cards.forEach((card, i) => {
        const dist = Math.abs(card.offsetLeft - grid.scrollLeft);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    }

    const prevBtn = navBox.querySelector('.slider-arrow--prev');
    const nextBtn = navBox.querySelector('.slider-arrow--next');

    function update() {
      const idx = activeIndex();
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      prevBtn.disabled = idx <= 0;
      nextBtn.disabled = idx >= cards.length - 1;
    }

    function goTo(idx) {
      const clamped = Math.max(0, Math.min(cards.length - 1, idx));
      cards[clamped].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'start' });
    }

    prevBtn.addEventListener('click', () => goTo(activeIndex() - 1));
    nextBtn.addEventListener('click', () => goTo(activeIndex() + 1));

    let ticking = false;
    grid.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });

    window.addEventListener('resize', update);
    update();
  });
})();

// ---------- chat widget ----------
(() => {
  const N8N_CHAT_WEBHOOK_URL = 'https://n8n.stfs.pl/webhook/stfs-chat';

  const widget = document.getElementById('chatWidget');
  if (!widget) return;

  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const iconOpen = document.getElementById('chatToggleIconOpen');
  const iconClose = document.getElementById('chatToggleIconClose');
  const body = document.getElementById('chatBody');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const sendBtn = form.querySelector('.chat-send');

  const isConfigured = !N8N_CHAT_WEBHOOK_URL.includes('YOUR-N8N-INSTANCE');

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    iconOpen.style.display = 'none';
    iconClose.style.display = '';
    setTimeout(() => input.focus(), 200);
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    iconOpen.style.display = '';
    iconClose.style.display = 'none';
  }

  toggle.addEventListener('click', () => {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  function addMessage(text, who) {
    const el = document.createElement('div');
    el.className = `chat-msg ${who}`;
    el.textContent = text;
    body.appendChild(el);
    requestAnimationFrame(() => { body.scrollTop = 1e9; });
    return el;
  }

  function typeMessage(el, text, onDone) {
    if (reduceMotion) {
      el.textContent = text;
      requestAnimationFrame(() => { body.scrollTop = 1e9; });
      if (onDone) onDone();
      return;
    }
    el.textContent = '';
    let i = 0;
    const CHARS_PER_TICK = 2;
    const interval = setInterval(() => {
      i += CHARS_PER_TICK;
      el.textContent = text.slice(0, i);
      requestAnimationFrame(() => { body.scrollTop = 1e9; });
      if (i >= text.length) {
        clearInterval(interval);
        if (onDone) onDone();
      }
    }, 15);
  }

  const MAX_QUESTION_LENGTH = 500;
  // Not a real secret (visible in page source) — just enough friction to stop
  // naive scanners/bots and casual reuse of the webhook from other sites.
  const WIDGET_CLIENT_KEY = 'stfs-site-widget-2026';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!question) return;

    addMessage(question, 'user');
    input.value = '';
    sendBtn.disabled = true;

    const pending = addMessage('Asystent pisze…', 'ai pending');

    if (!isConfigured) {
      pending.classList.remove('pending');
      typeMessage(
        pending,
        'Asystent AI startuje wkrótce. W międzyczasie napisz do nas na kontakt@stfs.pl albo umów darmową konsultację.',
        () => (sendBtn.disabled = false)
      );
      return;
    }

    try {
      const res = await fetch(N8N_CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Stfs-Client': WIDGET_CLIENT_KEY,
        },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      pending.classList.remove('pending');
      typeMessage(
        pending,
        data.answer || 'Nie udało się wygenerować odpowiedzi. Napisz do nas na kontakt@stfs.pl.',
        () => (sendBtn.disabled = false)
      );
    } catch (err) {
      pending.classList.remove('pending');
      typeMessage(
        pending,
        'Asystent jest chwilowo niedostępny. Napisz do nas na kontakt@stfs.pl.',
        () => (sendBtn.disabled = false)
      );
    }
  });
})();
