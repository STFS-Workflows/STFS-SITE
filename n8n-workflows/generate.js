// Generates n8n-importable workflow JSON files for the 32 STFS automation catalog items.
// Run: node generate.js
const fs = require('fs');
const path = require('path');

const OUT_DIR = __dirname;
const uid = () => crypto.randomUUID();
const { randomUUID } = require('crypto');

let X_STEP = 260;
let Y_BASE = 300;

function node(type, name, parameters, x, typeVersion = 1, extra = {}) {
  return {
    id: randomUUID(),
    name,
    type,
    typeVersion,
    position: [x, Y_BASE],
    parameters,
    ...extra,
  };
}

function stickyNote(text, x, width = 320, height = 260, yOffset = -320) {
  return {
    id: randomUUID(),
    name: 'Notatka: konfiguracja',
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    position: [x, Y_BASE + yOffset],
    parameters: { content: text, height, width, color: 4 },
  };
}

function webhookTrigger(name, webhookPath, x) {
  return node(
    'n8n-nodes-base.webhook',
    name,
    {
      httpMethod: 'POST',
      path: webhookPath,
      authentication: 'headerAuth',
      responseMode: 'onReceived',
      options: {},
    },
    x,
    2
  );
}

function scheduleTrigger(name, cron, x) {
  return node(
    'n8n-nodes-base.scheduleTrigger',
    name,
    { rule: { interval: [{ field: 'cronExpression', expression: cron }] } },
    x,
    1.2
  );
}

function manualTrigger(name, x) {
  return node('n8n-nodes-base.manualTrigger', name, {}, x, 1);
}

function setNode(name, fields, x) {
  return node(
    'n8n-nodes-base.set',
    name,
    {
      assignments: {
        assignments: fields.map((f) => ({
          id: randomUUID(),
          name: f.name,
          value: f.value,
          type: f.type || 'string',
        })),
      },
      options: {},
    },
    x,
    3.4
  );
}

function ifNode(name, leftValue, operation, rightValue, x) {
  return node(
    'n8n-nodes-base.if',
    name,
    {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            id: randomUUID(),
            leftValue,
            rightValue,
            operator: { type: typeof rightValue === 'number' ? 'number' : 'string', operation },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
    x,
    2
  );
}

function codeNode(name, jsCode, x) {
  return node('n8n-nodes-base.code', name, { jsCode }, x, 2);
}

function httpNode(name, method, url, note, x) {
  return node(
    'n8n-nodes-base.httpRequest',
    name,
    {
      method,
      url,
      sendBody: method !== 'GET',
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json) }}',
      options: {},
    },
    x,
    4.2,
    { notes: note }
  );
}

function emailNode(name, toExpr, subject, text, x) {
  return node(
    'n8n-nodes-base.emailSend',
    name,
    { fromEmail: 'hello@stfs.studio', toEmail: toExpr, subject, text, options: {} },
    x,
    2.1
  );
}

function slackNode(name, text, x) {
  return node(
    'n8n-nodes-base.slack',
    name,
    { select: 'channel', channelId: { mode: 'name', value: '#automatyzacje' }, text, otherOptions: {} },
    x,
    2.2
  );
}

function noOp(name, x) {
  return node('n8n-nodes-base.noOp', name, {}, x, 1);
}

function respondWebhook(name, x) {
  return node(
    'n8n-nodes-base.respondToWebhook',
    name,
    { respondWith: 'json', responseBody: '={{ { "status": "ok" } }}' },
    x,
    1.1
  );
}

function buildWorkflow({ fileName, name, category, setupNote, triggerNode, steps }) {
  const trigger = triggerNode;
  trigger.position = [80, Y_BASE];

  const chain = [trigger];
  steps.forEach((s, i) => {
    s.position = [80 + (i + 1) * X_STEP, Y_BASE];
    chain.push(s);
  });

  const webhookSecurityNote = trigger.type === 'n8n-nodes-base.webhook'
    ? '\n\n## Bezpieczeństwo przed aktywacją\n\nTen webhook wymaga teraz **Header Auth**. W n8n utwórz poświadczenie Header Auth z długim, losowym tokenem i przypisz je do węzła — bez tego workflow nie może zostać aktywowany. Nie umieszczaj tokenu w JavaScript strony ani w pliku JSON.\n\nDla Stripe, Twilio i podobnych dostawców dodatkowo zweryfikuj ich podpis webhooka na surowym body przed każdym skutkiem ubocznym. Formularz działający w przeglądarce musi iść przez własny backend/gateway z CAPTCHA i limitem żądań; nie wywołuj bezpośrednio chronionego webhooka n8n z kodu klienta. Zweryfikuj schemat danych i uprawnienia po stronie serwera przed wysłaniem e-maila, utworzeniem wydarzenia lub zapisem do systemu.'
    : '';
  const note = stickyNote(`${setupNote}${webhookSecurityNote}`, 80, 460, 440, -480);

  const connections = {};
  for (let i = 0; i < chain.length - 1; i++) {
    connections[chain[i].name] = { main: [[{ node: chain[i + 1].name, type: 'main', index: 0 }]] };
  }

  const workflow = {
    name: `STFS — ${name}`,
    nodes: [note, ...chain],
    connections,
    active: false,
    settings: { executionOrder: 'v1' },
  };

  fs.writeFileSync(path.join(OUT_DIR, fileName), JSON.stringify(workflow, null, 2), 'utf8');
  return { fileName, name, category };
}

const registry = [];

// ---------- helper for common "AI step" ----------
function aiHttpNode(name, note, x) {
  return httpNode(
    name,
    'POST',
    'https://api.openai.com/v1/chat/completions',
    note ||
      'Podmień na węzeł dostawcy AI (OpenAI/Claude/inny) i zapisz klucz jako credential w n8n. Nie wpisuj klucza w pliku workflow ani w JavaScript strony. To placeholder pokazujący, gdzie w przepływie wchodzi model językowy.',
    x
  );
}

/* =========================================================
   1. SPRZEDAŻ I LEADY
   ========================================================= */

registry.push(
  buildWorkflow({
    fileName: '01-sprzedaz-kwalifikacja-leadow.json',
    name: 'Kwalifikacja i scoring leadów',
    category: 'sprzedaz',
    setupNote:
      '## Kwalifikacja leadów\n\n**Trigger:** Webhook — podepnij formularz strony (np. STFS booking) lub CRM.\n\n**Do zrobienia:**\n1. Podmień węzeł AI na swój provider (OpenAI/Claude) + klucz API.\n2. W węźle "Zapisz do CRM" podmień URL na endpoint Twojego CRM (HubSpot/Pipedrive/inny) + auth.\n3. Ustaw próg scoringu w węźle IF.',
    triggerNode: webhookTrigger('Nowy lead (Webhook)', 'lead-nowy', 0),
    steps: [
      aiHttpNode('AI: oceń i przypisz score', 'Wysyła treść zapytania do modelu, który zwraca score 0-100 i kategorię leada.'),
      codeNode(
        'Wyciągnij score',
        "const score = $json.score ?? 50;\nreturn [{ json: { ...$json, score } }];"
      ),
      ifNode('Czy lead gorący?', '={{ $json.score }}', 'gte', 70),
      httpNode('Zapisz do CRM', 'POST', 'https://YOUR-CRM.example.com/api/leads', 'Podmień na realny endpoint CRM.'),
      slackNode('Powiadom handlowca', 'Nowy gorący lead ({{$json.score}} pkt): {{$json.name}} — {{$json.email}}'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '02-sprzedaz-automatyczne-odpowiedzi.json',
    name: 'Automatyczne odpowiedzi na zapytania',
    category: 'sprzedaz',
    setupNote:
      '## Automatyczne pierwsze odpowiedzi\n\n**Trigger:** Webhook z formularza kontaktowego.\n\n**Do zrobienia:**\n1. Podepnij realny formularz (strona / e-mail box) pod webhook.\n2. Skonfiguruj SMTP (Email Send) lub podmień na Gmail/Outlook node.\n3. Dostosuj treść odpowiedzi AI do tonu marki.',
    triggerNode: webhookTrigger('Nowe zapytanie (Webhook)', 'zapytanie-nowe', 0),
    steps: [
      aiHttpNode('AI: wygeneruj odpowiedź', 'Model generuje spersonalizowaną odpowiedź na podstawie treści zapytania.'),
      emailNode('Wyślij odpowiedź', '={{ $json.email }}', 'Re: Twoje zapytanie do STFS', '={{ $json.aiResponse }}'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '03-sprzedaz-follow-up.json',
    name: 'Follow-up po braku odpowiedzi',
    category: 'sprzedaz',
    setupNote:
      '## Follow-up sekwencyjny\n\n**Trigger:** Schedule — sprawdza codziennie leady bez odpowiedzi.\n\n**Do zrobienia:**\n1. Podmień "Pobierz leady bez odpowiedzi" na zapytanie do Twojego CRM/bazy.\n2. Ustaw liczbę dni bez odpowiedzi w węźle IF.\n3. Dostosuj treść follow-upu.',
    triggerNode: scheduleTrigger('Codziennie 9:00', '0 9 * * *', 0),
    steps: [
      httpNode('Pobierz leady bez odpowiedzi', 'GET', 'https://YOUR-CRM.example.com/api/leads?status=no_reply', 'Podmień na realny endpoint CRM/bazy.'),
      ifNode('Minęło 3+ dni?', '={{ $json.daysSinceContact }}', 'gte', 3),
      aiHttpNode('AI: napisz follow-up', 'Model generuje krótką, nienachalną wiadomość follow-up.'),
      emailNode('Wyślij follow-up', '={{ $json.email }}', 'Czy nadal jesteś zainteresowany/a?', '={{ $json.aiResponse }}'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '04-sprzedaz-aktualizacja-crm.json',
    name: 'Aktualizacja CRM bez ręcznego wpisywania',
    category: 'sprzedaz',
    setupNote:
      '## Auto-aktualizacja CRM\n\n**Trigger:** Webhook — dowolne źródło danych (formularz, e-mail, czat).\n\n**Do zrobienia:**\n1. Podmień "Zapisz/Aktualizuj w CRM" na realny endpoint (HubSpot/Pipedrive/Salesforce).\n2. Zmapuj pola w węźle Set na strukturę Twojego CRM.',
    triggerNode: webhookTrigger('Nowe dane kontaktu (Webhook)', 'dane-kontaktu', 0),
    steps: [
      setNode('Zmapuj pola', [
        { name: 'fullName', value: '={{ $json.name }}' },
        { name: 'email', value: '={{ $json.email }}' },
        { name: 'source', value: '={{ $json.source || "strona" }}' },
      ]),
      httpNode('Zapisz/Aktualizuj w CRM', 'POST', 'https://YOUR-CRM.example.com/api/contacts/upsert', 'Podmień na realny endpoint CRM.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '05-sprzedaz-umawianie-spotkan.json',
    name: 'Umawianie spotkań i konsultacji',
    category: 'sprzedaz',
    setupNote:
      '## Automatyczne umawianie spotkań\n\n**Trigger:** Webhook z panelu rezerwacji (np. sekcja Konsultacja na stronie STFS).\n\n**Do zrobienia:**\n1. Podmień "Utwórz wydarzenie" na węzeł Google Calendar / Cal.com / Calendly.\n2. Skonfiguruj SMTP dla potwierdzenia mailowego.',
    triggerNode: webhookTrigger('Rezerwacja konsultacji (Webhook)', 'rezerwacja-konsultacji', 0),
    steps: [
      httpNode('Utwórz wydarzenie w kalendarzu', 'POST', 'https://YOUR-CALENDAR.example.com/api/events', 'Podmień na Google Calendar / Cal.com / Calendly node.'),
      emailNode('Wyślij potwierdzenie', '={{ $json.email }}', 'Potwierdzenie konsultacji STFS', 'Twoja konsultacja została zarezerwowana: {{$json.date}} {{$json.time}}.'),
    ],
  })
);

/* =========================================================
   2. MARKETING
   ========================================================= */

registry.push(
  buildWorkflow({
    fileName: '06-marketing-generowanie-tresci.json',
    name: 'Generowanie treści i reklam',
    category: 'marketing',
    setupNote:
      '## Generator treści marketingowych\n\n**Trigger:** Manual — uruchamiasz ręcznie z brief-em wejściowym, lub podepnij pod formularz brief-u.\n\n**Do zrobienia:**\n1. Podmień węzeł AI na swój provider.\n2. Podmień "Zapisz wersję roboczą" na Google Sheets / Notion / CMS.',
    triggerNode: manualTrigger('Start (podaj brief)', 0),
    steps: [
      setNode('Brief wejściowy', [{ name: 'brief', value: 'Opisz produkt/kampanię tutaj' }]),
      aiHttpNode('AI: wygeneruj 3 warianty treści'),
      httpNode('Zapisz wersję roboczą', 'POST', 'https://YOUR-CMS.example.com/api/drafts', 'Podmień na Google Sheets/Notion/CMS.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '07-marketing-raportowanie-kampanii.json',
    name: 'Automatyczne raportowanie kampanii',
    category: 'marketing',
    setupNote:
      '## Cotygodniowy raport kampanii\n\n**Trigger:** Schedule — co poniedziałek rano.\n\n**Do zrobienia:**\n1. Podmień "Pobierz dane Meta/Google Ads" na oficjalne węzły/API tych platform (wymaga kont reklamowych + tokenów).\n2. Skonfiguruj Slack/e-mail do wysyłki raportu.',
    triggerNode: scheduleTrigger('Poniedziałek 8:00', '0 8 * * 1', 0),
    steps: [
      httpNode('Pobierz dane Meta Ads', 'GET', 'https://graph.facebook.com/v20.0/act_YOUR_ID/insights', 'Wymaga tokenu Meta Marketing API.'),
      httpNode('Pobierz dane Google Ads', 'GET', 'https://googleads.googleapis.com/v16/customers/YOUR_ID/googleAds:search', 'Wymaga Google Ads API + OAuth.'),
      codeNode('Połącz dane w raport', 'return [{ json: { summary: "Połącz dane z obu źródeł tutaj" } }];'),
      slackNode('Wyślij raport na Slack', 'Tygodniowy raport kampanii:\n{{$json.summary}}'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '08-marketing-segmentacja-mailingow.json',
    name: 'Segmentacja i personalizacja mailingów',
    category: 'marketing',
    setupNote:
      '## Segmentacja bazy mailingowej\n\n**Trigger:** Schedule lub Webhook po dodaniu kontaktu.\n\n**Do zrobienia:**\n1. Podmień "Pobierz kontakty" na Twoją bazę/CRM.\n2. Podmień "Wyślij do segmentu" na Mailchimp/Brevo/inny ESP.',
    triggerNode: scheduleTrigger('Codziennie 7:00', '0 7 * * *', 0),
    steps: [
      httpNode('Pobierz kontakty', 'GET', 'https://YOUR-CRM.example.com/api/contacts', 'Podmień na realną bazę kontaktów.'),
      codeNode(
        'Przypisz segment',
        "const segment = ($json.purchases || 0) > 0 ? 'klienci' : 'leady';\nreturn [{ json: { ...$json, segment } }];"
      ),
      httpNode('Wyślij do segmentu (ESP)', 'POST', 'https://YOUR-ESP.example.com/api/campaigns/send', 'Podmień na Mailchimp/Brevo/inny ESP.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '09-marketing-monitoring-wzmianek.json',
    name: 'Monitoring wzmianek o marce',
    category: 'marketing',
    setupNote:
      '## Monitoring marki\n\n**Trigger:** Schedule — co kilka godzin.\n\n**Do zrobienia:**\n1. Podmień "Pobierz wzmianki" na API narzędzia monitoringu (Brand24, Mention) lub RSS/wyszukiwarkę.\n2. Skonfiguruj Slack do alertów o negatywnym sentymencie.',
    triggerNode: scheduleTrigger('Co 4 godziny', '0 */4 * * *', 0),
    steps: [
      httpNode('Pobierz wzmianki', 'GET', 'https://YOUR-MONITORING.example.com/api/mentions', 'Podmień na Brand24/Mention/RSS.'),
      aiHttpNode('AI: analiza sentymentu', 'Model klasyfikuje każdą wzmiankę jako pozytywną/neutralną/negatywną.'),
      ifNode('Czy sentyment negatywny?', '={{ $json.sentiment }}', 'equals', 'negative'),
      slackNode('Alert: negatywna wzmianka', '⚠️ Negatywna wzmianka o marce: {{$json.text}}'),
    ],
  })
);

/* =========================================================
   3. OBSŁUGA KLIENTA
   ========================================================= */

registry.push(
  buildWorkflow({
    fileName: '10-obsluga-bot-faq.json',
    name: 'Bot FAQ (Telegram / WhatsApp / czat)',
    category: 'obsluga',
    setupNote:
      '## Bot FAQ\n\n**Trigger:** Webhook — podepnij pod Telegram Bot API / WhatsApp Business API / widget czatu na stronie.\n\n**Do zrobienia:**\n1. Skonfiguruj webhook swojego kanału (Telegram/WhatsApp) tak, by wołał ten URL.\n2. Podmień węzeł AI na provider + dodaj bazę wiedzy FAQ w promptcie.\n3. Podmień "Odpowiedz na kanale" na węzeł Telegram/WhatsApp.',
    triggerNode: webhookTrigger('Wiadomość od klienta (Webhook)', 'bot-faq', 0),
    steps: [
      aiHttpNode('AI: wygeneruj odpowiedź z FAQ', 'Model odpowiada na podstawie bazy FAQ w prompt/kontekście.'),
      httpNode('Odpowiedz na kanale', 'POST', 'https://api.telegram.org/botYOUR_TOKEN/sendMessage', 'Podmień na natywny węzeł Telegram/WhatsApp.'),
      respondWebhook('Odpowiedz webhookowi', 0),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '11-obsluga-kategoryzacja-zgloszen.json',
    name: 'Kategoryzacja i priorytetyzacja zgłoszeń',
    category: 'obsluga',
    setupNote:
      '## Kategoryzacja zgłoszeń\n\n**Trigger:** Webhook z formularza zgłoszeniowego / helpdesku.\n\n**Do zrobienia:**\n1. Podmień "Zapisz w helpdesku" na realny system (Zendesk/Freshdesk/inny).\n2. Dostosuj kategorie i priorytety do swojego zespołu.',
    triggerNode: webhookTrigger('Nowe zgłoszenie (Webhook)', 'zgloszenie-nowe', 0),
    steps: [
      aiHttpNode('AI: kategoria i priorytet', 'Model zwraca kategorię (techniczne/sprzedaż/inne) i priorytet (niski/średni/wysoki).'),
      httpNode('Zapisz w helpdesku', 'POST', 'https://YOUR-HELPDESK.example.com/api/tickets', 'Podmień na Zendesk/Freshdesk/inny.'),
      slackNode('Powiadom zespół', 'Nowe zgłoszenie [{{$json.priority}}]: {{$json.subject}}'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '12-obsluga-tlumaczenie-streszczanie.json',
    name: 'Tłumaczenie i streszczanie zgłoszeń',
    category: 'obsluga',
    setupNote:
      '## Tłumaczenie i streszczanie\n\n**Trigger:** Webhook z systemu zgłoszeń.\n\n**Do zrobienia:**\n1. Podmień węzeł AI na swój provider.\n2. Podmień "Wyślij streszczenie" na kanał zespołu (Slack/e-mail/helpdesk komentarz).',
    triggerNode: webhookTrigger('Nowe zgłoszenie (Webhook)', 'zgloszenie-jezykowe', 0),
    steps: [
      aiHttpNode('AI: przetłumacz i streść', 'Model tłumaczy na polski i tworzy 2-3 zdaniowe streszczenie.'),
      slackNode('Wyślij streszczenie do zespołu', 'Streszczenie zgłoszenia:\n{{$json.aiResponse}}'),
    ],
  })
);

/* =========================================================
   4. OPERACJE I DOKUMENTY
   ========================================================= */

registry.push(
  buildWorkflow({
    fileName: '13-operacje-wystawianie-faktur.json',
    name: 'Wystawianie i wysyłka faktur',
    category: 'operacje',
    setupNote:
      '## Automatyczne faktury\n\n**Trigger:** Webhook — po opłaceniu zamówienia (np. z Stripe/systemu sprzedaży).\n\n**Do zrobienia:**\n1. Podmień "Wystaw fakturę" na API systemu księgowego (Fakturownia/iFirma/inny).\n2. Skonfiguruj SMTP do wysyłki maila z fakturą.',
    triggerNode: webhookTrigger('Zamówienie opłacone (Webhook)', 'zamowienie-oplacone', 0),
    steps: [
      setNode('Przygotuj dane faktury', [
        { name: 'client', value: '={{ $json.customerName }}' },
        { name: 'amount', value: '={{ $json.amount }}', type: 'number' },
      ]),
      httpNode('Wystaw fakturę', 'POST', 'https://YOUR-BILLING.example.com/api/invoices', 'Podmień na Fakturownia/iFirma/inny system księgowy.'),
      emailNode('Wyślij fakturę mailem', '={{ $json.email }}', 'Faktura za zamówienie', 'W załączeniu faktura za Twoje zamówienie. Dziękujemy!'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '14-operacje-ocr-dokumentow.json',
    name: 'OCR i ekstrakcja danych z dokumentów',
    category: 'operacje',
    setupNote:
      '## OCR dokumentów\n\n**Trigger:** Webhook — po przesłaniu pliku (skan/paragon/umowa).\n\n**Do zrobienia:**\n1. Podmień "OCR: odczytaj dokument" na Google Vision / AWS Textract / Azure Document Intelligence + klucz API.\n2. Podmień "Zapisz dane" na docelową bazę/arkusz.',
    triggerNode: webhookTrigger('Nowy dokument (Webhook)', 'dokument-nowy', 0),
    steps: [
      httpNode('OCR: odczytaj dokument', 'POST', 'https://vision.googleapis.com/v1/images:annotate', 'Podmień na Google Vision/AWS Textract/Azure Document Intelligence.'),
      codeNode('Wyciągnij pola', 'return [{ json: { text: $json.text || "" } }];'),
      httpNode('Zapisz dane', 'POST', 'https://YOUR-DB.example.com/api/documents', 'Podmień na docelową bazę/arkusz.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '15-operacje-uzupelnianie-arkuszy.json',
    name: 'Uzupełnianie arkuszy z formularzy i maili',
    category: 'operacje',
    setupNote:
      '## Auto-uzupełnianie arkusza\n\n**Trigger:** Webhook z formularza.\n\n**Do zrobienia:**\n1. Podmień "Dopisz wiersz" na węzeł Google Sheets (wybierz arkusz + zakres).\n2. Zmapuj pola w węźle Set do kolumn arkusza.',
    triggerNode: webhookTrigger('Nowe zgłoszenie formularza (Webhook)', 'formularz-nowy', 0),
    steps: [
      setNode('Zmapuj do kolumn', [
        { name: 'Data', value: '={{ $now }}' },
        { name: 'Imię', value: '={{ $json.name }}' },
        { name: 'Email', value: '={{ $json.email }}' },
      ]),
      node('n8n-nodes-base.googleSheets', 'Dopisz wiersz', { operation: 'append', sheetName: 'Arkusz1' }, 0, 4.4),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '16-operacje-alerty-magazynowe.json',
    name: 'Alerty o stanach magazynowych',
    category: 'operacje',
    setupNote:
      '## Alerty magazynowe\n\n**Trigger:** Schedule — codzienna kontrola stanów.\n\n**Do zrobienia:**\n1. Podmień "Pobierz stany magazynowe" na API Twojego systemu (Baselinker/Shopify/WMS).\n2. Ustaw próg minimalnego stanu w węźle IF.',
    triggerNode: scheduleTrigger('Codziennie 6:00', '0 6 * * *', 0),
    steps: [
      httpNode('Pobierz stany magazynowe', 'GET', 'https://YOUR-WMS.example.com/api/stock', 'Podmień na Baselinker/Shopify/WMS.'),
      ifNode('Stan poniżej progu?', '={{ $json.quantity }}', 'lt', 10),
      slackNode('Alert niskiego stanu', '📦 Niski stan magazynowy: {{$json.productName}} ({{$json.quantity}} szt.)'),
    ],
  })
);

/* =========================================================
   5. FINANSE
   ========================================================= */

registry.push(
  buildWorkflow({
    fileName: '17-finanse-kategoryzacja-transakcji.json',
    name: 'Kategoryzacja transakcji i wydatków',
    category: 'finanse',
    setupNote:
      '## Kategoryzacja transakcji\n\n**Trigger:** Schedule — codzienne pobranie nowych transakcji.\n\n**Do zrobienia:**\n1. Podmień "Pobierz transakcje" na API banku/systemu księgowego.\n2. Podmień "Zapisz kategorię" na docelową bazę/arkusz.',
    triggerNode: scheduleTrigger('Codziennie 5:00', '0 5 * * *', 0),
    steps: [
      httpNode('Pobierz transakcje', 'GET', 'https://YOUR-BANK.example.com/api/transactions', 'Podmień na API banku/systemu księgowego.'),
      aiHttpNode('AI: przypisz kategorię kosztów', 'Model klasyfikuje transakcję do kategorii (paliwo, biuro, marketing itd.).'),
      httpNode('Zapisz kategorię', 'POST', 'https://YOUR-ACCOUNTING.example.com/api/transactions/categorize', 'Podmień na docelową bazę/arkusz.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '18-finanse-przypomnienia-platnosci.json',
    name: 'Przypomnienia o nieopłaconych fakturach',
    category: 'finanse',
    setupNote:
      '## Przypomnienia o płatnościach\n\n**Trigger:** Schedule — codzienna kontrola.\n\n**Do zrobienia:**\n1. Podmień "Pobierz nieopłacone faktury" na API systemu księgowego.\n2. Dostosuj liczbę dni po terminie w węźle IF.',
    triggerNode: scheduleTrigger('Codziennie 9:00', '0 9 * * *', 0),
    steps: [
      httpNode('Pobierz nieopłacone faktury', 'GET', 'https://YOUR-BILLING.example.com/api/invoices?status=unpaid', 'Podmień na realny system księgowy.'),
      ifNode('Termin minął?', '={{ $json.daysOverdue }}', 'gt', 0),
      emailNode('Wyślij przypomnienie', '={{ $json.email }}', 'Przypomnienie o płatności', 'Faktura {{$json.number}} jest przeterminowana o {{$json.daysOverdue}} dni.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '19-finanse-raporty-miesieczne.json',
    name: 'Raporty finansowe na koniec miesiąca',
    category: 'finanse',
    setupNote:
      '## Raport finansowy miesięczny\n\n**Trigger:** Schedule — 1. dzień miesiąca.\n\n**Do zrobienia:**\n1. Podmień "Pobierz dane finansowe" na API systemu księgowego.\n2. Podmień odbiorcę raportu (Slack/e-mail) na właściwą osobę.',
    triggerNode: scheduleTrigger('1. dzień miesiąca 7:00', '0 7 1 * *', 0),
    steps: [
      httpNode('Pobierz dane finansowe', 'GET', 'https://YOUR-ACCOUNTING.example.com/api/summary', 'Podmień na realny system księgowy.'),
      aiHttpNode('AI: napisz podsumowanie', 'Model tworzy czytelne podsumowanie miesiąca z kluczowymi liczbami.'),
      emailNode('Wyślij raport', 'ceo@twojafirma.pl', 'Raport finansowy — miesiąc', '={{ $json.aiResponse }}'),
    ],
  })
);

/* =========================================================
   6. HR I REKRUTACJA
   ========================================================= */

registry.push(
  buildWorkflow({
    fileName: '20-hr-selekcja-cv.json',
    name: 'Wstępna selekcja CV',
    category: 'hr',
    setupNote:
      '## Selekcja CV\n\n**Trigger:** Webhook — po przesłaniu CV przez formularz rekrutacyjny.\n\n**Do zrobienia:**\n1. Podmień węzeł AI na swój provider.\n2. Podmień "Zapisz wynik" na ATS / arkusz rekrutacyjny.',
    triggerNode: webhookTrigger('Nowe CV (Webhook)', 'cv-nowe', 0),
    steps: [
      aiHttpNode('AI: dopasuj CV do wymagań', 'Model porównuje CV z opisem stanowiska i zwraca ocenę dopasowania.'),
      ifNode('Dopasowanie wysokie?', '={{ $json.matchScore }}', 'gte', 70),
      slackNode('Powiadom rekrutera', 'Dobre dopasowanie CV: {{$json.candidateName}} ({{$json.matchScore}}%)'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '21-hr-umawianie-rozmow.json',
    name: 'Automatyczne umawianie rozmów rekrutacyjnych',
    category: 'hr',
    setupNote:
      '## Umawianie rozmów rekrutacyjnych\n\n**Trigger:** Webhook — kandydat wybiera termin w formularzu.\n\n**Do zrobienia:**\n1. Podmień "Utwórz wydarzenie" na Google Calendar/Cal.com.\n2. Skonfiguruj SMTP do potwierdzenia.',
    triggerNode: webhookTrigger('Wybrano termin rozmowy (Webhook)', 'rozmowa-rekrutacyjna', 0),
    steps: [
      httpNode('Utwórz wydarzenie', 'POST', 'https://YOUR-CALENDAR.example.com/api/events', 'Podmień na Google Calendar/Cal.com.'),
      emailNode('Wyślij potwierdzenie', '={{ $json.email }}', 'Potwierdzenie rozmowy rekrutacyjnej', 'Twoja rozmowa została umówiona: {{$json.date}} {{$json.time}}.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '22-hr-onboarding.json',
    name: 'Onboarding nowych pracowników',
    category: 'hr',
    setupNote:
      '## Onboarding\n\n**Trigger:** Webhook — po zatrudnieniu (np. z ATS/HR systemu).\n\n**Do zrobienia:**\n1. Podmień "Utwórz konta w narzędziach" na API Twoich narzędzi (Google Workspace/Slack/inne).\n2. Dostosuj checklistę onboardingową.',
    triggerNode: webhookTrigger('Nowy pracownik (Webhook)', 'pracownik-nowy', 0),
    steps: [
      httpNode('Utwórz konta w narzędziach', 'POST', 'https://YOUR-IDENTITY.example.com/api/accounts', 'Podmień na Google Workspace/Slack/inne API.'),
      slackNode('Powiadom zespół HR', 'Nowy pracownik: {{$json.fullName}} — konta utworzone.'),
      emailNode('Wyślij checklistę onboardingową', '={{ $json.email }}', 'Witaj w zespole!', 'W załączeniu Twoja checklista pierwszego tygodnia.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '23-hr-chatbot.json',
    name: 'Chatbot HR',
    category: 'hr',
    setupNote:
      '## Chatbot HR\n\n**Trigger:** Webhook — podepnij pod Slack/Teams/wewnętrzny czat.\n\n**Do zrobienia:**\n1. Podmień węzeł AI na swój provider + dodaj politykę urlopową/regulamin do kontekstu.\n2. Podmień "Odpowiedz w kanale" na Slack/Teams node.',
    triggerNode: webhookTrigger('Pytanie pracownika (Webhook)', 'hr-pytanie', 0),
    steps: [
      aiHttpNode('AI: odpowiedz na podstawie polityk HR', 'Model odpowiada na podstawie regulaminu/polityki urlopowej w kontekście.'),
      slackNode('Odpowiedz w kanale', '={{ $json.aiResponse }}'),
    ],
  })
);

/* =========================================================
   7. ZAAWANSOWANE AI
   ========================================================= */

registry.push(
  buildWorkflow({
    fileName: '24-ai-agent-glosowy.json',
    name: 'Agent głosowy (recepcja AI)',
    category: 'ai',
    setupNote:
      '## Agent głosowy\n\n**Trigger:** Webhook — wywoływany przez Twilio (przychodzące połączenie).\n\n**Do zrobienia (wymaga dodatkowej infrastruktury):**\n1. Konto Twilio + numer telefonu, webhook połączenia wskazuje na ten URL.\n2. Speech-to-Text (np. Whisper API) do zamiany mowy na tekst.\n3. Węzeł AI generuje odpowiedź.\n4. Text-to-Speech (np. ElevenLabs/OpenAI TTS) do wygenerowania odpowiedzi głosowej zwracanej do Twilio (TwiML).\nTo najbardziej złożony workflow w katalogu — potraktuj jako szkielet do rozbudowy.',
    triggerNode: webhookTrigger('Połączenie przychodzące (Twilio Webhook)', 'agent-glosowy', 0),
    steps: [
      httpNode('Speech-to-Text', 'POST', 'https://api.openai.com/v1/audio/transcriptions', 'Podmień na Whisper API lub inny STT.'),
      aiHttpNode('AI: wygeneruj odpowiedź'),
      httpNode('Text-to-Speech', 'POST', 'https://api.elevenlabs.io/v1/text-to-speech', 'Podmień na ElevenLabs/OpenAI TTS.'),
      respondWebhook('Zwróć TwiML do Twilio', 0),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '25-ai-rag-chatbot.json',
    name: 'RAG chatbot na dokumentacji firmy',
    category: 'ai',
    setupNote:
      '## RAG chatbot\n\n**Trigger:** Webhook — pytanie użytkownika (strona/Slack/WhatsApp).\n\n**Do zrobienia (wymaga bazy wektorowej):**\n1. Osobny (jednorazowy) workflow do zaindeksowania dokumentów: podziel dokumenty na fragmenty, wygeneruj embeddingi, zapisz w bazie wektorowej (Pinecone/Supabase pgvector/Qdrant).\n2. Ten workflow: embedduj pytanie, wyszukaj najbliższe fragmenty, wyślij je jako kontekst do modelu.\n3. Podmień URL bazy wektorowej na swoją instancję.',
    triggerNode: webhookTrigger('Pytanie użytkownika (Webhook)', 'rag-pytanie', 0),
    steps: [
      httpNode('Embedduj pytanie', 'POST', 'https://api.openai.com/v1/embeddings', 'Wywołanie modelu embeddingów.'),
      httpNode('Szukaj w bazie wektorowej', 'POST', 'https://YOUR-VECTOR-DB.example.com/query', 'Podmień na Pinecone/Supabase pgvector/Qdrant.'),
      aiHttpNode('AI: odpowiedz na podstawie kontekstu', 'Model odpowiada wyłącznie na podstawie znalezionych fragmentów dokumentacji.'),
      respondWebhook('Zwróć odpowiedź', 0),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '26-ai-analiza-rozmow.json',
    name: 'Analiza rozmów sprzedażowych',
    category: 'ai',
    setupNote:
      '## Analiza rozmów sprzedażowych\n\n**Trigger:** Webhook — po zakończeniu nagrania rozmowy (z narzędzia typu Aircall/Twilio).\n\n**Do zrobienia:**\n1. Podmień "Transkrypcja" na Whisper API lub inny STT.\n2. Podmień "Zapisz ocenę" na CRM/arkusz coachingowy.',
    triggerNode: webhookTrigger('Nagranie zakończone (Webhook)', 'rozmowa-nagranie', 0),
    steps: [
      httpNode('Transkrypcja', 'POST', 'https://api.openai.com/v1/audio/transcriptions', 'Podmień na Whisper API lub inny STT.'),
      aiHttpNode('AI: oceń rozmowę', 'Model ocenia rozmowę pod kątem struktury, obiekcji i domknięcia sprzedaży.'),
      httpNode('Zapisz ocenę', 'POST', 'https://YOUR-CRM.example.com/api/calls/score', 'Podmień na CRM/arkusz coachingowy.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '27-ai-generowanie-ofert.json',
    name: 'Generowanie ofert i wycen',
    category: 'ai',
    setupNote:
      '## Generator ofert\n\n**Trigger:** Webhook — po zebraniu briefu od klienta (formularz/e-mail).\n\n**Do zrobienia:**\n1. Podmień węzeł AI na swój provider + dodaj cennik/szablon oferty do kontekstu.\n2. Podmień "Wygeneruj PDF" na narzędzie generujące PDF (np. PDF.co, Carbone).',
    triggerNode: webhookTrigger('Brief klienta (Webhook)', 'brief-oferta', 0),
    steps: [
      aiHttpNode('AI: wypełnij szablon oferty', 'Model wypełnia szablon oferty na podstawie briefu i cennika w kontekście.'),
      httpNode('Wygeneruj PDF', 'POST', 'https://YOUR-PDF-SERVICE.example.com/api/generate', 'Podmień na PDF.co/Carbone/inny generator PDF.'),
      emailNode('Wyślij ofertę', '={{ $json.email }}', 'Twoja oferta od STFS', 'W załączeniu przygotowana dla Ciebie oferta.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '28-ai-wykrywanie-anomalii.json',
    name: 'Wykrywanie anomalii w danych',
    category: 'ai',
    setupNote:
      '## Wykrywanie anomalii\n\n**Trigger:** Schedule — cogodzinna kontrola kluczowych metryk.\n\n**Do zrobienia:**\n1. Podmień "Pobierz metryki" na źródło danych (Analytics/CRM/sprzedaż).\n2. Dostosuj próg odchylenia w węźle IF do swoich danych historycznych.',
    triggerNode: scheduleTrigger('Co godzinę', '0 * * * *', 0),
    steps: [
      httpNode('Pobierz metryki', 'GET', 'https://YOUR-ANALYTICS.example.com/api/metrics', 'Podmień na Analytics/CRM/system sprzedaży.'),
      codeNode(
        'Oblicz odchylenie',
        "const deviation = Math.abs((($json.current || 0) - ($json.average || 1)) / ($json.average || 1)) * 100;\nreturn [{ json: { ...$json, deviation } }];"
      ),
      ifNode('Odchylenie > 30%?', '={{ $json.deviation }}', 'gt', 30),
      slackNode('Alert anomalii', '⚠️ Wykryto anomalię: {{$json.metricName}} odchylenie {{$json.deviation}}%'),
    ],
  })
);

/* =========================================================
   8. E-COMMERCE
   ========================================================= */

registry.push(
  buildWorkflow({
    fileName: '29-ecommerce-odpowiedzi-na-opinie.json',
    name: 'Automatyczne odpowiedzi na opinie',
    category: 'ecommerce',
    setupNote:
      '## Odpowiedzi na opinie\n\n**Trigger:** Webhook — nowa opinia (Google/sklep/Allegro).\n\n**Do zrobienia:**\n1. Podepnij realne źródło opinii pod webhook (lub Schedule + pobieranie przez API platformy).\n2. Podmień "Opublikuj odpowiedź" na API platformy z opiniami.',
    triggerNode: webhookTrigger('Nowa opinia (Webhook)', 'opinia-nowa', 0),
    steps: [
      aiHttpNode('AI: napisz odpowiedź na opinię', 'Model dobiera ton odpowiedzi do sentymentu opinii.'),
      httpNode('Opublikuj odpowiedź', 'POST', 'https://YOUR-PLATFORM.example.com/api/reviews/reply', 'Podmień na API platformy z opiniami.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '30-ecommerce-opisy-produktow.json',
    name: 'Dynamiczne opisy produktów pod SEO',
    category: 'ecommerce',
    setupNote:
      '## Generator opisów produktów\n\n**Trigger:** Webhook — nowy produkt dodany do sklepu.\n\n**Do zrobienia:**\n1. Podepnij webhook nowego produktu (Shopify/WooCommerce/inny).\n2. Podmień "Zapisz opis" na aktualizację produktu w sklepie.',
    triggerNode: webhookTrigger('Nowy produkt (Webhook)', 'produkt-nowy', 0),
    steps: [
      aiHttpNode('AI: wygeneruj opis SEO', 'Model generuje opis produktu na podstawie atrybutów (nazwa, kategoria, cechy).'),
      httpNode('Zapisz opis w sklepie', 'PUT', 'https://YOUR-SHOP.example.com/api/products/update', 'Podmień na Shopify/WooCommerce/inny.'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '31-ecommerce-porzucone-koszyki.json',
    name: 'Przypomnienia o porzuconym koszyku',
    category: 'ecommerce',
    setupNote:
      '## Porzucone koszyki\n\n**Trigger:** Schedule — sprawdza koszyki porzucone 1h+ temu.\n\n**Do zrobienia:**\n1. Podmień "Pobierz porzucone koszyki" na API sklepu (Shopify/WooCommerce).\n2. Skonfiguruj SMTP do wysyłki przypomnienia.',
    triggerNode: scheduleTrigger('Co godzinę', '0 * * * *', 0),
    steps: [
      httpNode('Pobierz porzucone koszyki', 'GET', 'https://YOUR-SHOP.example.com/api/carts/abandoned', 'Podmień na Shopify/WooCommerce API.'),
      aiHttpNode('AI: napisz spersonalizowaną wiadomość'),
      emailNode('Wyślij przypomnienie', '={{ $json.email }}', 'Zostawiłeś/aś coś w koszyku', '={{ $json.aiResponse }}'),
    ],
  })
);

registry.push(
  buildWorkflow({
    fileName: '32-ecommerce-monitoring-cen.json',
    name: 'Monitoring cen konkurencji',
    category: 'ecommerce',
    setupNote:
      '## Monitoring cen konkurencji\n\n**Trigger:** Schedule — codzienne sprawdzenie.\n\n**Do zrobienia:**\n1. Podmień "Pobierz ceny konkurencji" na własny scraper/API (uważaj na regulaminy stron — rozważ oficjalne API porównywarek).\n2. Ustaw próg różnicy cenowej w węźle IF.',
    triggerNode: scheduleTrigger('Codziennie 6:00', '0 6 * * *', 0),
    steps: [
      httpNode('Pobierz ceny konkurencji', 'GET', 'https://YOUR-PRICE-SOURCE.example.com/api/prices', 'Podmień na własny scraper/API porównywarki cen — sprawdź regulamin źródła.'),
      codeNode(
        'Porównaj z własną ceną',
        "const diffPct = ((($json.ownPrice || 0) - ($json.competitorPrice || 1)) / ($json.competitorPrice || 1)) * 100;\nreturn [{ json: { ...$json, diffPct } }];"
      ),
      ifNode('Różnica > 10%?', '={{ $json.diffPct }}', 'gt', 10),
      slackNode('Alert cenowy', '💰 {{$json.productName}}: Twoja cena różni się o {{$json.diffPct}}% od konkurencji.'),
    ],
  })
);

/* =========================================================
   README
   ========================================================= */

const grouped = registry.reduce((acc, w) => {
  acc[w.category] = acc[w.category] || [];
  acc[w.category].push(w);
  return acc;
}, {});

const categoryLabels = {
  sprzedaz: 'Sprzedaż i leady',
  marketing: 'Marketing',
  obsluga: 'Obsługa klienta',
  operacje: 'Operacje i dokumenty',
  finanse: 'Finanse',
  hr: 'HR i rekrutacja',
  ai: 'Zaawansowane AI',
  ecommerce: 'E-commerce',
};

let readme = `# Katalog automatyzacji STFS — workflowy n8n\n\n32 gotowe do importu szkielety workflowów n8n, po jednym na każdy proces z katalogu automatyzacji na stronie STFS.\n\n## Jak zaimportować\n\n1. Otwórz n8n → **Workflows → Import from File**.\n2. Wybierz plik \`.json\` z tego folderu.\n3. Workflow pojawi się z żółtą **notatką (sticky note)** u góry — opisuje, co trzeba podmienić/skonfigurować (klucze API, konta, realne endpointy).\n4. Podmień placeholdery (adresy \`YOUR-...\`, klucze AI) na realne dane i włącz workflow.\n\n## Ważne\n\n- Wszystkie kroki HTTP/AI to **szkielety** — placeholder URL-e (\`https://YOUR-....example.com\`) trzeba podmienić na realne konta/API.\n- Węzeł "AI: ..." domyślnie woła OpenAI Chat Completions — podmień na swojego dostawcę (OpenAI/Claude/inny) i dodaj klucz w Headers albo użyj natywnego węzła AI w n8n.\n- Workflowy w kategorii **Zaawansowane AI** (agent głosowy, RAG) wymagają dodatkowej infrastruktury (Twilio, baza wektorowa) — potraktuj je jako punkt startowy, nie gotowe rozwiązanie plug-and-play.\n- Żadne hasła/klucze nie są w plikach — musisz je wpisać sam w panelu n8n (Credentials).\n- Węzły **IF** mają podłączoną tylko gałąź "true" (dalszy ciąg workflow). Gałąź "false" (np. "lead niegorący", "brak anomalii") zostaw pustą albo podepnij własną ścieżkę (np. inny kanał powiadomień) — w edytorze n8n przeciągnij z drugiego wyjścia węzła IF.\n\n## Lista workflowów\n\n`;

readme = readme.replace('## Lista workflowów\n\n', '');
readme += `## Bezpieczeństwo przed aktywacją\n\n- Każdy webhook wymaga **Header Auth**. Utwórz osobny credential z długim, losowym tokenem i przypisz go do węzła przed aktywacją.\n- Nie umieszczaj tokenu webhooka ani klucza AI w kodzie strony, pliku workflow ani repozytorium. Zapisuj je jako Credentials w n8n.\n- Formularze i publiczne chatboty muszą wołać własny backend/gateway, który weryfikuje CAPTCHA, ogranicza liczbę żądań i dopiero potem wywołuje chroniony webhook n8n.\n- Dla Stripe, Twilio i podobnych dostawców weryfikuj podpis wiadomości na surowym body; nie zastępuj tej kontroli nagłówkiem z przeglądarki.\n- Przed skutkiem ubocznym waliduj typy, zakresy i uprawnienia danych na serwerze. Kwoty oraz statusy płatności pobieraj z zaufanego systemu źródłowego, nigdy z payloadu klienta.\n\n## Lista workflowów\n\n`;

for (const [cat, items] of Object.entries(grouped)) {
  readme += `### ${categoryLabels[cat]}\n\n`;
  items.forEach((w) => {
    readme += `- **${w.name}** — \`${w.fileName}\`\n`;
  });
  readme += '\n';
}

fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme, 'utf8');

console.log(`Wygenerowano ${registry.length} workflowów + README.md`);
