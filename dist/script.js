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
const form = document.querySelector('#reservation-form');
const feedback = document.querySelector('#form-feedback');
const dateInput = form?.querySelector('input[type="date"]');
if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.checkValidity()) return form.reportValidity();
  feedback.textContent = 'Dziękujemy — potwierdzimy dostępność wybranego terminu mailowo.';
  form.reset();
});
