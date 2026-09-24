# Workflowy n8n STFS

**Zacznij od [`_PRZEWODNIK/README.md`](_PRZEWODNIK/README.md)** – wyjaśnia po polsku, co jest czym. Wizualna mapa wszystkich workflowów: [`_PRZEWODNIK/mapa-workflowow.html`](_PRZEWODNIK/mapa-workflowow.html).

## W skrócie

- `00-obsluga-bledow.json` – Error Workflow (alert Slack + e-mail). Importuj pierwszy.
- `01…50-*.json` – kompletny katalog 50 automatyzacji STFS (sprzedaż, marketing, obsługa klienta, operacje, finanse, HR, AI, e-commerce, system). 33–50 dodane 23.09.2026 – [`_PRZEWODNIK/NOWE-WORKFLOWY.md`](_PRZEWODNIK/NOWE-WORKFLOWY.md).
- `site-chatbot-odpowiedzi-na-zywo.json` – działający chatbot stfs.pl (`/webhook/stfs-chat`), z limitami i bez klucza w pliku.
- `monitoring-opinii-odpowiedzi.json` – usługa „Monitoring opinii” z akceptacją właściciela przed publikacją.

Wszystkie pliki są **generowane** – nie edytuj JSON ręcznie:

```bash
node generuj-wszystko.js   # generuje → validate.js → testy.js → przewodnik
```

## Dokumentacja

| Plik | Zawartość |
|---|---|
| [`_PRZEWODNIK/README.md`](_PRZEWODNIK/README.md) | Co jest czym, wspólny szkielet workflowów |
| [`_PRZEWODNIK/CO-NAPRAWIONO.md`](_PRZEWODNIK/CO-NAPRAWIONO.md) | Błędy i naprawy |
| [`_PRZEWODNIK/JAK-URUCHOMIC.md`](_PRZEWODNIK/JAK-URUCHOMIC.md) | Import, credentiale, testy, aktywacja, podmiana chatbota |
| [`_PRZEWODNIK/KATALOG.md`](_PRZEWODNIK/KATALOG.md) | Opis każdego workflow (generowany) |
| [`SECURITY.md`](SECURITY.md) | Zasady bezpieczeństwa przed aktywacją |
