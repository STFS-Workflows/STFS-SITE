// Generuje workflow usługi "Monitoring opinii i reputacji".
// Opinia -> AI (sentyment + projekt odpowiedzi) -> projekt wraca od razu w odpowiedzi HTTP (łatwe testy curl)
// -> właściciel dostaje e-mail z formularzem akceptacji -> publikacja w Google tylko po "Zatwierdź".
// Uruchom: node generate-review-responder.js
const L = require('./_lib');
const { code, config, ifNode, http, ai, email, respond, approvalWait, noOp, branch, webhook, ref, cfg } = L;

const SYSTEM =
  'Jesteś asystentem odpowiadającym w imieniu firmy klienta na opinie zostawione przez jej klientów (Google, Allegro lub inna platforma z recenzjami). Twoje zadanie:\n' +
  '1. Oceń sentyment opinii: pozytywna, neutralna lub negatywna.\n' +
  '2. Napisz krótką (2-4 zdania), profesjonalną odpowiedź po polsku, dopasowaną tonem do opinii.\n' +
  '3. Jeśli opinia jest pozytywna - podziękuj konkretnie za to, co klient docenił, nie ogólnikowo.\n' +
  '4. Jeśli opinia jest negatywna - przeproś, nie usprawiedliwiaj się nadmiernie, zaproponuj kontakt bezpośredni w celu rozwiązania sprawy (adres e-mail z danych firmy). Nie obiecuj konkretnych rekompensat, zniżek ani terminów.\n' +
  '5. Nigdy nie wymyślaj faktów, nazwisk pracowników, numerów zamówień ani szczegółów, których nie ma w treści opinii.\n' +
  '6. Nie używaj emoji. Nie podpisuj odpowiedzi wymyślonym imieniem.';

const validation = `const body = $json.body && typeof $json.body === 'object' ? $json.body : $json;
const opinia = {
  autor: String(body.autor || 'Klient').slice(0, 100),
  ocena: body.ocena != null && body.ocena !== '' ? Math.max(1, Math.min(5, Number(body.ocena))) : null,
  tresc: String(body.tresc || body.opinia || '').trim().slice(0, 2000),
  reviewName: body.reviewName ? String(body.reviewName) : '', // np. accounts/1/locations/2/reviews/3 (Google)
};
if (!opinia.tresc) throw new Error('Brak treści opinii w payloadzie (pole tresc albo opinia).');
return { json: { opinia_oryginalna: opinia, ...opinia } };`;

const AIW = 'AI: wynik (odpowiedź na opinię)';

L.build({
  fileName: 'monitoring-opinii-odpowiedzi.json',
  name: 'Monitoring opinii i reputacji (z akceptacją)',
  outDir: __dirname,
  note:
    '## Monitoring opinii i reputacji\n\n' +
    '**Co robi:** opinia (webhook) → AI ocenia sentyment i pisze projekt odpowiedzi → projekt wraca OD RAZU w odpowiedzi HTTP → właściciel dostaje e-mail z linkiem do formularza (Zatwierdź / Odrzuć / popraw treść) → dopiero po zatwierdzeniu odpowiedź jest publikowana w Google. Nic nie wychodzi bez zgody klienta.\n\n' +
    '**Test bez Google:**\n`curl -X POST <URL> -H "<nagłówek Header Auth>" -H "Content-Type: application/json" -d \'{"autor":"Jan K.","ocena":2,"tresc":"Zamówienie przyszło 5 dni później niż obiecano."}\'`\n' +
    'Bez pola `reviewName` workflow po akceptacji niczego nie publikuje (tryb testowy).\n\n' +
    '**Naprawione:** pole `opinia_oryginalna` było gubione po wywołaniu AI (zawsze puste w odpowiedzi).',
  trigger: webhook('Nowa opinia (Webhook)', 'opinia-nowa'),
  steps: [
    code('Walidacja danych', validation),
    config({
      daneFirmy: '[PODMIEŃ: nazwa firmy klienta i adres e-mail do kontaktu]',
      emailWlasciciela: 'wlasciciel@firma-klienta.pl',
    }),
    ai('odpowiedź na opinię', {
      system: SYSTEM,
      user: "`Dane firmy: ${$('Konfiguracja').first().json.daneFirmy}\\n\\nOpinia klienta (ocena: ${$json.ocena != null ? $json.ocena + '/5' : 'brak oceny'}):\\n${$json.tresc}`",
      outputs: { sentyment: '"pozytywna" | "neutralna" | "negatywna"', odpowiedz: 'tekst odpowiedzi' },
      maxTokens: 300,
    }),
    respond(
      'Zwróć projekt odpowiedzi',
      '={{ { "sentyment": $json.sentyment || "nieznany", "propozycja_odpowiedzi": $json._aiOk ? $json.odpowiedz : "Nie udało się wygenerować odpowiedzi automatycznie - wymaga ręcznego napisania.", "opinia_oryginalna": $json.opinia_oryginalna, "status": "czeka_na_akceptacje" } }}'
    ),
    email(
      'Wyślij projekt do akceptacji',
      `={{ ${cfg('emailWlasciciela')} }}`,
      `=Nowa opinia ({{ ${ref(AIW, 'sentyment')} }}) – odpowiedź do akceptacji`,
      `=Autor: {{ ${ref(AIW, 'autor')} }}, ocena: {{ ${ref(AIW, 'ocena')} ?? 'brak' }}\\nOpinia: {{ ${ref(AIW, 'tresc')} }}\\n\\nProponowana odpowiedź:\\n{{ ${ref(AIW, 'odpowiedz')} }}\\n\\nZatwierdź, popraw lub odrzuć: {{ $execution.resumeFormUrl }}`
    ),
    approvalWait('Czekaj na decyzję właściciela', 'Odpowiedź na opinię', 'Wybierz decyzję. Jeśli chcesz zmienić treść, wpisz nową w polu „Poprawiona treść”.', 72),
    branch(
      ifNode('Zatwierdzona?', "={{ $json['Decyzja'] }}", 'equals', 'Zatwierdź', 'string'),
      [
        branch(
          ifNode('Jest reviewName (Google)?', `={{ Boolean(${ref(AIW, 'reviewName')}) }}`, 'true', null, 'boolean'),
          [
            http('Opublikuj odpowiedź w Google', 'PUT', `={{ 'https://mybusiness.googleapis.com/v4/' + ${ref(AIW, 'reviewName')} + '/reply' }}`, {
              auth: { predefined: 'googleBusinessProfileOAuth2Api' },
              body: `={{ JSON.stringify({ comment: $json['Poprawiona treść'] || ${ref(AIW, 'odpowiedz')} }) }}`,
              note: 'Credential: Google Business Profile OAuth2 (konto klienta z dostępem do lokalizacji).',
            }),
          ],
          [noOp('Tryb testowy – bez publikacji')]
        ),
      ],
      [noOp('Odrzucona lub wygasła')]
    ),
  ],
});
console.log('napisano monitoring-opinii-odpowiedzi.json');
