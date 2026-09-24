// Wspólna biblioteka do budowania workflowów n8n (STFS).
// Używana przez: generate.js, generate-site-chatbot.js, generate-review-responder.js
//
// Najważniejsze zasady, które ta biblioteka wymusza:
//  - deterministyczne ID węzłów (ten sam plik JSON przy każdym uruchomieniu -> czysty git diff),
//  - każde wyrażenie n8n zaczyna się od "=" (inaczej n8n wyśle tekst {{ ... }} dosłownie),
//  - webhook z węzłem "Respond to Webhook" automatycznie dostaje responseMode = responseNode,
//  - krok AI = 3 węzły: przygotuj prompt -> wywołaj model -> odczytaj wynik i połącz z danymi wejściowymi,
//  - dane z webhooka są walidowane i "spłaszczane" (body -> $json),
//  - wszystkie wartości do podmiany siedzą w jednym węźle "Konfiguracja",
//  - HTTP ma credential (Header Auth), timeout i ponawianie,
//  - gałęzie IF są jawne (także "fałsz"), strefa czasowa Europe/Warsaw.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULTS = {
  fromEmail: 'kontakt@stfs.pl',
  slackChannel: '#automatyzacje',
  aiUrl: 'https://api.openai.com/v1/chat/completions',
  aiModel: 'gpt-4o-mini',
  timezone: 'Europe/Warsaw',
};

let CURRENT = null; // nazwa pliku budowanego workflow (ziarno dla ID)

function detId(seed) {
  const h = crypto.createHash('sha1').update(`${CURRENT}::${seed}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function node(type, name, parameters, typeVersion = 1, extra = {}) {
  return { name, type, typeVersion, parameters, ...extra };
}

/* ---------------- odwołania do innych węzłów ---------------- */
const ref = (nodeName, field) => `$('${nodeName}').item.json${field ? '.' + field : ''}`;
const cfg = (key) => `$('Konfiguracja').first().json.${key}`;
const INPUT = 'Walidacja danych';

/* ---------------- triggery ---------------- */
function webhook(name, webhookPath, opts = {}) {
  const options = {};
  if (opts.allowedOrigins) options.allowedOrigins = opts.allowedOrigins;
  return node(
    'n8n-nodes-base.webhook',
    name,
    {
      httpMethod: opts.method || 'POST',
      path: webhookPath,
      authentication: opts.auth === false ? 'none' : 'headerAuth',
      responseMode: 'onReceived', // poprawiane automatycznie w build(), jeśli jest węzeł Respond
      options,
    },
    2,
    { webhookId: null, _auth: opts.auth !== false }
  );
}

function schedule(name, cron) {
  return node('n8n-nodes-base.scheduleTrigger', name, { rule: { interval: [{ field: 'cronExpression', expression: cron }] } }, 1.2);
}

function manual(name) {
  return node('n8n-nodes-base.manualTrigger', name, {}, 1);
}

function telegramTrigger(name) {
  return node('n8n-nodes-base.telegramTrigger', name, { updates: ['message'], additionalFields: {} }, 1.1, { webhookId: null });
}

function rssRead(name, urlExpr) {
  return node('n8n-nodes-base.rssFeedRead', name, { url: urlExpr, options: {} }, 1.1, { ...RETRY_LATE });
}

function sheetsRead(name, docUrlExpr, sheetExpr) {
  return node('n8n-nodes-base.googleSheets', name, {
    operation: 'read',
    documentId: { __rl: true, mode: 'url', value: docUrlExpr },
    sheetName: { __rl: true, mode: 'name', value: sheetExpr },
    options: {},
  }, 4.4, { ...RETRY_LATE, _cred: 'Google Sheets OAuth2' });
}

function sheetsUpdate(name, docUrlExpr, sheetExpr, values, matchOn) {
  return node('n8n-nodes-base.googleSheets', name, {
    operation: 'update',
    documentId: { __rl: true, mode: 'url', value: docUrlExpr },
    sheetName: { __rl: true, mode: 'name', value: sheetExpr },
    columns: { mappingMode: 'defineBelow', value: values, matchingColumns: [matchOn], schema: [] },
    options: {},
  }, 4.4, { ...RETRY_LATE, _cred: 'Google Sheets OAuth2' });
}

function gmailTrigger(name) {
  return node('n8n-nodes-base.gmailTrigger', name, {
    pollTimes: { item: [{ mode: 'everyMinute' }] },
    simple: false,
    filters: { labelIds: ['INBOX'], readStatus: 'unread' },
    options: {},
  }, 1.2, { _trigCred: 'Gmail OAuth2' });
}

function gmailDraft(name, to, subject, message, threadId) {
  return node('n8n-nodes-base.gmail', name, {
    resource: 'draft',
    subject,
    emailType: 'text',
    message,
    options: { threadId, sendTo: to },
  }, 2.1, { ...RETRY, _cred: 'Gmail OAuth2' });
}

// Odczekanie (np. 3 dni po zamówieniu). Workflow "śpi" w n8n i wznawia się sam.
function waitTime(name, amountExpr, unit = 'days') {
  return node('n8n-nodes-base.wait', name, { resume: 'timeInterval', amount: amountExpr, unit }, 1.1, { webhookId: null });
}

function errorTrigger(name) {
  return node('n8n-nodes-base.errorTrigger', name, {}, 1);
}

/* ---------------- węzły pomocnicze ---------------- */
function code(name, jsCode, perItem = true) {
  const parameters = perItem ? { mode: 'runOnceForEachItem', jsCode } : { jsCode };
  return node('n8n-nodes-base.code', name, parameters, 2);
}

// Walidacja danych z webhooka: bierze body, sprawdza wymagane pola, przycina teksty, sprawdza e-mail.
function inputValidation(required = []) {
  const js = `// Dane z webhooka są w $json.body - spłaszczamy je, żeby dalej używać $json.pole
const src = $json.body && typeof $json.body === 'object' ? $json.body : $json;
const required = ${JSON.stringify(required)};
const missing = required.filter((k) => src[k] === undefined || src[k] === null || String(src[k]).trim() === '');
if (missing.length) {
  throw new Error('Brak wymaganych pól: ' + missing.join(', '));
}
const clean = {};
for (const [k, v] of Object.entries(src)) {
  clean[k] = typeof v === 'string' ? v.trim().slice(0, 5000) : v;
}
if (clean.email !== undefined && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(clean.email))) {
  throw new Error('Niepoprawny adres e-mail');
}
return { json: { ...clean, _odebrano: new Date().toISOString() } };`;
  return code(INPUT, js);
}

// Węzeł "Konfiguracja" - jedyne miejsce, w którym podmienia się adresy, progi i odbiorców.
function config(values) {
  return node(
    'n8n-nodes-base.set',
    'Konfiguracja',
    {
      mode: 'manual',
      assignments: {
        assignments: Object.entries(values).map(([k, v]) => ({
          id: detId('cfg:' + k),
          name: k,
          value: v,
          type: typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string',
        })),
      },
      includeOtherFields: true,
      options: {},
    },
    3.4
  );
}

function set(name, fields, includeOther = false) {
  return node(
    'n8n-nodes-base.set',
    name,
    {
      mode: 'manual',
      assignments: {
        assignments: fields.map((f) => ({ id: detId(name + ':' + f.name), name: f.name, value: f.value, type: f.type || 'string' })),
      },
      includeOtherFields: includeOther,
      options: {},
    },
    3.4
  );
}

// IF. ops: gte, gt, lt, lte, equals, notEquals (number/string), true (boolean)
function ifNode(name, left, operation, right, type) {
  const t = type || (typeof right === 'number' ? 'number' : operation === 'true' || operation === 'false' ? 'boolean' : 'string');
  const operator = { type: t, operation };
  const cond = { id: detId('if:' + name), leftValue: left, operator };
  if (operation === 'true' || operation === 'false' || operation === 'notEmpty' || operation === 'empty') {
    operator.singleValue = true;
    cond.rightValue = '';
  } else {
    cond.rightValue = right;
  }
  return node(
    'n8n-nodes-base.if',
    name,
    {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [cond],
        combinator: 'and',
      },
      options: {},
    },
    2
  );
}

const RETRY = { retryOnFail: true, maxTries: 3, waitBetweenTries: 2000 };
var RETRY_LATE = RETRY; // alias dla funkcji zdefiniowanych wyżej w pliku

// HTTP z uwierzytelnieniem przez credential (nigdy klucz w pliku).
// auth: 'header' (Header Auth), 'none', albo { predefined: 'googleAdsOAuth2Api' }
function http(name, method, url, opts = {}) {
  const p = { method, url };
  const auth = opts.auth === undefined ? 'header' : opts.auth;
  if (auth === 'header') {
    p.authentication = 'genericCredentialType';
    p.genericAuthType = 'httpHeaderAuth';
  } else if (auth && auth.predefined) {
    p.authentication = 'predefinedCredentialType';
    p.nodeCredentialType = auth.predefined;
  } else {
    p.authentication = 'none';
  }
  if (opts.headers) {
    p.sendHeaders = true;
    p.headerParameters = { parameters: Object.entries(opts.headers).map(([n, v]) => ({ name: n, value: v })) };
  }
  if (opts.multipart) {
    p.sendBody = true;
    p.contentType = 'multipart-form-data';
    p.bodyParameters = { parameters: opts.multipart };
  } else if (method !== 'GET') {
    p.sendBody = true;
    p.specifyBody = 'json';
    p.jsonBody = opts.body || '={{ JSON.stringify($json) }}';
  }
  p.options = { timeout: opts.timeout || 30000 };
  if (opts.file) p.options.response = { response: { responseFormat: 'file' } };
  if (opts.batch) p.options.batching = { batch: { batchSize: 1, batchInterval: 500 } };
  if (opts.fullResponse) p.options.response = { response: { fullResponse: true, neverError: true } };
  return node('n8n-nodes-base.httpRequest', name, p, 4.2, {
    ...(opts.retry === false ? {} : RETRY),
    ...(opts.continueOnFail ? { onError: 'continueRegularOutput' } : {}),
    notes: opts.note || '',
    notesInFlow: Boolean(opts.note),
    _cred: auth === 'header' ? 'Header Auth' : auth && auth.predefined ? auth.predefined : null,
  });
}

// Krok AI = 3 węzły. Wynik (pola z `outputs`) jest dołączany do danych wejściowych,
// więc kolejne węzły mają dostęp i do danych klienta, i do odpowiedzi modelu.
// label -> nazwy: "AI: prompt (label)", "AI: label", "AI: wynik (label)"
function ai(label, { system, user, outputs, numeric = {}, maxTokens = 600, context = true }) {
  const prep = `AI: prompt (${label})`;
  const call = `AI: ${label}`;
  const res = `AI: wynik (${label})`;
  const fieldsDesc = Object.entries(outputs).map(([k, d]) => `"${k}": ${d}`).join(', ');
  const sys = `${system}\n\nOdpowiedz WYŁĄCZNIE poprawnym obiektem JSON z polami: {${fieldsDesc}}. Nie wymyślaj faktów, cen ani danych, których nie ma w treści.`;
  const prepJs = `const SYSTEM = ${JSON.stringify(sys)};
const user = ${user};
return {
  json: {
    ...$json,
    _aiRequest: {
      model: ${cfgOr('modelAI', DEFAULTS.aiModel)},
      max_tokens: ${maxTokens},
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: String(user).slice(0, 12000) },
      ],
    },
  },
};`;
  const defaults = {};
  for (const k of Object.keys(outputs)) defaults[k] = numeric[k] ? numeric[k].fallback : '';
  const clampLines = Object.entries(numeric)
    .map(([k, r]) => `out.${k} = Math.max(${r.min}, Math.min(${r.max}, Number(out.${k})));\nif (!Number.isFinite(out.${k})) out.${k} = ${r.fallback};`)
    .join('\n');
  const resJs = `// Łączymy dane wejściowe (sprzed wywołania AI) z odpowiedzią modelu.
const ctx = { ...${context ? `$('${prep}').item.json` : '{}'} };
delete ctx._aiRequest;
let out = {};
let aiError = '';
try {
  const raw = $json.choices?.[0]?.message?.content ?? '';
  out = JSON.parse(raw);
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error('to nie obiekt');
} catch (e) {
  aiError = 'Nie udało się odczytać odpowiedzi AI: ' + e.message;
  out = {};
}
const defaults = ${JSON.stringify(defaults)};
for (const [k, v] of Object.entries(defaults)) if (out[k] === undefined || out[k] === null) out[k] = v;
for (const [k, v] of Object.entries(out)) if (typeof v === 'string') out[k] = v.slice(0, 4000);
${clampLines}
return { json: { ...ctx, ...out, _aiOk: !aiError, _aiError: aiError } };`;
  return [
    code(prep, prepJs),
    http(call, 'POST', DEFAULTS.aiUrl, {
      body: '={{ JSON.stringify($json._aiRequest) }}',
      timeout: 60000,
      note: 'Credential Header Auth: Authorization = Bearer <klucz OpenAI>. Można podmienić na Claude/inny model.',
    }),
    code(res, resJs),
  ];
}
function cfgOr(key, fallback) {
  return `($('Konfiguracja').first().json.${key} || ${JSON.stringify(fallback)})`;
}

// "\n" wpisane w generatorze poza {{ }} zamieniamy na prawdziwą nową linię
// (n8n nie interpretuje \n w zwykłym tekście); wewnątrz {{ }} zostaje jako kod JS.
function nl(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/(\{\{[\s\S]*?\}\})|\\n/g, (m, expr) => (expr ? expr : '\n'));
}

function slack(name, text) {
  text = nl(text);
  return node(
    'n8n-nodes-base.slack',
    name,
    {
      select: 'channel',
      channelId: { __rl: true, mode: 'name', value: `={{ ${cfgOr('kanalSlack', DEFAULTS.slackChannel)} }}` },
      text,
      otherOptions: { includeLinkToWorkflow: false },
    },
    2.2,
    { ...RETRY, _cred: 'Slack' }
  );
}

function email(name, to, subject, text) {
  text = nl(text);
  subject = nl(subject);
  return node(
    'n8n-nodes-base.emailSend',
    name,
    {
      fromEmail: `={{ ${cfgOr('nadawcaEmail', DEFAULTS.fromEmail)} }}`,
      toEmail: to,
      subject,
      emailFormat: 'text',
      text,
      options: { appendAttribution: false },
    },
    2.1,
    { ...RETRY, _cred: 'SMTP' }
  );
}

function telegram(name, chatId, text) {
  return node(
    'n8n-nodes-base.telegram',
    name,
    { chatId, text, additionalFields: { appendAttribution: false } },
    1.2,
    { ...RETRY, _cred: 'Telegram' }
  );
}

function splitOut(name, field) {
  return node('n8n-nodes-base.splitOut', name, { fieldToSplitOut: field, options: {} }, 1);
}

function respond(name, body, { code: status = 200, text = false, contentType } = {}) {
  const options = { responseCode: status };
  if (contentType) options.responseHeaders = { entries: [{ name: 'Content-Type', value: contentType }] };
  return node(
    'n8n-nodes-base.respondToWebhook',
    name,
    { respondWith: text ? 'text' : 'json', responseBody: body, options },
    1.1
  );
}

function noOp(name) {
  return node('n8n-nodes-base.noOp', name, {}, 1);
}

// Zatwierdzenie przez człowieka: workflow czeka, aż właściciel wypełni formularz (link w e-mailu).
// Formularz wymaga kliknięcia "Wyślij" - skanery linków w poczcie nie zatwierdzą niczego same.
function approvalWait(name, title, description, hours = 72, poleTekstowe = 'Poprawiona treść') {
  return node(
    'n8n-nodes-base.wait',
    name,
    {
      resume: 'form',
      formTitle: title,
      formDescription: description,
      formFields: {
        values: [
          {
            fieldLabel: 'Decyzja',
            fieldType: 'dropdown',
            fieldOptions: { values: [{ option: 'Zatwierdź' }, { option: 'Odrzuć' }] },
            requiredField: true,
          },
          { fieldLabel: poleTekstowe, fieldType: 'textarea', requiredField: false },
        ],
      },
      limitWaitTime: true,
      limitType: 'afterTimeInterval',
      resumeAmount: hours,
      resumeUnit: 'hours',
      options: {},
    },
    1.1
  );
}

// Ochrona przed podwójnym przetworzeniem (np. ponowny webhook = druga faktura).
// Filtr przepuszcza tylko nowe klucze; "zapamiętaj" wywołuj PO udanej akcji.
// Pamięć: $getWorkflowStaticData - działa w aktywnym (produkcyjnym) workflow.
function seenFilter(name, ns, keyExpr, ttlDays = 30) {
  const js = `const store = $getWorkflowStaticData('global');
store[${JSON.stringify(ns)}] = store[${JSON.stringify(ns)}] || {};
const seen = store[${JSON.stringify(ns)}];
const now = Date.now();
const ttl = ${ttlDays} * 86400000;
for (const [k, t] of Object.entries(seen)) if (now - t > ttl) delete seen[k];
const out = [];
$input.all().forEach((item, index) => {
  const key = String(${keyExpr.replace(/\$json/g, 'item.json')} ?? '');
  if (!key || seen[key]) return; // brak klucza albo już obsłużone -> pomiń
  // pairedItem zachowuje powiązanie z danymi wejściowymi (potrzebne dla odwołań .item w kolejnych węzłach)
  out.push({ json: item.json, binary: item.binary, pairedItem: { item: index } });
});
return out;`;
  return code(name, js, false);
}
function seenMark(name, ns, keyExpr, fromNode) {
  const src = fromNode ? `$('${fromNode}').item.json` : '$json';
  const js = `const store = $getWorkflowStaticData('global');
store[${JSON.stringify(ns)}] = store[${JSON.stringify(ns)}] || {};
const src = ${src};
const key = String(${keyExpr.replace(/\$json/g, 'src')} ?? '');
if (key) store[${JSON.stringify(ns)}][key] = Date.now();
return { json: $json };`;
  return code(name, js);
}

/* ---------------- struktura: sekwencje i rozgałęzienia ---------------- */
// branch(ifNode, [kroki gdy prawda], [kroki gdy fałsz])
function branch(ifN, whenTrue, whenFalse) {
  return { __branch: true, ifN, whenTrue: whenTrue || [], whenFalse: whenFalse || [] };
}

const X_STEP = 260;
const Y_BASE = 300;
const Y_BRANCH = 220;

function build({ fileName, name, note, trigger, steps, outDir, settings = {} }) {
  CURRENT = fileName;
  const nodes = [];
  const connections = {};
  let yUsed = Y_BASE;

  const connect = (a, out, b) => {
    connections[a.name] = connections[a.name] || { main: [] };
    while (connections[a.name].main.length <= out) connections[a.name].main.push([]);
    connections[a.name].main[out].push({ node: b.name, type: 'main', index: 0 });
  };
  const flat = (arr) => arr.flat(Infinity);
  const place = (seq, x, y, prev, prevOut) => {
    yUsed = Math.max(yUsed, y);
    for (const el of flat(seq)) {
      if (el.__branch) {
        el.ifN.position = [x, y];
        nodes.push(el.ifN);
        if (prev) connect(prev, prevOut, el.ifN);
        place(el.whenTrue, x + X_STEP, y, el.ifN, 0);
        const falseSteps = el.whenFalse.length ? el.whenFalse : [];
        if (falseSteps.length) place(falseSteps, x + X_STEP, yUsed + Y_BRANCH, el.ifN, 1);
        return;
      }
      el.position = [x, y];
      nodes.push(el);
      if (prev) connect(prev, prevOut, el);
      prev = el;
      prevOut = 0;
      x += X_STEP;
    }
  };
  place([trigger, ...steps], 80, Y_BASE, null, 0);

  // Nazwy muszą być unikalne
  const names = new Set();
  for (const n of nodes) {
    if (names.has(n.name)) throw new Error(`${fileName}: zduplikowana nazwa węzła "${n.name}"`);
    names.add(n.name);
  }

  // Webhook z węzłem Respond -> responseMode responseNode
  const hasRespond = nodes.some((n) => n.type === 'n8n-nodes-base.respondToWebhook');
  if (trigger.type === 'n8n-nodes-base.webhook') {
    trigger.parameters.responseMode = hasRespond ? 'responseNode' : 'onReceived';
  }

  // Lista credentiali do notatki
  const creds = new Map();
  if (trigger._auth) creds.set('Header Auth (webhook)', trigger.name);
  if (trigger.type === 'n8n-nodes-base.telegramTrigger') creds.set('Telegram', trigger.name);
  if (trigger._trigCred) creds.set(trigger._trigCred, trigger.name);
  for (const n of nodes) if (n._cred) creds.set(n._cred === 'Header Auth' ? 'Header Auth (API)' : n._cred, (creds.get(n._cred) ? creds.get(n._cred) + ', ' : '') + n.name);

  for (const n of nodes) {
    n.id = detId('node:' + n.name);
    if ('webhookId' in n) n.webhookId = detId('webhook:' + n.name);
    delete n._cred;
    delete n._auth;
    delete n._trigCred;
    if (n.notes === '') { delete n.notes; delete n.notesInFlow; }
  }

  const credList = [...creds.keys()].map((c) => `- ${c}`).join('\n');
  const noteText = `${note}\n\n## Credentials do utworzenia\n${credList || '- brak'}\n\n## Przed aktywacją\n1. Uzupełnij węzeł **Konfiguracja** (adresy \`YOUR-...\`, progi, odbiorcy).\n2. Przypisz credentiale do węzłów (lista wyżej).\n3. Ustaw workflow **00 – Obsługa błędów** jako Error Workflow (Settings).\n4. Przetestuj na danych testowych (Test workflow), dopiero potem aktywuj.`;
  const sticky = {
    id: detId('sticky'),
    name: 'Notatka: konfiguracja',
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    position: [80, Y_BASE - 560],
    parameters: { content: noteText, height: 520, width: 560, color: 4 },
  };

  const workflow = {
    name: `STFS — ${name}`,
    nodes: [sticky, ...nodes],
    connections,
    active: false,
    settings: {
      executionOrder: 'v1',
      timezone: DEFAULTS.timezone,
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
      executionTimeout: 300,
      ...settings,
    },
    meta: { generatedBy: 'stfs n8n-workflows generator', templateCredsSetupCompleted: false },
  };
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(workflow, null, 2) + '\n', 'utf8');
  return workflow;
}

module.exports = {
  DEFAULTS, ref, cfg, INPUT,
  webhook, schedule, manual, telegramTrigger, errorTrigger, gmailTrigger, gmailDraft, waitTime, rssRead, sheetsRead, sheetsUpdate,
  code, inputValidation, config, set, ifNode, http, ai, slack, email, telegram,
  splitOut, respond, noOp, approvalWait, seenFilter, seenMark, branch, build,
};
