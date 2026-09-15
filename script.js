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
    { who: 'ai', text: '30 minut, całkowicie za darmo — bez zobowiązań.' },
    { who: 'user', text: 'Jak umówić termin?' },
    { who: 'ai', text: 'Wybierz dzień i godzinę w panelu rezerwacji poniżej — potwierdzenie przyjdzie mailem.' },
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
      body.scrollTop = 1e9;
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

// ---------- workflow pipeline demo ----------
(() => {
  const flow = document.getElementById('flowDemo');
  const caption = document.getElementById('flowCaption');
  if (!flow || !caption) return;

  const nodes = Array.from(flow.querySelectorAll('.flow-node'));
  const lines = Array.from(flow.querySelectorAll('.flow-line'));
  const captions = [
    'Klient zostawia nową opinię — pozytywną lub negatywną.',
    'AI analizuje treść i ocenia sentyment opinii.',
    'AI przygotowuje gotową odpowiedź, dopasowaną do sytuacji.',
    'Zatwierdzasz odpowiedź jednym kliknięciem — albo ją edytujesz.',
    'Zaakceptowana odpowiedź trafia do klienta.',
  ];

  if (reduceMotion) return;

  let step = 0;

  function render() {
    nodes.forEach((n, idx) => n.classList.toggle('active', idx === step));
    lines.forEach((l, idx) => l.classList.toggle('filled', idx < step));
    caption.textContent = captions[step];
  }

  setInterval(() => {
    step = (step + 1) % nodes.length;
    render();
  }, 2200);
})();

// ---------- chat widget ----------
(() => {
  const N8N_CHAT_WEBHOOK_URL = 'https://stfsworkflow.app.n8n.cloud/webhook/stfs-chat';

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
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function typeMessage(el, text, onDone) {
    if (reduceMotion) {
      el.textContent = text;
      body.scrollTop = body.scrollHeight;
      if (onDone) onDone();
      return;
    }
    el.textContent = '';
    let i = 0;
    const CHARS_PER_TICK = 2;
    const interval = setInterval(() => {
      i += CHARS_PER_TICK;
      el.textContent = text.slice(0, i);
      body.scrollTop = body.scrollHeight;
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
        'Asystent AI startuje wkrótce — w międzyczasie napisz do nas na kontakt@stfs.pl albo umów darmową konsultację.',
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
