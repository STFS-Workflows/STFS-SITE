// Statyczna kontrola jakości workflowów n8n w tym folderze.
// Uruchom: node validate.js   (kod wyjścia 1 = są błędy)
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const NO_AUTH_ALLOWED = {
  'site-chatbot-odpowiedzi-na-zywo.json': 'widget w przeglądarce – chroniony limitami i Origin',
  '24-ai-agent-glosowy.json': 'Twilio – weryfikacja podpisu X-Twilio-Signature',
};
const SECRET_RE = /(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{10,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|Bearer\s+[A-Za-z0-9._-]{20,})/;

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();
const errors = [];
const warns = [];
const paths = new Map();

function walkStrings(obj, cb, keyPath = '') {
  if (typeof obj === 'string') return cb(obj, keyPath);
  if (Array.isArray(obj)) return obj.forEach((v, i) => walkStrings(v, cb, `${keyPath}[${i}]`));
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walkStrings(v, cb, keyPath ? `${keyPath}.${k}` : k);
}
function syntaxOk(src) {
  try { new Function(`return (async () => {\n${src}\n})`); return null; } catch (e) { return e.message; }
}

for (const f of files) {
  const E = (m) => errors.push(`${f}: ${m}`);
  const W = (m) => warns.push(`${f}: ${m}`);
  let wf;
  try { wf = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { E('niepoprawny JSON'); continue; }

  if (SECRET_RE.test(JSON.stringify(wf))) E('wygląda na zawarty SEKRET/klucz API');
  if (wf.active) E('workflow jest aktywny w pliku (powinien być active:false)');
  if (wf.settings?.timezone !== 'Europe/Warsaw') W('brak strefy czasowej Europe/Warsaw');

  const nodes = wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote');
  const byName = new Map(nodes.map((n) => [n.name, n]));
  if (byName.size !== nodes.length) E('zduplikowane nazwy węzłów');

  // połączenia
  const parents = new Map(nodes.map((n) => [n.name, new Set()]));
  const outCount = new Map();
  for (const [from, c] of Object.entries(wf.connections || {})) {
    if (!byName.has(from)) E(`połączenie z nieistniejącego węzła "${from}"`);
    (c.main || []).forEach((outs, i) => {
      if (outs.length) outCount.set(`${from}#${i}`, true);
      for (const t of outs) {
        if (!byName.has(t.node)) E(`połączenie do nieistniejącego węzła "${t.node}"`);
        else parents.get(t.node).add(from);
      }
    });
  }
  const triggers = nodes.filter((n) => /Trigger$|\.webhook$|errorTrigger/.test(n.type));
  if (triggers.length !== 1) E(`oczekiwany 1 trigger, jest ${triggers.length}`);
  const trigger = triggers[0];

  // osiągalność
  const reach = new Set([trigger.name]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [from, c] of Object.entries(wf.connections || {})) {
      if (!reach.has(from)) continue;
      for (const outs of c.main || []) for (const t of outs) if (!reach.has(t.node)) { reach.add(t.node); changed = true; }
    }
  }
  for (const n of nodes) {
    // Sub-węzły AI łączą się przez porty ai_languageModel / ai_outputParser,
    // a nie przez standardową ścieżkę main.
    const isAiSubNode = n.type.startsWith('@n8n/n8n-nodes-langchain.');
    if (!reach.has(n.name) && !isAiSubNode) E(`węzeł "${n.name}" nie jest podłączony`);
  }

  // przodkowie (dla sprawdzania $('X'))
  const ancestors = (name, seen = new Set()) => {
    for (const p of parents.get(name) || []) if (!seen.has(p)) { seen.add(p); ancestors(p, seen); }
    return seen;
  };

  for (const n of nodes) {
    const anc = ancestors(n.name);
    walkStrings(n.parameters, (s, k) => {
      if (s.includes('{{') && !s.startsWith('=') && n.type !== 'n8n-nodes-base.code') E(`"${n.name}".${k}: wyrażenie bez "=" (zostanie wysłane dosłownie)`);
      if (s.startsWith('=')) {
        for (const m of s.matchAll(/\{\{([\s\S]*?)\}\}(?!\})/g)) {
          const err = syntaxOk(`return (${m[1]});`);
          if (err) E(`"${n.name}".${k}: błąd składni w wyrażeniu: ${err}`);
        }
      }
      for (const m of s.matchAll(/\$\('([^']+)'\)/g)) {
        if (!byName.has(m[1])) E(`"${n.name}" odwołuje się do nieistniejącego węzła "${m[1]}"`);
        else if (m[1] !== n.name && !anc.has(m[1])) E(`"${n.name}" odwołuje się do "${m[1]}", który nie jest wcześniej w przepływie`);
      }
    });
    if (n.type === 'n8n-nodes-base.code') {
      const err = syntaxOk(n.parameters.jsCode);
      if (err) E(`"${n.name}": błąd składni JS: ${err}`);
    }
    if (n.type === 'n8n-nodes-base.if') {
      if (!outCount.get(`${n.name}#0`) || !outCount.get(`${n.name}#1`)) E(`IF "${n.name}" nie ma podłączonych obu gałęzi`);
    }
    if (n.type === 'n8n-nodes-base.httpRequest') {
      if (!n.parameters.authentication) E(`HTTP "${n.name}" bez uwierzytelnienia (credential)`);
      if (/openai\.com\/v1\/chat|anthropic\.com\/v1\/messages/.test(n.parameters.url) && !/_aiRequest/.test(n.parameters.jsonBody || '')) E(`AI "${n.name}" nie wysyła poprawnego żądania`);
      if (!n.retryOnFail && n.onError !== 'continueRegularOutput') W(`HTTP "${n.name}" bez ponawiania`); // świadomie bez ponowień, gdy błąd jest obsługiwany dalej
    }
    if (n.type === '@n8n/n8n-nodes-langchain.agent') {
      const hasModel = Object.values(wf.connections || {}).some((c) =>
        (c.ai_languageModel || []).some((outs) => outs.some((t) => t.node === n.name))
      );
      const hasParser = Object.values(wf.connections || {}).some((c) =>
        (c.ai_outputParser || []).some((outs) => outs.some((t) => t.node === n.name))
      );
      if (!hasModel) E(`AI Agent "${n.name}" nie ma połączonego Chat Model`);
      if (!hasParser) E(`AI Agent "${n.name}" nie ma połączonego Structured Output Parser`);
    }
  }

  // webhook
  if (trigger.type === 'n8n-nodes-base.webhook') {
    const p = trigger.parameters;
    const hasRespond = nodes.some((n) => n.type === 'n8n-nodes-base.respondToWebhook');
    if (hasRespond && p.responseMode !== 'responseNode') E('jest Respond to Webhook, ale responseMode ≠ responseNode');
    if (!hasRespond && p.responseMode === 'responseNode') E('responseMode = responseNode, ale brak węzła Respond');
    if (p.authentication !== 'headerAuth' && !NO_AUTH_ALLOWED[f]) E('webhook bez Header Auth');
    const key = `${p.httpMethod} ${p.path}`;
    if (paths.has(key)) E(`ścieżka webhooka "${p.path}" zajęta też przez ${paths.get(key)}`);
    paths.set(key, f);
  }
}

for (const w of warns) console.log('UWAGA  ', w);
for (const e of errors) console.log('BŁĄD   ', e);
console.log(`\nSprawdzono ${files.length} plików: ${errors.length} błędów, ${warns.length} ostrzeżeń.`);
process.exit(errors.length ? 1 : 0);
