// Jedna komenda: generuje wszystkie workflowy, sprawdza je, testuje kod węzłów i odświeża przewodnik.
// Uruchom: node generuj-wszystko.js
const { execFileSync } = require('child_process');
const path = require('path');

const kroki = [
  ['generate.js', 'Generuję katalog 00–32'],
  ['generate-site-chatbot.js', 'Generuję chatbota strony'],
  ['generate-review-responder.js', 'Generuję Monitoring opinii'],
  ['validate.js', 'Sprawdzam jakość (validate.js)'],
  ['testy.js', 'Testuję kod węzłów (testy.js)'],
  ['zbuduj-przewodnik.js', 'Buduję przewodnik (_PRZEWODNIK)'],
];

for (const [plik, opis] of kroki) {
  console.log(`\n▶ ${opis}`);
  try {
    execFileSync(process.execPath, [path.join(__dirname, plik)], { stdio: 'inherit', cwd: __dirname });
  } catch (e) {
    console.error(`\n✖ Przerwano na kroku: ${plik}`);
    process.exit(1);
  }
}
console.log('\n✔ Gotowe.');
