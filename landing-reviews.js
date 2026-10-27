(() => {
  const section = document.getElementById('opinie');
  if (!section) return;
  const status = section.querySelector('[data-reviews-status]');
  const grid = section.querySelector('[data-reviews-grid]');
  const demo = section.querySelector('[data-reviews-demo]');
  const sourceLink = section.querySelector('[data-reviews-source]');

  function safeGoogleUrl(value) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      const valid = (['google.com', 'www.google.com', 'google.pl', 'www.google.pl'].includes(host) && url.pathname.startsWith('/maps'))
        || ['maps.google.com', 'maps.google.pl'].includes(host)
        || (host === 'maps.app.goo.gl' && url.pathname.length > 1)
        || (host === 'goo.gl' && url.pathname.startsWith('/maps/'))
        || (host === 'share.google' && url.pathname.length > 1);
      return valid && url.protocol === 'https:' && !url.username && !url.password && !url.port ? url.href : null;
    } catch { return null; }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function card(review, profileUrl) {
    const article = element('article', 'landing-reviews__card');
    const author = typeof review.author === 'string' && review.author.trim() ? review.author : 'Użytkownik Google';
    article.append(element('h3', 'landing-reviews__author', author));
    if (typeof review.rating === 'number' && Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5) {
      article.append(element('p', 'landing-reviews__rating', `Ocena: ${review.rating} / 5`));
    }
    if (typeof review.text === 'string' && review.text.trim()) article.append(element('p', 'landing-reviews__text', review.text));
    if (typeof review.date === 'string' && review.date.trim()) article.append(element('p', 'landing-reviews__date', review.date));
    const url = safeGoogleUrl(review.url) || profileUrl;
    if (url) {
      const link = element('a', 'landing-reviews__link', 'Zobacz w Google ↗');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      article.append(link);
    }
    return article;
  }

  async function loadReviews() {
    status.textContent = 'Wczytujemy opinie…';
    try {
      const response = await fetch('/api/reviews', { signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10000) : undefined });
      if (!response.ok) throw new Error('Reviews request failed');
      const data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid reviews response');
      demo.hidden = !data.demo;
      const profileUrl = safeGoogleUrl(data.profileUrl);
      if (profileUrl) {
        sourceLink.href = profileUrl;
        sourceLink.hidden = false;
      }
      if (data.status === 'unconfigured') {
        status.textContent = 'Opinie klientów pojawią się tutaj wkrótce.';
        return;
      }
      const reviews = Array.isArray(data.reviews) ? data.reviews.filter(review => review && typeof review === 'object' && !Array.isArray(review)) : [];
      if (data.status === 'stale') {
        status.textContent = reviews.length ? 'Wyświetlamy wcześniej pobrane opinie. Aktualizacja jest chwilowo niedostępna.' : 'Opinie są chwilowo niedostępne. Spróbuj ponownie później.';
      } else if (data.status !== 'ok' || !Array.isArray(data.reviews)) {
        status.textContent = 'Nie udało się pobrać opinii. Spróbuj ponownie później.';
        return;
      } else {
        status.textContent = reviews.length ? '' : 'Brak opinii do wyświetlenia.';
      }
      grid.replaceChildren(...reviews.slice(0, 3).map(review => card(review, profileUrl)));
    } catch {
      status.textContent = 'Nie udało się pobrać opinii. Spróbuj ponownie później.';
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }
  loadReviews();
})();
