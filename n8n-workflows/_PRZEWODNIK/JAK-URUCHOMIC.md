# Jak uruchomić workflow – krok po kroku

## 1. Raz na instancję n8n

1. **Zaimportuj `00-obsluga-bledow.json`** (Workflows → Import from File), ustaw credentiale Slack i SMTP, wpisz odbiorcę w Konfiguracji, **aktywuj**.
2. Utwórz credentiale, których będziesz używać wielokrotnie:

| Credential (typ w n8n) | Do czego | Jak ustawić |
|---|---|---|
| **Header Auth** – „OpenAI” | wszystkie węzły AI | Name: `Authorization`, Value: `Bearer sk-…` |
| **Header Auth** – „Anthropic” | chatbot strony | Name: `x-api-key`, Value: klucz Anthropic |
| **Header Auth** – „Webhook <nazwa>” | każdy webhook z Header Auth | Name np. `X-Webhook-Token`, Value: losowy token ≥ 32 znaki (`openssl rand -hex 32`) – **osobny na każdy webhook** |
| **Header Auth** – „API <system>” | CRM, sklep, księgowość… | zgodnie z dokumentacją danego API |
| **SMTP** | wysyłka e-maili | serwer poczty `kontakt@stfs.pl` |
| **Slack** | powiadomienia | OAuth2 lub token bota; bot dodany do kanału `#automatyzacje` |

3. Dla workflowów z akceptacją (27, 29, 47, Monitoring opinii): zmienna środowiskowa `WEBHOOK_URL` musi wskazywać publiczny adres n8n (np. `https://n8n.stfs.pl/`), inaczej link do formularza w e-mailu nie zadziała.
4. Dla workflow 24 (Twilio): `NODE_FUNCTION_ALLOW_BUILTIN=crypto` oraz `TWILIO_AUTH_TOKEN=<token>` w środowisku n8n.
5. Dla workflow 34 (kod SMS): `NODE_FUNCTION_ALLOW_BUILTIN=crypto` oraz `OTP_SEKRET=<losowe min. 32 znaki>` (`openssl rand -hex 32`).
6. Dla workflow 40 (kopia) i 50 (raport zdrowia): klucz API n8n (Settings → n8n API) jako Header Auth `X-N8N-API-KEY` i token GitHub (fine-grained, tylko Contents: write do jednego prywatnego repo) jako Header Auth `Authorization: Bearer …`.
7. Dla workflow 37 (Gmail) i 38 (GA4/Search Console): credentiale Google OAuth2 w n8n (Gmail OAuth2 oraz Google OAuth2 z zakresami `analytics.readonly`, `webmasters.readonly`).

## 2. Każdy workflow

1. **Import:** Workflows → Import from File → plik `.json`.
2. **Przeczytaj żółtą notatkę** – mówi, co robi workflow i jakich credentiali potrzebuje.
3. **Konfiguracja:** otwórz węzeł „Konfiguracja”, podmień wszystkie `YOUR-…`, progi, adresy e-mail.
4. **Credentiale:** przypisz je w węzłach wymienionych w notatce (ikona ostrzeżenia = brak credentiala).
5. **Settings → Error Workflow:** wybierz „STFS — Obsługa błędów (Error Workflow)”.
6. **Test:** kliknij *Test workflow* (webhook: *Listen for test event* i wyślij przykładowe dane – format w notatce). Sprawdź dane w każdym węźle.
7. **Aktywuj** dopiero, gdy test przeszedł. Pamięć „bez duplikatów” działa tylko w aktywnym workflow (w testach nie jest zapisywana).

### Przykład testu webhooka (01 – leady)

```bash
curl -X POST https://n8n.stfs.pl/webhook-test/lead-nowy \
  -H "X-Webhook-Token: <token z credentiala>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jan Kowalski","email":"jan@firma.pl","message":"Potrzebujemy chatbota na stronę, budżet ok. 15 tys., start w listopadzie"}'
```

## 3. Chatbot strony – podmiana działającej wersji

Obecny chatbot na `n8n.stfs.pl` działa na **starej** wersji. Żeby wdrożyć naprawioną:

1. W n8n otwórz obecny workflow chatbota → *…* → **Download** (kopia zapasowa).
2. Zaimportuj nowy `site-chatbot-odpowiedzi-na-zywo.json`, przypisz credential „Anthropic”.
3. Wyłącz stary workflow, **aktywuj nowy** (ta sama ścieżka `stfs-chat` – nie mogą być aktywne oba naraz).
4. Sprawdź na stfs.pl: pytanie w widgecie ma dostać odpowiedź. Test z terminala:

```bash
curl -X POST https://n8n.stfs.pl/webhook/stfs-chat \
  -H "Origin: https://stfs.pl" -H "X-Stfs-Client: stfs-site-widget-2026" \
  -H "Content-Type: application/json" -d '{"question":"Jakie usługi oferujecie?"}'
# bez nagłówków → 429 i NIE wywołuje Claude
```

5. W konsoli Anthropic ustaw miesięczny limit wydatków.

## 4. Zmiany w workflowach (dla dewelopera)

```bash
cd n8n-workflows
# edytuj generate.js / generate-site-chatbot.js / generate-review-responder.js / opisy.js
node generuj-wszystko.js      # generuje, sprawdza, testuje, odświeża przewodnik
git diff                      # stałe ID → widać tylko prawdziwe zmiany
```

Jeśli `validate.js` zgłosi błąd – nie commituj, popraw generator.
