// Testy kodu z węzłów Code – bez n8n. Uruchamia kod węzłów na przykładowych danych.
// Uruchom: node testy.js   (kod wyjścia 1 = test nie przeszedł)
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

const workflow = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f)));
const getNode = (f, n) => workflow(f).nodes.find((x) => x.name === n);
const get = (f, n) => getNode(f, n).parameters.jsCode;
// Minimalna symulacja środowiska węzła Code w n8n
const run = (js, { json = {}, nodes = {}, items = [], store = {}, env = {} } = {}) => {
  const $ = (n) => ({ item: { json: nodes[n] }, first: () => ({ json: nodes[n] }) });
  const f = new Function('$json', '$', '$input', '$getWorkflowStaticData', '$env', 'require', '$now', 'return (async()=>{' + js + '})()');
  return f(json, $, { all: () => items }, () => store, env, require, { toISODate: () => new Date().toISOString().slice(0, 10) });
};
let ok = 0;
const test = async (nazwa, fn) => {
  try { await fn(); ok++; console.log('  ✓', nazwa); } catch (e) { console.log('  ✗', nazwa, '\n    ', e.message); process.exitCode = 1; }
};

(async () => {
  const L01 = '01-sprzedaz-kwalifikacja-leadow.json';
  await test('walidacja: przyjmuje poprawne dane i spłaszcza body', async () => {
    const r = await run(get(L01, 'Walidacja danych'), { json: { body: { name: ' Jan ', email: 'jan@x.pl', message: 'Chcę stronę' } } });
    assert.strictEqual(r.json.name, 'Jan');
    assert.strictEqual(r.json.email, 'jan@x.pl');
  });
  await test('walidacja: odrzuca brak pól', async () => {
    await assert.rejects(run(get(L01, 'Walidacja danych'), { json: { body: { name: 'J', email: 'j@x.pl' } } }), /message/);
  });
  await test('walidacja: odrzuca zły e-mail', async () => {
    await assert.rejects(run(get(L01, 'Walidacja danych'), { json: { body: { name: 'J', email: 'zly', message: 'x' } } }), /e-mail/);
  });

  const prep = await run(get(L01, 'AI: prompt (ocena leada)'), { json: { name: 'Jan', email: 'j@x.pl', message: 'budżet 20k' }, nodes: { Konfiguracja: {} } });
  await test('AI: prompt przekazuje treść klienta do natywnego AI Agenta', async () => {
    assert.match(prep.json._aiPrompt, /budżet 20k/);
    const agent = getNode(L01, 'AI Agent: ocena leada');
    const model = getNode(L01, 'Chat Model: ocena leada');
    assert.strictEqual(agent.type, '@n8n/n8n-nodes-langchain.agent');
    assert.strictEqual(model.type, '@n8n/n8n-nodes-langchain.lmChatOpenAi');
  });
  await test('AI: wynik łączy dane klienta z odpowiedzią i przycina score', async () => {
    const r = await run(get(L01, 'AI: wynik (ocena leada)'), { json: { output: { score: '185', kategoria: 'goracy' } }, nodes: { 'AI: prompt (ocena leada)': prep.json } });
    assert.strictEqual(r.json.score, 100);
    assert.strictEqual(r.json.email, 'j@x.pl');
    assert.strictEqual(r.json._aiOk, true);
    assert.ok(!('_aiPrompt' in r.json));
  });
  await test('AI: zła odpowiedź modelu → score 0 i _aiOk=false', async () => {
    const r = await run(get(L01, 'AI: wynik (ocena leada)'), { json: { output: 'to nie JSON' }, nodes: { 'AI: prompt (ocena leada)': prep.json } });
    assert.strictEqual(r.json.score, 0);
    assert.strictEqual(r.json._aiOk, false);
  });

  const F13 = '13-operacje-wystawianie-faktur.json';
  await test('faktury: to samo zamówienie nie zostanie zafakturowane dwa razy', async () => {
    const store = {};
    const filtr = get(F13, 'Pomiń już zafakturowane');
    assert.strictEqual((await run(filtr, { items: [{ json: { orderId: 'A' } }], store })).length, 1);
    await run(get(F13, 'Zapamiętaj zafakturowane'), { json: {}, nodes: { 'Walidacja danych': { orderId: 'A' } }, store });
    const r = await run(filtr, { items: [{ json: { orderId: 'A' } }, { json: { orderId: 'B' } }], store });
    assert.deepStrictEqual(r.map((i) => i.json.orderId), ['B']);
    assert.strictEqual(r[0].pairedItem.item, 1);
  });

  const CH = 'site-chatbot-odpowiedzi-na-zywo.json';
  const cfgCh = { kluczWidgetu: 'k', dozwoloneOriginy: 'https://stfs.pl,https://www.stfs.pl', maksDlugoscPytania: 500, limitNaIp: 2, oknoLimituMin: 10, limitDzienny: 600 };
  const store = {};
  const req = (h) => run(get(CH, 'Kontrola dostępu i limity'), { json: { headers: h, body: { question: 'Jakie usługi?' } }, nodes: { Konfiguracja: cfgCh }, store });
  await test('chatbot: zły klucz → odmowa', async () => assert.strictEqual((await req({ 'x-stfs-client': 'zly', origin: 'https://stfs.pl' })).json.powod, 'zly-klucz'));
  await test('chatbot: obcy Origin → odmowa', async () => assert.strictEqual((await req({ 'x-stfs-client': 'k', origin: 'https://evil.com' })).json.powod, 'zly-origin'));
  await test('chatbot: limit na IP działa', async () => {
    const h = { 'x-stfs-client': 'k', origin: 'https://stfs.pl', 'x-forwarded-for': '1.1.1.1' };
    assert.strictEqual((await req(h)).json.dozwolone, true);
    assert.strictEqual((await req(h)).json.dozwolone, true);
    assert.strictEqual((await req(h)).json.powod, 'limit-ip');
  });

  const T = '24-ai-agent-glosowy.json';
  const url = 'https://n8n.example/webhook/agent-glosowy';
  const body = { CallSid: 'CA1', SpeechResult: 'Do której otwarte?' };
  const sig = crypto.createHmac('sha1', 'tok').update(url + Object.keys(body).sort().map((k) => k + body[k]).join('')).digest('base64');
  const twCtx = (s) => ({ json: { headers: { 'x-twilio-signature': s }, body }, nodes: { Konfiguracja: { publicznyUrlWebhooka: url } }, env: { TWILIO_AUTH_TOKEN: 'tok' } });
  await test('Twilio: poprawny podpis przechodzi', async () => assert.strictEqual((await run(get(T, 'Weryfikuj podpis Twilio'), twCtx(sig))).json.speech, 'Do której otwarte?'));
  await test('Twilio: zły podpis odrzucony', async () => assert.rejects(run(get(T, 'Weryfikuj podpis Twilio'), twCtx('x')), /podpis/));
  await test('Twilio: TwiML escapuje znaki specjalne', async () => {
    const r = await run(get(T, 'Zbuduj TwiML powitania'), { nodes: { Konfiguracja: { publicznyUrlWebhooka: url, powitanie: 'A & <B>' } } });
    assert.match(r.json.twiml, /A &amp; &lt;B&gt;/);
  });

  const M = 'monitoring-opinii-odpowiedzi.json';
  await test('opinie: opinia_oryginalna nie ginie po kroku AI', async () => {
    const w = await run(get(M, 'Walidacja danych'), { json: { body: { autor: 'Jan', ocena: 2, tresc: 'Późno' } } });
    const p = await run(get(M, 'AI: prompt (odpowiedź na opinię)'), { json: w.json, nodes: { Konfiguracja: { daneFirmy: 'X' } } });
    const r = await run(get(M, 'AI: wynik (odpowiedź na opinię)'), { json: { output: { sentyment: 'negatywna', odpowiedz: 'Przepraszamy' } }, nodes: { 'AI: prompt (odpowiedź na opinię)': p.json } });
    assert.strictEqual(r.json.opinia_oryginalna.tresc, 'Późno');
    assert.strictEqual(r.json.odpowiedz, 'Przepraszamy');
  });

  const A = '28-ai-wykrywanie-anomalii.json';
  await test('anomalie: brak średniej nie daje alertu', async () => {
    const r = await run(get(A, 'Oblicz odchylenie'), { json: { metricName: 'sprzedaz', current: 50 } });
    assert.strictEqual(r.json.deviation, 0);
  });


  // ---------- nowe workflowy 33–40 ----------
  const Z = '33-sprzedaz-zapytanie-o-termin.json';
  const zNode = 'Sprawdź telefon, datę i liczbę gości';
  await test('33: numer 9-cyfrowy dostaje +48, zgłoszenie dostaje numer', async () => {
    const r = await run(get(Z, zNode), { json: { name: 'Ola', phone: '600 100 200', date: '2030-06-12', guests: '90', type: 'wesele' } });
    assert.strictEqual(r.json.phone, '+48600100200');
    assert.strictEqual(r.json.guests, 90);
    assert.match(r.json.numerZgloszenia, /^ZAP-/);
  });
  await test('33: przeszła data odrzucona', async () => {
    await assert.rejects(run(get(Z, zNode), { json: { name: 'Ola', phone: '600100200', date: '2020-01-01', guests: 90, type: 'wesele' } }), /data/);
  });

  const O = '34-obsluga-weryfikacja-sms.json';
  const oCfg = { waznoscMin: 10, maksProb: 3, maksWysylekNaGodzine: 2 };
  const oStore = {};
  const otp = (body, env = { OTP_SEKRET: 'x'.repeat(40) }) => run(get(O, 'Obsłuż kod SMS'), { json: body, nodes: { Konfiguracja: oCfg }, store: oStore, env });
  await test('34: bez OTP_SEKRET odmowa', async () => assert.rejects(otp({ action: 'start', phone: '600100200' }, {}), /OTP_SEKRET/));
  let kod;
  await test('34: start generuje 6 cyfr, kod nie jest zapisany jawnie', async () => {
    const r = await otp({ action: 'start', phone: '600100200' });
    kod = r.json.kod;
    assert.match(kod, /^\d{6}$/);
    assert.ok(!JSON.stringify(oStore).includes(kod));
  });
  await test('34: zły kod odrzucony, dobry przyjęty, drugi raz już nie', async () => {
    const zly = kod === '000000' ? '111111' : '000000';
    assert.strictEqual((await otp({ action: 'verify', phone: '+48600100200', code: zly })).json.status, 'zly-kod');
    assert.strictEqual((await otp({ action: 'verify', phone: '+48600100200', code: kod })).json.ok, true);
    assert.strictEqual((await otp({ action: 'verify', phone: '+48600100200', code: kod })).json.ok, false);
  });
  await test('34: limit wysyłek na godzinę', async () => {
    await otp({ action: 'start', phone: '600100200' });
    assert.strictEqual((await otp({ action: 'start', phone: '600100200' })).json.status, 'limit-wysylek');
  });

  const G = '37-obsluga-skrzynka-gmail.json';
  await test('37: newsletter/noreply pomijany', async () => {
    const r = await run(get(G, 'Przygotuj wiadomość'), { json: { from: { value: [{ address: 'noreply@sklep.pl' }] }, subject: 'Promocja', text: 'x' }, nodes: { Konfiguracja: { pomijaj: 'noreply,newsletter' } } });
    assert.strictEqual(r.json.automatyczna, true);
  });

  const U = '39-operacje-monitoring-strony.json';
  await test('39: alarm dopiero po 2 błędach z rzędu, potem info o przywróceniu', async () => {
    const st = {};
    const krok = (ok) => run(get(U, 'Wykryj zmianę stanu'), { items: [{ json: { url: 'https://a.pl', ok, blad: ok ? '' : 'HTTP 502' } }], nodes: { Konfiguracja: { progAwarii: 2 } }, store: st });
    assert.strictEqual((await krok(false)).length, 0);
    assert.strictEqual((await krok(false))[0].json.zdarzenie, 'awaria');
    assert.strictEqual((await krok(false)).length, 0);
    assert.strictEqual((await krok(true))[0].json.zdarzenie, 'przywrocono');
  });

  const B = '40-system-kopia-workflowow.json';
  await test('40: kopia bez staticData, nazwa pliku bez polskich znaków', async () => {
    const r = await run(get(B, 'Przygotuj plik'), { json: { id: 'Ab12', name: 'STFS — Obsługa błędów', staticData: { ip: {} }, nodes: [] }, nodes: { Konfiguracja: { katalog: 'workflows' } } });
    assert.strictEqual(r.json.sciezka, 'workflows/stfs-obsluga-bledow-Ab12.json');
    const tresc = JSON.parse(Buffer.from(r.json.zawartosc, 'base64').toString('utf8'));
    assert.ok(!('staticData' in tresc));
  });


  // ---------- ostatnie workflowy 41–50 ----------
  const K = '41-finanse-weryfikacja-kontrahenta.json';
  await test('41: poprawny NIP przechodzi, zły odrzucony po sumie kontrolnej', async () => {
    const r = await run(get(K, 'Sprawdź NIP i rachunek'), { json: { nip: '526-025-02-74' } });
    assert.strictEqual(r.json.nip, '5260250274');
    await assert.rejects(run(get(K, 'Sprawdź NIP i rachunek'), { json: { nip: '1234567890' } }), /NIP/);
  });
  await test('41: konto spoza białej listy = problem', async () => {
    const r = await run(get(K, 'Oceń wynik'), { json: { result: { requestId: 'R1', subject: { name: 'ACME', statusVat: 'Czynny', accountNumbers: ['11111111111111111111111111'] } } }, nodes: { 'Sprawdź NIP i rachunek': { nip: '5260250274', konto: '22222222222222222222222222' } } });
    assert.strictEqual(r.json.ok, false);
    assert.strictEqual(r.json.kontoNaLiscie, false);
    assert.strictEqual(r.json.requestId, 'R1');
  });

  const N = '42-finanse-przeliczanie-walut-nbp.json';
  await test('42: bierze kurs z ostatniego dnia PRZED datą faktury', async () => {
    const zap = await run(get(N, 'Przygotuj zapytanie'), { json: { amount: '100,50', currency: 'eur', invoiceDate: '2026-09-21' } });
    assert.strictEqual(zap.json.do, '2026-09-20');
    const r = await run(get(N, 'Przelicz na PLN'), { json: { rates: [
      { no: '181/A/NBP/2026', effectiveDate: '2026-09-17', mid: 4.25 },
      { no: '182/A/NBP/2026', effectiveDate: '2026-09-18', mid: 4.2612 },
    ] }, nodes: { 'Przygotuj zapytanie': zap.json } });
    assert.strictEqual(r.json.kurs, 4.2612);
    assert.strictEqual(r.json.kwotaPLN, 428.25);
  });

  const Q = '44-marketing-publikacja-social-media.json';
  await test('44: publikuje tylko zatwierdzone, już zaplanowane i nieopublikowane posty', async () => {
    const teraz = new Date(Date.now() - 60000).toISOString();
    const jutro = new Date(Date.now() + 86400000).toISOString();
    const r = await run(get(Q, 'Wybierz posty do publikacji'), { items: [
      { json: { id: 1, status: 'szkic', kanal: 'facebook', data: teraz, tresc: 'a' } },
      { json: { id: 2, status: 'Zatwierdzony', kanal: 'facebook', data: teraz, tresc: 'b' } },
      { json: { id: 3, status: 'zatwierdzony', kanal: 'facebook', data: jutro, tresc: 'c' } },
      { json: { id: 4, status: 'zatwierdzony', kanal: 'facebook', data: teraz, tresc: 'd', postId: 'X' } },
    ] });
    assert.deepStrictEqual(r.map((i) => i.json.id), [2]);
    assert.strictEqual(r[0].pairedItem.item, 1);
  });

  const P = '45-obsluga-analiza-ankiet-nps.json';
  await test('45: grupy NPS', async () => {
    const g = async (score) => (await run(get(P, 'Policz grupę NPS'), { json: { score, email: 'a@b.pl' } })).json.grupa;
    assert.deepStrictEqual([await g(0), await g(6), await g(7), await g(8), await g(9), await g(10)], ['detraktor', 'detraktor', 'pasywny', 'pasywny', 'promotor', 'promotor']);
    await assert.rejects(run(get(P, 'Policz grupę NPS'), { json: { score: 11, email: 'a@b.pl' } }), /0-10/);
  });

  const R = '46-ecommerce-zwroty-i-reklamacje.json';
  const cfgR = { dniNaZwrot: 14, dniNaReklamacje: 730 };
  const zwrot = (dni, typ, email = 'a@b.pl') => run(get(R, 'Oceń termin'), { json: { email: 'a@b.pl', deliveredAt: new Date(Date.now() - dni * 86400000).toISOString() }, nodes: { 'Walidacja danych': { orderId: 'Z1', email, typ }, Konfiguracja: cfgR } });
  await test('46: zwrot po 10 dniach OK, po 20 dniach do człowieka, reklamacja po 20 dniach OK', async () => {
    assert.strictEqual((await zwrot(10, 'zwrot')).json.wTerminie, true);
    assert.strictEqual((await zwrot(20, 'zwrot')).json.wTerminie, false);
    assert.strictEqual((await zwrot(20, 'reklamacja')).json.wTerminie, true);
  });
  await test('46: inny e-mail niż w zamówieniu → do człowieka', async () => assert.strictEqual((await zwrot(3, 'zwrot', 'obcy@x.pl')).json.wTerminie, false));

  const U2 = '47-hr-wnioski-urlopowe.json';
  const dniRob = async (from, to) => (await run(get(U2, 'Policz dni robocze'), { json: { from, to } })).json.dniRobocze;
  await test('47: święta i weekendy nie są liczone (Boże Narodzenie 2026, Wielkanoc 2027)', async () => {
    assert.strictEqual(await dniRob('2026-12-21', '2026-12-31'), 7); // 24 i 25 grudnia wolne, 26-27 weekend
    assert.strictEqual(await dniRob('2027-03-29', '2027-04-02'), 4); // 29.03.2027 = Poniedziałek Wielkanocny
    assert.strictEqual(await dniRob('2027-05-24', '2027-05-28'), 4); // 27.05.2027 = Boże Ciało
  });

  const S = '49-finanse-kontrola-ksef.json';
  await test('49: odrzucona i wisząca = problem, przyjęta nie', async () => {
    const o = async (st, h) => (await run(get(S, 'Oceń status KSeF'), { json: { id: 'F1', ksefStatus: st, issuedAt: new Date(Date.now() - h * 3600000).toISOString() }, nodes: { Konfiguracja: { godzinDoAlarmu: 12 } } })).json.problem;
    assert.deepStrictEqual([await o('rejected', 1), await o('pending', 2), await o('pending', 20), await o('accepted', 50)], [true, false, true, false]);
  });

  const H = '50-system-raport-zdrowia-automatyzacji.json';
  await test('50: raport liczy błędy z 7 dni i wskazuje workflowy bez Error Workflow', async () => {
    const nowIso = new Date().toISOString();
    const stary = new Date(Date.now() - 20 * 86400000).toISOString();
    const nodes = {
      Konfiguracja: { dni: 7 },
      'Pobierz aktywne workflowy': { data: [{ id: 'a', name: 'Leady', settings: { errorWorkflow: 'x' } }, { id: 'b', name: 'Faktury', settings: {} }] },
      'Pobierz błędy wykonań': { data: [{ workflowId: 'a', startedAt: nowIso }, { workflowId: 'a', startedAt: nowIso }, { workflowId: 'b', startedAt: stary }] },
    };
    const r = await run(get(H, 'Zbierz statystyki'), { nodes });
    assert.strictEqual(r[0].json.liczbaBledow, 2);
    assert.match(r[0].json.tekst, /Leady: 2 błędów/);
    assert.match(r[0].json.tekst, /bez Error Workflow[\s\S]*Faktury/);
  });

  console.log(`\n${ok} testów zaliczonych${process.exitCode ? ', są BŁĘDY' : ''}.`);
})();
