// Buduje przewodnik z plików workflow: _PRZEWODNIK/KATALOG.md oraz _PRZEWODNIK/mapa-workflowow.html
// Uruchom: node zbuduj-przewodnik.js   (opcjonalnie: --fragment <plik> = wersja bez <!doctype>, do publikacji)
const fs = require('fs');
const path = require('path');
const OPISY = require('./opisy');

const DIR = __dirname;
const OUT = path.join(DIR, '_PRZEWODNIK');
fs.mkdirSync(OUT, { recursive: true });

let indeks = [];
try { indeks = JSON.parse(fs.readFileSync(path.join(DIR, '_indeks.json'), 'utf8')); } catch (e) { /* brak indeksu */ }
const catOf = (f) => (indeks.find((x) => x.fileName === f) || {}).category || 'stfs';

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort((a, b) => {
  const s = (f) => (catOf(f) === 'stfs' ? '0' : '1') + f;
  return s(a).localeCompare(s(b));
});

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function cronText(c) {
  const map = {
    '0 9 * * *': 'codziennie 9:00', '0 9 * * 1-5': 'dni robocze 9:00', '0 8 * * 1': 'poniedziałki 8:00',
    '0 7 * * *': 'codziennie 7:00', '0 */4 * * *': 'co 4 godziny', '0 6 * * *': 'codziennie 6:00',
    '0 5 * * *': 'codziennie 5:00', '0 7 1 * *': '1. dnia miesiąca 7:00', '0 * * * *': 'co godzinę',
    '0 18 * * *': 'codziennie 18:00', '0 7 * * 1': 'poniedziałki 7:00', '*/5 * * * *': 'co 5 minut', '0 3 * * *': 'codziennie 3:00',
    '0 10 * * 4': 'czwartki 10:00', '*/15 * * * *': 'co 15 minut', '0 8-18/2 * * 1-5': 'dni robocze co 2 h (8–18)', '30 8 * * 1': 'poniedziałki 8:30',
  };
  return map[c] || c;
}

function kindOf(n) {
  const t = n.type.split('.').pop();
  if (/Trigger$|^webhook$/.test(t)) return 'trigger';
  if (n.name === 'Walidacja danych' || n.name === 'Konfiguracja') return 'setup';
  if (t === 'code' && /getWorkflowStaticData/.test(n.parameters.jsCode) && !/limity/i.test(n.name)) return 'memory';
  if (t === 'code' && /limity/i.test(n.name)) return 'guard';
  if (t === 'code') return 'code';
  if (t === 'httpRequest' || t === 'googleSheets' || t === 'gmail' || t === 'rssFeedRead') return 'http';
  if (t === 'wait' && n.parameters.resume === 'timeInterval') return 'delay';
  if (t === 'slack' || t === 'emailSend' || t === 'telegram') return 'notify';
  if (t === 'wait') return 'human';
  if (t === 'respondToWebhook') return 'respond';
  if (t === 'noOp') return 'end';
  if (t === 'splitOut') return 'split';
  if (t === 'set') return 'code';
  return 'code';
}
const SUB = {
  slack: 'Slack', emailSend: 'e-mail', telegram: 'Telegram', googleSheets: 'Google Sheets', splitOut: 'lista → pozycje',
  respondToWebhook: 'odpowiedź HTTP', wait: 'formularz akceptacji', noOp: 'koniec', gmail: 'Gmail · szkic', rssFeedRead: 'RSS',
};

function analyse(f) {
  const wf = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const nodes = wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote');
  const byName = new Map(nodes.map((n) => [n.name, n]));
  const next = (name, out = 0) => ((wf.connections[name]?.main || [])[out] || []).map((c) => c.node);
  const trig = nodes.find((n) => kindOf(n) === 'trigger');

  function seq(name) {
    const res = [];
    let cur = name;
    while (cur) {
      const n = byName.get(cur);
      const m = /^AI: prompt \((.+)\)$/.exec(n.name);
      if (m) {
        res.push({ k: 'ai', t: 'AI: ' + m[1], s: /anthropic/.test(JSON.stringify(wf)) && f.startsWith('site') ? 'Claude Haiku' : 'prompt → model → wynik' });
        cur = next(`AI: wynik (${m[1]})`)[0];
        continue;
      }
      if (n.type === 'n8n-nodes-base.if') {
        res.push({ k: 'if', t: n.name, yes: next(cur, 0)[0] ? seq(next(cur, 0)[0]) : [], no: next(cur, 1)[0] ? seq(next(cur, 1)[0]) : [] });
        return res;
      }
      const t = n.type.split('.').pop();
      let s = SUB[t] || '';
      if (t === 'wait' && n.parameters.resume === 'timeInterval') s = 'wznawia się sam';
      if (t === 'httpRequest') s = n.parameters.method + (/openai|anthropic|googleapis|twilio|supabase|facebook/.test(n.parameters.url) ? ' · ' + (n.parameters.url.match(/(openai|anthropic|googleapis|supabase|facebook)/) || [])[1] : '');
      if (kindOf(n) === 'memory') s = 'pamięć workflow';
      if (n.name === 'Konfiguracja') s = 'adresy, progi, odbiorcy';
      if (n.name === 'Walidacja danych') s = 'wymagane pola';
      res.push({ k: kindOf(n), t: n.name, s });
      cur = next(cur)[0];
    }
    return res;
  }

  let trigger = { t: trig.name, s: '' };
  const tt = trig.type.split('.').pop();
  if (tt === 'webhook') trigger.s = `POST /webhook/${trig.parameters.path}` + (trig.parameters.authentication === 'headerAuth' ? ' · Header Auth' : '');
  else if (tt === 'scheduleTrigger') trigger.s = cronText(trig.parameters.rule.interval[0].expression);
  else if (tt === 'telegramTrigger') trigger.s = 'wiadomość Telegram';
  else if (tt === 'manualTrigger') trigger.s = 'uruchamiany ręcznie';
  else if (tt === 'errorTrigger') trigger.s = 'błąd w innym workflow';
  else if (tt === 'gmailTrigger') trigger.s = 'nowy e-mail (co minutę)';
  const triggerKind = { webhook: 'Webhook', scheduleTrigger: 'Harmonogram', telegramTrigger: 'Telegram', manualTrigger: 'Ręcznie', errorTrigger: 'Błąd', gmailTrigger: 'Gmail' }[tt];

  const flow = seq(next(trig.name)[0]);
  flow.unshift({ k: 'trigger', t: trig.name, s: trigger.s });

  const walid = byName.get('Walidacja danych');
  const reqMatch = walid && /const required = (\[.*?\]);/.exec(walid.parameters.jsCode);
  const wymagane = reqMatch ? JSON.parse(reqMatch[1]) : [];
  const conf = byName.get('Konfiguracja');
  const konfiguracja = conf ? conf.parameters.assignments.assignments.map((a) => ({ k: a.name, v: String(a.value) })) : [];
  const note = wf.nodes.find((n) => n.type === 'n8n-nodes-base.stickyNote').parameters.content;
  const creds = (note.split('## Credentials do utworzenia')[1] || '').split('##')[0].trim().split('\n').map((l) => l.replace(/^- /, '').trim()).filter((l) => l && l !== 'brak');

  const flat = JSON.stringify(flow);
  const fm = /ormat[^`]*`([^`]+)`/.exec(note);
  const formatZrodla = tt !== 'webhook' && fm ? fm[1] : '';
  const przyklad = przykladWejscia(f, wymagane, tt);
  const opis = OPISY.workflowy[f] || { cel: '', naprawiono: [] };
  return {
    f, nr: (f.match(/^(\d\d)-/) || [])[1] || '★', name: wf.name.replace(/^STFS — /, ''), cat: catOf(f), triggerKind, trigger, flow,
    wymagane, konfiguracja, creds, cel: opis.cel, naprawiono: opis.naprawiono, nowy: Boolean(opis.nowy),
    ikona: { webhook: 'webhook', scheduleTrigger: 'clock', telegramTrigger: 'send', manualTrigger: 'hand', errorTrigger: 'alert', gmailTrigger: 'mail' }[tt],
    formatZrodla, przyklad, wymaga: WYMAGA[f] || '',
    maAI: /"k":"ai"/.test(flat), maCzlowieka: /"k":"human"/.test(flat), liczbaWezlow: nodes.length,
  };
}

const PROBKI = {
  name: 'Jan Kowalski', email: 'jan@firma.pl', message: 'Szukamy chatbota na stronę, budżet ok. 15 tys. zł, start w listopadzie.',
  subject: 'Nie mogę pobrać faktury', start: '2026-10-01T14:00:00+02:00', orderId: 'ZAM-1042',
  fileUrl: 'https://pliki.firma.pl/skany/faktura-0931.jpg', cvText: 'Specjalista ds. marketingu, 4 lata doświadczenia, Google Ads, angielski C1…',
  fullName: 'Anna Nowak', startDate: '2026-10-15', role: 'Specjalistka ds. marketingu', question: 'Ile dni urlopu mi przysługuje?',
  recordingUrl: 'https://nagrania.firma.pl/call-88.mp3', callId: 'CALL-88', brief: 'Strona + chatbot dla gabinetu fizjoterapii',
  reviewId: 'R-311', text: 'Szybka dostawa, produkt zgodny z opisem. Polecam!', productId: 'P-204',
  phone: '+48 600 100 200', date: '2027-06-12', guests: 90, type: 'wesele',
};
const NADPISANE = {
  '30-ecommerce-opisy-produktow.json': { productId: 'P-204', name: 'Kubek ceramiczny 350 ml', category: 'Kuchnia', attributes: { kolor: 'grafitowy', material: 'kamionka' } },
  '29-ecommerce-odpowiedzi-na-opinie.json': { reviewId: 'R-311', text: 'Szybka dostawa, produkt zgodny z opisem. Polecam!', rating: 5 },
  'monitoring-opinii-odpowiedzi.json': { autor: 'Jan K.', ocena: 2, tresc: 'Zamówienie przyszło 5 dni później niż obiecano.' },
  'site-chatbot-odpowiedzi-na-zywo.json': { question: 'Jakie usługi oferujecie?' },
  '34-obsluga-weryfikacja-sms.json': { action: 'start', phone: '+48600100200' },
  '33-sprzedaz-zapytanie-o-termin.json': { name: 'Aleksandra Nowak', phone: '+48 600 100 200', email: 'ola@example.pl', date: '2027-06-12', guests: 90, type: 'wesele', message: 'Czy jest możliwość przyjęcia w ogrodzie?' },
  '36-marketing-prosba-o-opinie.json': { orderId: 'ZAM-1042', email: 'jan@firma.pl', name: 'Jan Kowalski' },
  '41-finanse-weryfikacja-kontrahenta.json': { nip: '5260250274', bankAccount: '12 1010 1010 0000 0000 0000 0000', invoiceNumber: 'FV/2026/09/118' },
  '42-finanse-przeliczanie-walut-nbp.json': { amount: 1250.5, currency: 'EUR', invoiceDate: '2026-09-21' },
  '45-obsluga-analiza-ankiet-nps.json': { score: 4, email: 'jan@firma.pl', name: 'Jan', comment: 'Długo czekałem na odpowiedź z serwisu.' },
  '46-ecommerce-zwroty-i-reklamacje.json': { orderId: 'ZAM-1042', email: 'jan@firma.pl', typ: 'zwrot', reason: 'Zły rozmiar' },
  '47-hr-wnioski-urlopowe.json': { employeeName: 'Anna Nowak', email: 'anna@firma.pl', managerEmail: 'szef@firma.pl', from: '2026-12-21', to: '2026-12-31', type: 'wypoczynkowy' },
  '48-ai-notatki-ze-spotkan.json': { recordingUrl: 'https://nagrania.firma.pl/spotkanie-0923.m4a', title: 'Planowanie Q4', participants: 'anna@firma.pl,jan@firma.pl' },
  '24-ai-agent-glosowy.json': { CallSid: 'CA1f…', SpeechResult: 'Do której jesteście otwarci w sobotę?' },
};
function przykladWejscia(f, wymagane, tt) {
  if (NADPISANE[f]) return JSON.stringify(NADPISANE[f], null, 2);
  if (tt !== 'webhook' || !wymagane.length) return '';
  const o = {};
  for (const k of wymagane) o[k] = PROBKI[k] ?? '…';
  return JSON.stringify(o, null, 2);
}
const WYMAGA = {
  '07-marketing-raportowanie-kampanii.json': 'Konta reklamowe Meta i Google Ads, developer-token Google Ads.',
  '10-obsluga-bot-faq.json': 'Bot Telegram (token z @BotFather).',
  '14-operacje-ocr-dokumentow.json': 'Klucz Google Cloud Vision.',
  '24-ai-agent-glosowy.json': 'Numer Twilio, TWILIO_AUTH_TOKEN i NODE_FUNCTION_ALLOW_BUILTIN=crypto w n8n.',
  '25-ai-rag-chatbot.json': 'Supabase z pgvector, zaindeksowane dokumenty (funkcja match_documents).',
  '26-ai-analiza-rozmow.json': 'Dostęp do nagrań rozmów, zgoda rozmówców na nagrywanie.',
  '27-ai-generowanie-ofert.json': 'Serwis PDF oraz n8n z węzłem Wait w trybie formularza.',
  '29-ecommerce-odpowiedzi-na-opinie.json': 'n8n z węzłem Wait w trybie formularza, WEBHOOK_URL ustawiony.',
  'monitoring-opinii-odpowiedzi.json': 'Google Business Profile (OAuth2) klienta, n8n z formularzem Wait.',
  '33-sprzedaz-zapytanie-o-termin.json': 'Bramka SMS (SMSAPI / Twilio), CRM.',
  '34-obsluga-weryfikacja-sms.json': 'Bramka SMS, OTP_SEKRET i NODE_FUNCTION_ALLOW_BUILTIN=crypto w n8n, backend z CAPTCHA przed webhookiem.',
  '35-operacje-przypomnienia-o-wizytach.json': 'System rezerwacji z API, bramka SMS.',
  '36-marketing-prosba-o-opinie.json': 'Link do wystawiania opinii w Google (Profil Firmy), API sklepu.',
  '37-obsluga-skrzynka-gmail.json': 'Konto Google Workspace/Gmail (OAuth2).',
  '38-marketing-raport-ruchu-strony.json': 'GA4 i Search Console z dostępem do odczytu (Google OAuth2).',
  '40-system-kopia-workflowow.json': 'Klucz API n8n, prywatne repo GitHub, token z prawem zapisu do tego repo.',
  '41-finanse-weryfikacja-kontrahenta.json': 'Nic poza n8n – API białej listy MF jest publiczne (limity dzienne).',
  '42-finanse-przeliczanie-walut-nbp.json': 'Nic poza n8n – API NBP jest publiczne.',
  '43-marketing-newsletter-z-bloga.json': 'Blog z kanałem RSS, system mailingowy z API (Mailchimp / Brevo / MailerLite).',
  '44-marketing-publikacja-social-media.json': 'Arkusz Google z kalendarzem, token strony Facebook z pages_manage_posts (aplikacja Meta).',
  '45-obsluga-analiza-ankiet-nps.json': 'Narzędzie ankiet z webhookiem (Tally / Typeform), helpdesk lub CRM.',
  '46-ecommerce-zwroty-i-reklamacje.json': 'API sklepu z datą dostawy zamówienia.',
  '47-hr-wnioski-urlopowe.json': 'n8n z węzłem Wait w trybie formularza, WEBHOOK_URL, kalendarz zespołu z API.',
  '48-ai-notatki-ze-spotkan.json': 'Nagrania spotkań (zgoda uczestników), narzędzie zadań z API (Trello / Asana / ClickUp).',
  '49-finanse-kontrola-ksef.json': 'System fakturowy zintegrowany z KSeF, udostępniający status wysyłki przez API.',
  '50-system-raport-zdrowia-automatyzacji.json': 'Klucz API n8n.',
};
const data = files.map(analyse);

/* ------------------------- KATALOG.md ------------------------- */
function flowText(flow, indent = '') {
  const lines = [];
  for (const s of flow) {
    if (s.k === 'if') {
      lines.push(`${indent}- **${s.t}**`);
      lines.push(`${indent}  - tak →`);
      lines.push(...flowText(s.yes, indent + '    '));
      lines.push(`${indent}  - nie →`);
      lines.push(...flowText(s.no, indent + '    '));
    } else lines.push(`${indent}- ${s.t}${s.s ? ` _(${s.s})_` : ''}`);
  }
  return lines;
}
let md = `# Katalog workflowów – opis każdego\n\n_Plik generowany automatycznie (\`node zbuduj-przewodnik.js\`) – nie edytuj ręcznie. Opisy zmieniasz w \`opisy.js\`._\n\n`;
let lastCat = '';
for (const d of data) {
  if (d.cat !== lastCat) { md += `\n## ${OPISY.kategorie[d.cat]}\n\n`; lastCat = d.cat; }
  md += `### ${d.nr === '★' ? '' : d.nr + ' – '}${d.name}\n\n`;
  md += `**Plik:** \`${d.f}\`  \n**Start:** ${d.triggerKind} – ${d.trigger.s}\n\n`;
  md += `**Co robi:** ${d.cel}\n\n`;
  if (d.wymaga) md += `**Wymaga dodatkowo:** ${d.wymaga}\n\n`;
  if (d.przyklad) md += `**Przykład danych wejściowych:**\n\n\`\`\`json\n${d.przyklad}\n\`\`\`\n\n`;
  if (d.formatZrodla) md += `**Oczekiwany format źródła danych:** \`${d.formatZrodla}\`\n\n`;
  if (d.wymagane.length) md += `**Wymagane dane wejściowe:** ${d.wymagane.map((x) => '`' + x + '`').join(', ')}\n\n`;
  md += `**Przebieg:**\n\n${flowText(d.flow).join('\n')}\n\n`;
  if (d.konfiguracja.length) md += `**Do uzupełnienia w węźle Konfiguracja:**\n\n| Pole | Wartość domyślna |\n|---|---|\n${d.konfiguracja.map((c) => `| \`${c.k}\` | ${c.v.replace(/\n/g, ' ').replace(/\|/g, '\\|').slice(0, 90)} |`).join('\n')}\n\n`;
  if (d.creds.length) md += `**Credentiale:** ${d.creds.join('; ')}\n\n`;
  if (d.naprawiono.length) md += `**Co naprawiono:**\n\n${d.naprawiono.map((x) => '- ' + x).join('\n')}\n\n`;
  md += '---\n';
}
fs.writeFileSync(path.join(OUT, 'KATALOG.md'), md);


/* ------------------------- mapa HTML ------------------------- */
const KINDS = {
  trigger: 'Start', setup: 'Przygotowanie', ai: 'Model AI', http: 'Integracja / API', notify: 'Powiadomienie',
  human: 'Akceptacja człowieka', memory: 'Pamięć (bez duplikatów)', guard: 'Ochrona i limity', code: 'Przetwarzanie',
  split: 'Rozbicie listy', respond: 'Odpowiedź', end: 'Koniec gałęzi', if: 'Warunek (tak / nie)', delay: 'Odczekanie',
};
const ICONS = {
  webhook: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  hand: '<path d="M8 13V5a2 2 0 1 1 4 0v6"/><path d="M12 10V4a2 2 0 1 1 4 0v7"/><path d="M16 10a2 2 0 1 1 4 0v4a8 8 0 0 1-8 8h-1a7 7 0 0 1-6-4l-2-4a2 2 0 0 1 3-2l2 2"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  delay: '<path d="M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9"/>',
  setup: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  ai: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  http: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  notify: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/>',
  human: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="m15 13 2 2 4-4"/>',
  memory: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  guard: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  code: '<path d="M8 4c-2 0-3 1-3 3v2c0 1-1 2-2 2 1 0 2 1 2 2v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1 1 2 2 2-1 0-2 1-2 2v2c0 2-1 3-3 3"/>',
  split: '<path d="M12 3v6M12 9l-6 6M12 9l6 6M6 15v6M18 15v6"/>',
  respond: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/>',
  end: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  if: '<path d="M12 3l9 9-9 9-9-9z"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ICONS.code}</svg>`;

function renderNode(s, trigIcon) {
  const ik = s.k === 'trigger' ? trigIcon || 'webhook' : s.k === 'setup' ? 'setup' : s.k;
  return `<div class="node k-${s.k}" title="${esc(KINDS[s.k] || '')}"><div class="tile">${icon(ik)}</div><div class="lbl">${esc(s.t)}</div>${s.s ? `<div class="sub">${esc(s.s)}</div>` : ''}</div>`;
}
function renderFlow(flow, trigIcon) {
  return flow.map((s) => {
    if (s.k === 'if') {
      return `<div class="step branch">${renderNode(s)}<div class="lanes">
<div class="lane"><span class="pill yes">tak</span><div class="flow">${renderFlow(s.yes)}</div></div>
<div class="lane"><span class="pill no">nie</span><div class="flow">${renderFlow(s.no)}</div></div></div></div>`;
    }
    return `<div class="step">${renderNode(s, trigIcon)}</div>`;
  }).join('');
}

const stats = [
  [data.length, 'workflowów'],
  [data.filter((d) => d.maAI).length, 'z krokiem AI'],
  [data.filter((d) => d.triggerKind === 'Webhook').length, 'webhooków'],
  [data.filter((d) => d.triggerKind === 'Harmonogram').length, 'harmonogramów'],
  [data.filter((d) => d.maCzlowieka).length, 'z akceptacją człowieka'],
  [data.filter((d) => d.nowy).length, 'nowych (33–50)'],
];
const cats = Object.entries(OPISY.kategorie).filter(([k]) => data.some((d) => d.cat === k));
const anchor = (d) => 'wf-' + d.f.replace(/\.json$/, '');

// Szkielet wspólny dla wszystkich workflowów
const szkielet = [
  { k: 'trigger', t: 'Start', s: 'webhook / cron / Telegram' },
  { k: 'setup', t: 'Walidacja danych', s: 'wymagane pola' },
  { k: 'setup', t: 'Konfiguracja', s: 'adresy, progi' },
  { k: 'ai', t: 'AI: prompt', s: 'buduje żądanie' },
  { k: 'http', t: 'AI: model', s: 'OpenAI / Claude' },
  { k: 'code', t: 'AI: wynik', s: 'JSON + dane klienta' },
  { k: 'if', t: 'Warunek', yes: [{ k: 'human', t: 'Akceptacja', s: 'gdy ważne' }, { k: 'notify', t: 'Akcja', s: 'e-mail, CRM, Slack' }, { k: 'memory', t: 'Zapamiętaj', s: 'bez duplikatów' }], no: [{ k: 'end', t: 'Koniec / alert', s: 'jawna gałąź' }] },
];
const szkieletOpis = [
  ['Start i wejście', 'Webhook (z Header Auth), harmonogram w strefie Europe/Warsaw, Telegram albo ręcznie. Dane z webhooka są spłaszczane i sprawdzane: brak pola lub zły e-mail zatrzymuje workflow, zanim cokolwiek zostanie wysłane.'],
  ['Konfiguracja', 'Jedyny węzeł do edycji przy wdrożeniu u klienta: adresy API, progi, odbiorcy, model AI. Reszta workflow odwołuje się do niego.'],
  ['Krok AI', 'Trzy węzły zamiast jednego. Model zawsze dostaje instrukcję i dane klienta, odpowiada w JSON, a wynik jest łączony z danymi wejściowymi. Błąd AI oznacza alert, a nie pustą wiadomość do klienta.'],
  ['Decyzja i akcja', 'Każdy IF ma obie gałęzie. Rzeczy z ceną lub publikowane publicznie czekają na akceptację człowieka. Po udanej akcji workflow zapamiętuje rekord, żeby nie wysłać go drugi raz.'],
];

const cards = data.map((d) => `
<article class="wf" data-cat="${d.cat}" data-ai="${d.maAI}" data-human="${d.maCzlowieka}" data-new="${d.nowy}" data-q="${esc((d.nr + ' ' + d.name + ' ' + d.f + ' ' + d.cel + ' ' + d.naprawiono.join(' ')).toLowerCase())}" id="${anchor(d)}">
  <header class="wf-h">
    <span class="nr">${esc(d.nr)}</span>
    <div class="wf-title"><h3>${esc(d.name)}</h3><code class="file">${esc(d.f)}</code></div>
    <div class="tags">${d.nowy ? '<span class="tag new">nowy</span>' : ''}<span class="tag">${esc(OPISY.kategorie[d.cat])}</span><span class="tag trig">${esc(d.triggerKind)} · ${esc(d.trigger.s.replace(/ · Header Auth$/, ''))}</span>${d.maAI ? '<span class="tag ai">AI</span>' : ''}${d.maCzlowieka ? '<span class="tag human">akceptacja</span>' : ''}</div>
  </header>
  <div class="canvas" role="img" aria-label="Przebieg: ${esc(d.name)}"><div class="flow">${renderFlow(d.flow, d.ikona)}</div></div>
  <div class="wf-body">
    <section><h4>Co robi</h4><p>${esc(d.cel)}</p>${d.wymaga ? `<p class="req"><b>Wymaga:</b> ${esc(d.wymaga)}</p>` : ''}</section>
    <section><h4>${d.nowy ? 'Jak jest zbudowany' : 'Co naprawiono'}</h4><ul class="fixes">${d.naprawiono.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
    <section>${d.przyklad ? `<h4>Przykładowe dane wejściowe</h4><pre class="json">${esc(d.przyklad)}</pre>` : d.formatZrodla ? `<h4>Format danych ze źródła</h4><pre class="json">${esc(d.formatZrodla)}</pre>` : `<h4>Wejście</h4><p class="muted">${esc(d.triggerKind === 'Ręcznie' ? 'Uruchamiasz ręcznie – brief wpisujesz w Konfiguracji.' : 'Start: ' + d.trigger.s + '. Dane pobiera sam workflow.')}</p>`}</section>
  </div>
  <details class="more"><summary>Konfiguracja i credentiale <span class="muted">(${d.konfiguracja.length} pól, ${d.creds.length} credentiale)</span></summary>
    <div class="more-grid">
      ${d.konfiguracja.length ? `<div><h5>Węzeł „Konfiguracja”</h5><dl>${d.konfiguracja.map((c) => `<dt><code>${esc(c.k)}</code></dt><dd>${esc(c.v.length > 140 ? c.v.slice(0, 140) + '…' : c.v)}</dd>`).join('')}</dl></div>` : ''}
      ${d.creds.length ? `<div><h5>Credentiale w n8n</h5><ul>${d.creds.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>${d.wymagane.length ? `<h5>Pola wymagane</h5><p>${d.wymagane.map((x) => `<code>${esc(x)}</code>`).join(' ')}</p>` : ''}</div>` : ''}
    </div>
  </details>
</article>`).join('\n');

const indeksHtml = cats.map(([k, v]) => `<div class="idx-col"><h3>${esc(v)}</h3><ol>${data.filter((d) => d.cat === k).map((d) =>
  `<li><a href="#${anchor(d)}"><span class="inr">${esc(d.nr)}</span><span class="iname">${esc(d.name)}</span><span class="imarks">${d.nowy ? '<i class="m-new">NOWY</i>' : ''}${d.maAI ? '<i class="m-ai" title="krok AI"></i>' : ''}${d.maCzlowieka ? '<i class="m-human" title="akceptacja człowieka"></i>' : ''}</span></a></li>`).join('')}</ol></div>`).join('');

const legend = ['trigger', 'setup', 'ai', 'http', 'code', 'split', 'if', 'memory', 'human', 'delay', 'notify', 'respond', 'end']
  .map((k) => `<li class="k-${k}"><span class="tile sm">${icon(k === 'trigger' ? 'webhook' : k)}</span>${esc(KINDS[k])}</li>`).join('');

const TOKENS_DARK = `color-scheme:dark;
  --bg:#0D1318;--surface:#141C24;--raised:#18222C;--ink:#E3E9EF;--muted:#93A1AE;--line:#26323D;--soft:#1B2630;--canvas:#10181F;--dot:#24303B;
  --accent:#4CC2BA;--accent-ink:#04201E;--before:#F08C8C;--after:#5FD3A1;
  --k-trigger:#F2A65A;--k-setup:#9AAABB;--k-ai:#B39DFA;--k-http:#5AB6EE;--k-notify:#3FCB95;--k-human:#F47EBE;
  --k-memory:#D8C556;--k-guard:#F29466;--k-code:#A8B6C6;--k-split:#45CDBD;--k-respond:#86A8FF;--k-end:#5E6B78;--k-if:#C9D3DD;--k-delay:#E3B341;--k-new:#4CC2BA;--yes:#3FCB95;--no:#F58B8B;`;

const body = `<title>Mapa automatyzacji STFS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --bg:#EEF1F4;--surface:#FFFFFF;--raised:#F7F9FA;--ink:#16202A;--muted:#5A6672;--line:#D5DBE1;--soft:#E6EBEF;--canvas:#F6F8FA;--dot:#D3DAE0;
  --accent:#0A6B67;--accent-ink:#FFFFFF;--before:#B42318;--after:#047857;
  --k-trigger:#B45309;--k-setup:#5F6E7E;--k-ai:#6D28D9;--k-http:#0369A1;--k-notify:#047857;--k-human:#BE185D;
  --k-memory:#7A6A12;--k-guard:#9A3412;--k-code:#475569;--k-split:#0F766E;--k-respond:#1D4ED8;--k-end:#94A0AC;--k-if:#334155;--k-delay:#A16207;--k-new:#0A6B67;--yes:#047857;--no:#B42318;
  --display:"Archivo","Helvetica Neue",Arial,sans-serif;--sans:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${TOKENS_DARK}}}
:root[data-theme="dark"]{${TOKENS_DARK}}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{background:var(--bg);color:var(--ink);font:15px/1.55 var(--sans);margin:0;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
code{font-family:var(--mono)}
.wrap{max-width:1200px;margin:0 auto;padding-inline:20px;padding-block:32px 72px}
h1,h2,h3{font-family:var(--display);text-wrap:balance;margin:0;letter-spacing:-.015em}
h2{font-size:24px;font-weight:700}
.eyebrow{font:500 12px var(--mono);color:var(--muted);letter-spacing:.04em;margin:0 0 10px}
h1{font-size:clamp(32px,5vw,52px);font-weight:800;line-height:1.02;letter-spacing:-.03em}
.lead{color:var(--muted);max-width:66ch;margin:14px 0 0;font-size:16px}
.stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));margin-top:26px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.stat{padding:14px 16px 14px 0;display:grid;gap:2px}
.stat+.stat{padding-left:16px;border-left:1px solid var(--line)}
.stat b{font:800 32px/1 var(--display);font-variant-numeric:tabular-nums}
.stat span{font-size:12.5px;color:var(--muted)}
.toc{display:flex;gap:18px;flex-wrap:wrap;margin-top:16px;font-size:14px}
.toc a{text-decoration:none;font-weight:500}
.toc a:hover{text-decoration:underline}
.section{margin-top:52px;display:grid;gap:16px}
.section>p.intro{margin:0;color:var(--muted);max-width:70ch}
/* canvas + nodes (styl kanwy n8n) */
.canvas{background-color:var(--canvas);background-image:radial-gradient(var(--dot) 1.1px,transparent 1.3px);background-size:18px 18px;border:1px solid var(--line);border-radius:10px;padding:18px 16px 14px;overflow-x:auto;scrollbar-width:thin}
.canvas.more-right{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 48px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 48px),transparent)}
.flow{display:flex;align-items:flex-start;width:max-content}
.step{display:flex;align-items:flex-start;flex:0 0 auto}
.step+.step::before,.lane .flow>.step:first-child::before{content:"";flex:0 0 auto;width:22px;height:2px;margin-top:22px;background:var(--line);border-radius:2px}
.lane .flow>.step:first-child::before{width:10px}
.node{width:112px;display:grid;justify-items:center;text-align:center;gap:4px}
.tile{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--kc) 13%,var(--surface));border:1.5px solid color-mix(in srgb,var(--kc) 60%,transparent);color:var(--kc)}
.tile svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.tile.sm{width:28px;height:28px;border-radius:8px}.tile.sm svg{width:15px;height:15px}
.k-trigger .tile{border-radius:23px 12px 12px 23px}
.k-end .tile{border-style:dashed;background:transparent}
.k-human .tile{box-shadow:0 0 0 3px color-mix(in srgb,var(--k-human) 18%,transparent)}
.lbl{font:500 12px/1.3 var(--sans);color:var(--ink)}
.sub{font:10.5px/1.3 var(--mono);color:var(--muted)}
.k-trigger{--kc:var(--k-trigger)}.k-setup{--kc:var(--k-setup)}.k-ai{--kc:var(--k-ai)}.k-http{--kc:var(--k-http)}.k-notify{--kc:var(--k-notify)}
.k-human{--kc:var(--k-human)}.k-memory{--kc:var(--k-memory)}.k-guard{--kc:var(--k-guard)}.k-code{--kc:var(--k-code)}.k-split{--kc:var(--k-split)}
.k-respond{--kc:var(--k-respond)}.k-end{--kc:var(--k-end)}.k-if{--kc:var(--k-if)}.k-delay{--kc:var(--k-delay)}
.branch{align-items:flex-start}
.lanes{display:grid;gap:14px;position:relative;padding-left:0;margin-top:0}
.branch>.node+.lanes{margin-left:0}
.branch>.node{position:relative}
.branch>.node::after{content:"";position:absolute;right:-8px;top:22px;width:8px;height:2px;background:var(--line)}
.branch>.lanes{margin-left:8px}
.lane{display:flex;align-items:flex-start;position:relative}
.lane:not(:last-child)::after{content:"";position:absolute;left:0;top:23px;bottom:-14px;width:2px;background:var(--line)}
.lane:not(:first-child)::before{content:"";position:absolute;left:0;top:0;height:24px;width:2px;background:var(--line)}
.pill{flex:0 0 auto;margin-top:13px;margin-left:6px;font:600 10px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;padding:5px 6px;border-radius:5px;border:1px solid currentColor;background:var(--surface)}
.pill.yes{color:var(--yes)}.pill.no{color:var(--no)}
/* skeleton */
.skeleton-notes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.skeleton-notes h3{font-size:15px;font-weight:700;margin-bottom:4px}
.skeleton-notes p{margin:0;color:var(--muted);font-size:14px}
.legend{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px 16px;font-size:13px;color:var(--muted)}
.legend li{display:flex;align-items:center;gap:9px}
/* before / after */
.ba{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface)}
.ba-row{display:grid;grid-template-columns:180px minmax(0,1fr) minmax(0,1fr);border-top:1px solid var(--line)}
.ba-row:first-child{border-top:0}
.ba-row>*{padding:12px 16px;margin:0}
.ba-head{background:var(--raised);font:600 12px var(--sans);text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
.ba-head .b{color:var(--before)}.ba-head .a{color:var(--after)}
.ba-row .t{font-weight:600}
.ba-row .b{color:var(--muted)}
.ba-row .a{border-left:1px solid var(--line)}
/* index */
.index{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:22px 28px}
.idx-col h3{font:600 12px var(--sans);text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding-bottom:6px;border-bottom:1px solid var(--line);margin-bottom:4px}
.idx-col ol{list-style:none;margin:0;padding:0}
.idx-col a{display:grid;grid-template-columns:2.4ch 1fr auto;gap:8px;align-items:baseline;padding:5px 0;text-decoration:none;color:var(--ink);font-size:14px}
.idx-col a:hover .iname{color:var(--accent);text-decoration:underline}
.inr{font:500 12px var(--mono);color:var(--muted);font-variant-numeric:tabular-nums}
.imarks{display:flex;gap:4px}
.imarks i{width:8px;height:8px;border-radius:2px;display:inline-block}
.m-new{background:var(--k-new);width:auto!important;height:auto!important;font:600 9.5px/1 var(--mono);color:var(--surface);padding:2px 4px;border-radius:3px!important;font-style:normal}
.m-ai{background:var(--k-ai)}.m-human{background:var(--k-human);border-radius:50%!important}
/* filter bar */
.bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(6px);padding-block:12px;border-bottom:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.bar button{-webkit-appearance:none;appearance:none;font:500 13px var(--sans);border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:6px 12px;border-radius:999px;cursor:pointer}
.bar button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.bar .sep{width:1px;height:22px;background:var(--line);margin-inline:4px}
.bar button.tg[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.bar button:focus-visible,.bar input:focus-visible,summary:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.bar input{margin-left:auto;font:14px var(--sans);padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);width:230px;max-width:100%;min-width:0}
.count{font:500 13px var(--mono);color:var(--muted);font-variant-numeric:tabular-nums}
/* cards */
.wf>*,.section>*,.wf-body>*,.list>*,header>*{min-width:0}
.list{display:grid;gap:22px;margin-top:20px}
.wf{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px 22px;display:grid;gap:16px;scroll-margin-top:84px}
.wf-h{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:start}
.nr{font:800 26px/1 var(--display);color:var(--accent);min-width:2.2ch;font-variant-numeric:tabular-nums}
.wf-title h3{font-size:20px;font-weight:700}
.file{font-size:12px;color:var(--muted)}
.tags{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:420px}
.tag{font:500 12px var(--sans);padding:3px 9px;border-radius:999px;background:var(--soft);color:var(--muted);white-space:nowrap}
.tag.new{background:var(--k-new);color:var(--surface)}
.tag.trig{color:var(--k-trigger)}.tag.ai{color:var(--k-ai)}.tag.human{color:var(--k-human)}
.wf-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr) minmax(0,.9fr);gap:22px}
.wf-body h4,.more h5{font:600 11.5px var(--sans);text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 6px}
.wf-body p{margin:0}
.req{margin-top:10px!important;font-size:13.5px;color:var(--muted)}
.req b{color:var(--ink);font-weight:600}
.fixes{margin:0;padding-left:18px;font-size:14px}
.fixes li{margin:3px 0}.fixes li::marker{color:var(--after)}
pre.json{margin:0;font:12px/1.5 var(--mono);background:var(--raised);border:1px solid var(--line);border-radius:8px;padding:10px 12px;overflow-x:auto;white-space:pre}
.muted{color:var(--muted)}
.more summary{cursor:pointer;font-weight:500;color:var(--accent);font-size:14px}
.more summary .muted{font-weight:400}
.more-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-top:12px}
.more dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:5px 12px;font-size:13px}
.more dd{margin:0;color:var(--muted);overflow-wrap:anywhere}
.more code{font-size:12px;background:var(--soft);padding:1px 5px;border-radius:4px}
.more ul{margin:0 0 12px;padding-left:18px;font-size:13px}
.empty{color:var(--muted);padding:30px 0;text-align:center}
.foot{margin-top:40px;color:var(--muted);font-size:13px}
@media (max-width:900px){.wf-body{grid-template-columns:1fr 1fr}.wf-body section:last-child{grid-column:1/-1}.skeleton-notes{grid-template-columns:1fr 1fr}}
@media (max-width:680px){
  .stats{grid-template-columns:repeat(2,minmax(0,1fr))}.stat{padding-left:0!important;border-left:0!important;border-top:1px solid var(--line)}.stat:nth-child(-n+2){border-top:0}
  .wf-h{grid-template-columns:auto minmax(0,1fr)}.tags{grid-column:1/-1;justify-content:flex-start}
  .wf-body,.skeleton-notes{grid-template-columns:1fr}
  .ba-row{grid-template-columns:1fr}.ba-row .a{border-left:0;border-top:1px dashed var(--line)}.ba-head{display:none}
  .ba-row .b::before{content:"Przed: ";font-weight:600;color:var(--before)}.ba-row .a::before{content:"Po: ";font-weight:600;color:var(--after)}
  .bar input{margin-left:0;width:100%}.bar .sep{display:none}
  .wf{padding:16px}
}
</style>
<div class="wrap">
  <header>
    <p class="eyebrow">stfs / n8n-workflows · komplet 50 workflowów katalogu, 23.09.2026</p>
    <h1>Mapa automatyzacji STFS</h1>
    <p class="lead">Wszystkie workflowy n8n po naprawie: co robią, jak przepływają dane, co zostało poprawione i czego potrzebują do uruchomienia. Diagramy są generowane z plików JSON, więc zawsze zgadzają się z tym, co importujesz do n8n.</p>
    <div class="stats">${stats.map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('')}</div>
    <nav class="toc" aria-label="Spis treści"><a href="#szkielet">Szkielet workflowu</a><a href="#przed-po">Przed i po naprawie</a><a href="#indeks">Indeks</a><a href="#workflowy">Wszystkie workflowy</a></nav>
  </header>

  <section class="section" id="szkielet">
    <h2>Szkielet każdego workflowu</h2>
    <p class="intro">Wszystkie workflowy są budowane przez jedną bibliotekę (<code>_lib.js</code>), więc mają ten sam układ. Jeśli rozumiesz ten jeden diagram, rozumiesz każdy z nich.</p>
    <div class="canvas"><div class="flow">${renderFlow(szkielet, 'webhook')}</div></div>
    <div class="skeleton-notes">${szkieletOpis.map(([t, p]) => `<div><h3>${esc(t)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
    <ul class="legend" aria-label="Legenda">${legend}</ul>
  </section>

  <section class="section" id="przed-po">
    <h2>Przed i po naprawie</h2>
    <p class="intro">Błędy siedziały w generatorze, więc powtarzały się w każdym pliku. Naprawa w jednym miejscu poprawiła wszystkie 32 workflowy katalogu, a 18 nowych (33–50) od początku powstało na poprawionej bibliotece.</p>
    <div class="ba">
      <div class="ba-row ba-head"><span>Obszar</span><span class="b">Przed</span><span class="a">Po</span></div>
      ${OPISY.wspolne.map((r) => `<div class="ba-row"><p class="t">${esc(r.temat)}</p><p class="b">${esc(r.przed)}</p><p class="a">${esc(r.po)}</p></div>`).join('')}
    </div>
  </section>

  <section class="section" id="indeks">
    <h2>Indeks</h2>
    <p class="intro"><i class="m-new" style="display:inline-block">NOWY</i> dodany 23.09 &nbsp; <i class="m-ai" style="display:inline-block;width:8px;height:8px;border-radius:2px"></i> krok AI &nbsp; <i class="m-human" style="display:inline-block;width:8px;height:8px;border-radius:50%"></i> akceptacja człowieka. Kliknij nazwę, aby przejść do diagramu.</p>
    <div class="index">${indeksHtml}</div>
  </section>

  <section class="section" id="workflowy">
    <h2>Wszystkie workflowy</h2>
    <nav class="bar" aria-label="Filtry">
      <button type="button" class="cat" data-f="all" aria-pressed="true">Wszystkie</button>
      ${cats.map(([k, v]) => `<button type="button" class="cat" data-f="${k}" aria-pressed="false">${esc(v)}</button>`).join('')}
      <span class="sep" aria-hidden="true"></span>
      <button type="button" class="tg" data-t="ai" aria-pressed="false">Tylko z AI</button>
      <button type="button" class="tg" data-t="human" aria-pressed="false">Z akceptacją</button>
      <button type="button" class="tg" data-t="new" aria-pressed="false">Tylko nowe</button>
      <input id="szukaj" type="search" placeholder="Szukaj: faktura, Slack, CRM…" aria-label="Szukaj workflow">
      <span class="count" id="licznik">${data.length}/${data.length}</span>
    </nav>
    <div class="list" id="lista">${cards}
      <p class="empty" id="pusto" hidden>Brak workflowów dla tych filtrów.</p>
    </div>
  </section>
  <p class="foot">Wygenerowano poleceniem <code>node zbuduj-przewodnik.js</code> z plików w <code>n8n-workflows/</code>. Opisy i listy napraw: <code>opisy.js</code>. Szczegóły: <code>_PRZEWODNIK/CO-NAPRAWIONO.md</code> i <code>JAK-URUCHOMIC.md</code>.</p>
</div>
<script>
(function(){
  var cats=[].slice.call(document.querySelectorAll('.bar .cat')),tgs=[].slice.call(document.querySelectorAll('.bar .tg'));
  var cards=[].slice.call(document.querySelectorAll('.wf')),q=document.getElementById('szukaj'),licz=document.getElementById('licznik'),pusto=document.getElementById('pusto');
  var cat='all',need={ai:false,human:false,new:false};
  function apply(){var t=(q.value||'').trim().toLowerCase(),n=0;
    cards.forEach(function(c){var ok=(cat==='all'||c.dataset.cat===cat)&&(!t||c.dataset.q.indexOf(t)>-1)&&(!need.ai||c.dataset.ai==='true')&&(!need.human||c.dataset.human==='true')&&(!need.new||c.dataset.new==='true');c.hidden=!ok;if(ok)n++;});
    licz.textContent=n+'/'+cards.length;pusto.hidden=n>0;markScroll();}
  cats.forEach(function(b){b.addEventListener('click',function(){cat=b.dataset.f;cats.forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});apply();});});
  tgs.forEach(function(b){b.addEventListener('click',function(){need[b.dataset.t]=!need[b.dataset.t];b.setAttribute('aria-pressed',String(need[b.dataset.t]));apply();});});
  q.addEventListener('input',apply);
  function markScroll(){[].slice.call(document.querySelectorAll('.canvas')).forEach(function(c){c.classList.toggle('more-right',c.scrollWidth-c.clientWidth-c.scrollLeft>6);});}
  [].slice.call(document.querySelectorAll('.canvas')).forEach(function(c){c.addEventListener('scroll',markScroll,{passive:true});});
  window.addEventListener('resize',markScroll);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(markScroll);
  markScroll();
})();
</script>
`;

const fragArg = process.argv.indexOf('--fragment');
if (fragArg > -1) fs.writeFileSync(process.argv[fragArg + 1], body);
fs.writeFileSync(path.join(OUT, 'mapa-workflowow.html'), `<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
console.log(`Przewodnik: ${data.length} workflowów -> _PRZEWODNIK/KATALOG.md, _PRZEWODNIK/mapa-workflowow.html`);
