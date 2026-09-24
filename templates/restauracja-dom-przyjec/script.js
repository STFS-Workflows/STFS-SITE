// Nawigacja mobilna: działa bez zależności i nie wpływa na indeksowalność linków.
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
}));

// Formularze są gotowe jako interfejs. Funkcja sendLead() to jedyne miejsce,
// w którym agent wdrożeniowy powinien podłączyć CRM, e-mail lub system rezerwacji.
const sendLead = async (form) => {
  // Przykład: return fetch('/api/rezerwacje', { method: 'POST', body: new FormData(form) });
  // Nie zapisuj tu kluczy API — trzymaj je po stronie serwera / w automatyzacji.
  return Promise.resolve();
};

document.querySelectorAll('form').forEach((form) => {
  const date = form.querySelector('input[type="date"]');
  const feedback = form.querySelector('.form-feedback');
  if (date) date.min = new Date().toISOString().split('T')[0];

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await sendLead(form);
      feedback.textContent = 'Dziękujemy. Potwierdzimy dostępność i wrócimy do Ciebie mailowo.';
      form.reset();
    } catch {
      feedback.textContent = 'Nie udało się wysłać zapytania. Spróbuj ponownie lub skontaktuj się telefonicznie.';
    } finally {
      button.disabled = false;
    }
  });
});
