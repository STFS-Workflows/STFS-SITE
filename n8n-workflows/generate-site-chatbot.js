// Generates the production n8n workflow behind the live chat widget on stfs/index.html.
// The STFS knowledge base is small (10 short chunks), so instead of a vector DB + RAG
// pipeline, the whole knowledge base is stuffed directly into the system prompt on every
// request — same answer quality, one fewer external service to set up and pay for.
// Run: node generate-site-chatbot.js
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const OUT_DIR = __dirname;
let Y_BASE = 300;

function node(type, name, parameters, x, typeVersion = 1, extra = {}) {
  return { id: randomUUID(), name, type, typeVersion, position: [x, Y_BASE], parameters, ...extra };
}

function stickyNote(text, x, width = 460, height = 380, yOffset = -420) {
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
  return node('n8n-nodes-base.webhook', name, { httpMethod: 'POST', path: webhookPath, responseMode: 'responseNode', options: {} }, x, 2);
}

function codeNode(name, jsCode, x) {
  return node('n8n-nodes-base.code', name, { jsCode }, x, 2);
}

function httpNode(name, method, url, note, x, bodyOverride, headerParams) {
  const params = { method, url, sendBody: method !== 'GET', specifyBody: 'json', jsonBody: bodyOverride || '={{ JSON.stringify($json) }}', options: {} };
  if (headerParams) {
    params.sendHeaders = true;
    params.headerParameters = { parameters: headerParams };
  }
  return node('n8n-nodes-base.httpRequest', name, params, x, 4.2, { notes: note });
}

function respondWebhook(name, x) {
  return node('n8n-nodes-base.respondToWebhook', name, { respondWith: 'json', responseBody: '={{ { "answer": $json.answer } }}', options: {} }, x, 1.1);
}

function buildWorkflow({ fileName, name, setupNote, nodes, noteWidth, noteHeight }) {
  const chain = nodes;
  chain.forEach((n, i) => { n.position = [80 + i * 320, Y_BASE]; });
  const note = stickyNote(setupNote, 80, noteWidth, noteHeight);

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
  console.log('napisano', fileName, 'nodes:', chain.length);
}

/* =========================================================
   Baza wiedzy STFS — jeden string, wklejany do promptu
   ========================================================= */

const knowledgeBase = `
O STFS: Pracujemy bezpośrednio z klientem, bez warstwy pośredników. Łączymy sprzedaż, strategię i wdrożenia AI w jednym procesie. Zamiast sprzedawać modne słowa, budujemy konkretne rozwiązania: automatyzacje, które przejmują powtarzalną pracę, strony, które realnie konwertują, i wsparcie marketingu oparte na danych, nie na domysłach. Pracujemy zarówno ze startupami budującymi pierwszy produkt, jak i z firmami, które chcą przenieść swoje procesy na AI bez ryzyka i chaosu wdrożeniowego — z pełną odpowiedzialnością za efekt na każdym etapie.

Usługa — Marketing z AI: Tworzymy materiały marketingowe gotowe do publikacji — wideo reklamowe i grafiki dopasowane pod markę klienta, bez tygodni czekania na agencję i bez stawek agencyjnych. Obejmuje: generowanie wideo marketingowego, generowanie grafik reklamowych.

Usługa — Strony internetowe: Budujemy strony od podstaw, dopasowane pod markę i cel klienta — sprzedaż, generowanie leadów albo prezentację oferty. Każda strona może mieć wbudowanego chatbota AI, który odpowiada klientom od razu. Obejmuje: stronę budowaną od zera pod konkretny cel, chatbota AI wbudowanego w stronę.

Usługa — Automatyzacja skrzynki Gmail: Przejmujemy powtarzalną komunikację mailową, żeby zespół klienta nie tracił godzin na pisanie tego samego po raz setny. Obejmuje: automatyczne odpisywanie na wiadomości, follow-up do leadów i klientów, generowanie wiadomości powitalnych, automatyczne przypomnienia.

Usługa — System rezerwacji: Klienci umawiają się sami, dostają przypomnienia i łączą się na wideorozmowę — bez telefonów ze strony właściciela firmy. Obejmuje: rezerwacje online z automatycznymi przypomnieniami, integrację z wideorozmowami.

Usługa — Monitoring opinii i reputacji: Dla sieci sklepów i firm z wieloma lokalizacjami — pilnujemy opinii klientów i reagujemy, zanim problem urośnie. System wykrywa nowe opinie (pozytywne i negatywne), wysyła alert i przygotowuje gotową odpowiedź, którą właściciel zatwierdza jednym kliknięciem przed publikacją. Obejmuje: wykrywanie nowych opinii w czasie rzeczywistym, alerty o opiniach, gotową odpowiedź AI do akceptacji, pełną kontrolę nad treścią (nic nie wychodzi bez zgody klienta).

Usługa — Automatyzacja arkuszy Google: Automatyzujemy pracę w arkuszach pod konkretny proces klienta, żeby nikt nie klikał tego ręcznie co tydzień. Zakres dopasowywany indywidualnie do procesu klienta.

Proces współpracy: 1) Konsultacja — darmowa, 30-minutowa rozmowa ustalająca cele i zakres. 2) Diagnoza i plan — audyt strony/procesów/danych. 3) Wdrożenie — budowa strony/automatyzacji z cotygodniowym podglądem postępu. 4) Skalowanie — po starcie mierzymy dane i dokładamy kolejne automatyzacje AI.

Modele współpracy: Projekt jednorazowy (konkretny zakres, jeden cel, wycena stała po konsultacji) — dla jednego celu. Stała opieka (comiesięczne wsparcie rozwoju: nowe automatyzacje, optymalizacje, marketing w jednym abonamencie) — najczęściej wybierane. Partnerstwo wzrostowe (długoterminowa współpraca z elastycznym zakresem) — dla startupów i firm skalujących się.

Konsultacja: Darmowa konsultacja trwa 30 minut i jest bezpłatna. Można ją zarezerwować online przez panel na stronie (kalendarz Cal.com), dostępne terminy to zwykle 12:00-18:00, z minimum 2-dniowym wyprzedzeniem. W konsultacji: analiza obecnej strony/procesów/kampanii, konkretne rekomendacje nawet bez dalszej współpracy, wstępna wycena i realny harmonogram.

Kontakt: e-mail kontakt@stfs.pl. Najlepszym pierwszym krokiem jest umówienie darmowej konsultacji przez stronę.

Technologie, których używa STFS: GPT-4o, Claude, LangChain, n8n, Make, Zapier, Next.js, Supabase, bazy wektorowe.
`.trim();

const buildPromptCode = `
const KNOWLEDGE_BASE = ${JSON.stringify(knowledgeBase)};

const systemPrompt = "Jesteś asystentem AI na stronie STFS (AI studio dla biznesu). Odpowiadaj wyłącznie na podstawie poniższej wiedzy o STFS. Bądź zwięzły, konkretny, po polsku, przyjazny. Twoje odpowiedzi MUSZĄ być krótkie: maksymalnie 3-4 zdania albo 3-4 krótkie punkty, nigdy więcej. Jeśli pytanie jest ogólne (np. \\\"jakie usługi oferujecie\\\"), nie wymieniaj wszystkiego naraz z opisami — podaj krótko same nazwy i zapytaj, o którą usługę rozwinąć temat. Bez nagłówków, bez pogrubień na całe zdania, bez sekcji \\\"Dodatkowo\\\" ani rozbudowanych zakończeń — jedno krótkie zdanie zachęty na koniec wystarczy. Jeśli nie znasz odpowiedzi z tej wiedzy, powiedz to wprost i zaproponuj umówienie darmowej konsultacji przez stronę. Nigdy nie wymyślaj cen ani faktów, których nie ma w kontekście.\\n\\nWiedza o STFS:\\n" + KNOWLEDGE_BASE;

const CLIENT_KEY = "stfs-site-widget-2026";
const headerKey = ($json.headers && $json.headers["x-stfs-client"]) || "";
const authorized = headerKey === CLIENT_KEY;

const MAX_QUESTION_LENGTH = 500;
let question = ($json.body && $json.body.question ? $json.body.question : ($json.question || "")).toString().slice(0, MAX_QUESTION_LENGTH);
if (!authorized) {
  question = "Przywitaj się krótko i zaproponuj kontakt przez formularz konsultacji.";
}

return [{
  json: {
    ...$json,
    question,
    body: {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        { role: "user", content: question },
      ],
    },
  },
}];
`.trim();

const extractAnswerCode = `
const answer = $json.content && $json.content[0] && $json.content[0].text ? $json.content[0].text : "Przepraszam, nie udało się wygenerować odpowiedzi. Napisz do nas na kontakt@stfs.pl.";
return [{ json: { answer } }];
`.trim();

buildWorkflow({
  fileName: 'site-chatbot-odpowiedzi-na-zywo.json',
  name: 'Chatbot strony — odpowiedzi na żywo (webhook)',
  noteWidth: 460,
  noteHeight: 400,
  setupNote:
    '## Webhook widgetu czatu (działa 24/7)\n\n' +
    '**Co robi:** przyjmuje pytanie z widgetu na stronie STFS, dokleja do niego całą wiedzę o STFS (usługi, proces, konsultacja, kontakt) i prosi model AI o odpowiedź WYŁĄCZNIE na tej podstawie. Bez bazy wektorowej — baza wiedzy jest mała, więc mieści się w całości w jednym zapytaniu.\n\n' +
    '**Do zrobienia:**\n' +
    '1. Zapisz i aktywuj ten workflow (przełącznik w prawym górnym rogu) — dopiero wtedy webhook działa na żywo.\n' +
    '2. Skopiuj Production URL webhooka i wklej go w stfs/script.js jako wartość `N8N_CHAT_WEBHOOK_URL`.\n' +
    '3. W węźle "AI: wygeneruj odpowiedź" wklej swój klucz Anthropic w nagłówku x-api-key (wartość, nie cała para) — reszta nagłówków jest już ustawiona.\n' +
    '4. Gdy zmieni się treść strony (nowa usługa, inne ceny) — zaktualizuj stałą KNOWLEDGE_BASE w węźle "Zbuduj prompt" i zapisz ponownie. Zero osobnego "indeksowania".',
  nodes: [
    webhookTrigger('Webhook: pytanie od widgetu', 'stfs-chat', 0),
    codeNode('Zbuduj prompt', buildPromptCode, 0),
    httpNode(
      'AI: wygeneruj odpowiedź',
      'POST',
      'https://api.anthropic.com/v1/messages',
      'Wklej klucz Anthropic w nagłówku x-api-key.',
      0,
      '={{ $json.body }}',
      [
        { name: 'x-api-key', value: '' },
        { name: 'anthropic-version', value: '2023-06-01' },
        { name: 'content-type', value: 'application/json' },
      ]
    ),
    codeNode('Wyodrębnij odpowiedź', extractAnswerCode, 0),
    respondWebhook('Zwróć odpowiedź do widgetu', 0),
  ],
});

// usunięte: workflowy "site-chatbot-1-indeksowanie.json" i stara wersja
// "site-chatbot-2-odpowiedzi-na-zywo.json" — zastąpione jednym, prostszym workflow powyżej.
['site-chatbot-1-indeksowanie.json', 'site-chatbot-2-odpowiedzi-na-zywo.json'].forEach((f) => {
  const p = path.join(OUT_DIR, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('usunięto (zastąpione):', f);
  }
});
