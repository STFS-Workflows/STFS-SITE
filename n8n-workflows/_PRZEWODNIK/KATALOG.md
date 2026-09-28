# Katalog workflowów – opis każdego

_Plik generowany automatycznie (`node zbuduj-przewodnik.js`) – nie edytuj ręcznie. Opisy zmieniasz w `opisy.js`._


## Działające u nas (STFS)

### Monitoring opinii i reputacji (z akceptacją)

**Plik:** `monitoring-opinii-odpowiedzi.json`  
**Start:** Webhook – POST /webhook/opinia-nowa · Header Auth

**Co robi:** Usługa „Monitoring opinii”: AI ocenia opinię i pisze projekt odpowiedzi, właściciel zatwierdza w formularzu, dopiero wtedy publikacja w Google.

**Wymaga dodatkowo:** Google Business Profile (OAuth2) klienta, n8n z formularzem Wait.

**Przykład danych wejściowych:**

```json
{
  "autor": "Jan K.",
  "ocena": 2,
  "tresc": "Zamówienie przyszło 5 dni później niż obiecano."
}
```

**Przebieg:**

- Nowa opinia (Webhook) _(POST /webhook/opinia-nowa · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: odpowiedź na opinię _(prompt → model → wynik)_
- Zwróć projekt odpowiedzi _(odpowiedź HTTP)_
- Wyślij projekt do akceptacji _(e-mail)_
- Czekaj na decyzję właściciela _(formularz akceptacji)_
- **Zatwierdzona?**
  - tak →
    - **Jest reviewName (Google)?**
      - tak →
        - Opublikuj odpowiedź w Google _(PUT · googleapis)_
      - nie →
        - Tryb testowy – bez publikacji _(koniec)_
  - nie →
    - Odrzucona lub wygasła _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `daneFirmy` | [PODMIEŃ: nazwa firmy klienta i adres e-mail do kontaktu] |
| `emailWlasciciela` | wlasciciel@firma-klienta.pl |

**Co naprawiono:**

- Pole opinia_oryginalna było zawsze puste (gubione po kroku AI).
- Dodany krok akceptacji przez właściciela (formularz) i publikacja w Google Business Profile.
- Brak credentiala dla OpenAI – dodany.

---
### Chatbot strony — odpowiedzi na żywo (webhook)

**Plik:** `site-chatbot-odpowiedzi-na-zywo.json`  
**Start:** Webhook – POST /webhook/stfs-chat

**Co robi:** Chatbot na stfs.pl: odpowiada odwiedzającym na pytania o usługi STFS na podstawie wklejonej bazy wiedzy (Claude Haiku).

**Przykład danych wejściowych:**

```json
{
  "question": "Jakie usługi oferujecie?"
}
```

**Przebieg:**

- Webhook: pytanie od widgetu _(POST /webhook/stfs-chat)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Kontrola dostępu i limity
- **Dozwolone?**
  - tak →
    - AI: odpowiedź dla widgetu _(prompt → model → wynik)_
    - Zwróć odpowiedź do widgetu _(odpowiedź HTTP)_
  - nie →
    - Odmowa / limit _(odpowiedź HTTP)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `kluczWidgetu` | stfs-site-widget-2026 |
| `dozwoloneOriginy` | https://stfs.pl,https://www.stfs.pl |
| `maksDlugoscPytania` | 500 |
| `limitNaIp` | 15 |
| `oknoLimituMin` | 10 |
| `limitDzienny` | 600 |

**Co naprawiono:**

- Żądanie ze złym kluczem nadal wywoływało model (płaciliśmy za spam) – teraz odmowa BEZ wywołania AI.
- Dodane limity: 15 pytań / 10 min na IP i 600 dziennie.
- Sprawdzany nagłówek Origin + CORS tylko dla stfs.pl.
- Klucz Anthropic przeniesiony do credentiala (wcześniej wpisywany w nagłówek w workflow – ryzyko wycieku przy eksporcie).
- Kontrakt z widgetem bez zmian – script.js nie wymaga modyfikacji.

---

## System

### 00 – Obsługa błędów (Error Workflow)

**Plik:** `00-obsluga-bledow.json`  
**Start:** Błąd – błąd w innym workflow

**Co robi:** Gdy którykolwiek workflow się wysypie, dostajesz od razu Slacka i e-mail z nazwą workflow, węzłem i komunikatem błędu.

**Przebieg:**

- Błąd w workflow _(błąd w innym workflow)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Przygotuj alert
- Alert na Slacku _(Slack)_
- Alert e-mailem _(e-mail)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `odbiorcaAlertow` | kontakt@stfs.pl |

**Co naprawiono:**

- Nowy – wcześniej błędy były niewidoczne, dopóki klient się nie poskarżył.

---

## Sprzedaż i leady

### 01 – Kwalifikacja i scoring leadów

**Plik:** `01-sprzedaz-kwalifikacja-leadow.json`  
**Start:** Webhook – POST /webhook/lead-nowy · Header Auth

**Co robi:** Każdy lead z formularza dostaje ocenę 0–100 od AI, trafia do CRM, a handlowiec dostaje Slacka tylko o gorących.

**Przykład danych wejściowych:**

```json
{
  "name": "Jan Kowalski",
  "email": "jan@firma.pl",
  "message": "Szukamy chatbota na stronę, budżet ok. 15 tys. zł, start w listopadzie."
}
```

**Wymagane dane wejściowe:** `name`, `email`, `message`

**Przebieg:**

- Nowy lead (Webhook) _(POST /webhook/lead-nowy · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: ocena leada _(prompt → model → wynik)_
- Zapisz lead w CRM _(POST)_
- **Czy lead gorący?**
  - tak →
    - Powiadom handlowca _(Slack)_
  - nie →
    - Lead ciepły/zimny – tylko CRM _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `progGoracegoLeada` | 70 |
| `crmUrl` | https://YOUR-CRM.example.com/api/leads |

**Co naprawiono:**

- Score zawsze wynosił 50, więc żaden lead nie był „gorący” – teraz liczony z odpowiedzi AI.
- Do CRM trafia każdy lead (wcześniej tylko gorące).

---
### 02 – Automatyczne odpowiedzi na zapytania

**Plik:** `02-sprzedaz-automatyczne-odpowiedzi.json`  
**Start:** Webhook – POST /webhook/zapytanie-nowe · Header Auth

**Co robi:** Klient dostaje w minutę uprzejmą odpowiedź z zaproszeniem na konsultację; zespół widzi kopię.

**Przykład danych wejściowych:**

```json
{
  "name": "Jan Kowalski",
  "email": "jan@firma.pl",
  "message": "Szukamy chatbota na stronę, budżet ok. 15 tys. zł, start w listopadzie."
}
```

**Wymagane dane wejściowe:** `name`, `email`, `message`

**Przebieg:**

- Nowe zapytanie (Webhook) _(POST /webhook/zapytanie-nowe · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: odpowiedź _(prompt → model → wynik)_
- **AI zadziałało?**
  - tak →
    - Wyślij odpowiedź _(e-mail)_
    - Kopia dla zespołu _(Slack)_
  - nie →
    - Alert: AI nie odpowiedziało _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `nazwaFirmy` | STFS |
| `podpis` | Zespół STFS |

**Co naprawiono:**

- E-mail szedł na pusty adres z pustą treścią.
- Jeśli AI zawiedzie – nic nie idzie do klienta, zespół dostaje alert.

---
### 03 – Follow-up po braku odpowiedzi

**Plik:** `03-sprzedaz-follow-up.json`  
**Start:** Harmonogram – dni robocze 9:00

**Co robi:** W dni robocze wysyła jeden nienachalny follow-up do leadów, które nie odpowiedziały od X dni.

**Oczekiwany format źródła danych:** `{ "data": [ { "id", "name", "email", "lastContactAt" } ] }`

**Przebieg:**

- Codziennie 9:00 _(dni robocze 9:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz leady bez odpowiedzi _(GET)_
- Rozbij listę leadów _(lista → pozycje)_
- Policz dni od kontaktu
- **Minęło wystarczająco dni?**
  - tak →
    - Pomiń już obsłużone _(pamięć workflow)_
    - AI: follow-up _(prompt → model → wynik)_
    - **AI zadziałało?**
      - tak →
        - Wyślij follow-up _(e-mail)_
        - Oznacz w CRM: follow-up wysłany _(PATCH)_
        - Zapamiętaj wysłany follow-up _(pamięć workflow)_
      - nie →
        - Alert: AI nie odpowiedziało _(Slack)_
  - nie →
    - Za wcześnie – pomiń _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `dniBezOdpowiedzi` | 3 |
| `crmListaUrl` | https://YOUR-CRM.example.com/api/leads?status=no_reply |
| `crmAktualizacjaUrl` | https://YOUR-CRM.example.com/api/leads |

**Co naprawiono:**

- Wysyłał follow-up codziennie w kółko – teraz raz na lead (oznaczenie w CRM + pamięć workflow).
- Lista z CRM jest rozbijana na pojedyncze leady; dni liczone z daty kontaktu.

---
### 04 – Aktualizacja CRM bez ręcznego wpisywania

**Plik:** `04-sprzedaz-aktualizacja-crm.json`  
**Start:** Webhook – POST /webhook/dane-kontaktu · Header Auth

**Co robi:** Dane z formularzy/czatu same trafiają do CRM jako nowy lub zaktualizowany kontakt (bez duplikatów).

**Przykład danych wejściowych:**

```json
{
  "email": "jan@firma.pl"
}
```

**Wymagane dane wejściowe:** `email`

**Przebieg:**

- Nowe dane kontaktu (Webhook) _(POST /webhook/dane-kontaktu · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Zmapuj pola na CRM
- Zapisz/aktualizuj kontakt w CRM _(POST)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `crmUpsertUrl` | https://YOUR-CRM.example.com/api/contacts/upsert |

**Co naprawiono:**

- Pola były czytane z niewłaściwego miejsca (body webhooka) – zawsze puste.

---
### 05 – Umawianie spotkań i konsultacji

**Plik:** `05-sprzedaz-umawianie-spotkan.json`  
**Start:** Webhook – POST /webhook/rezerwacja-konsultacji · Header Auth

**Co robi:** Rezerwacja konsultacji tworzy wydarzenie w kalendarzu i wysyła potwierdzenie z terminem po polsku.

**Przykład danych wejściowych:**

```json
{
  "name": "Jan Kowalski",
  "email": "jan@firma.pl",
  "start": "2026-10-01T14:00:00+02:00"
}
```

**Wymagane dane wejściowe:** `name`, `email`, `start`

**Przebieg:**

- Rezerwacja konsultacji (Webhook) _(POST /webhook/rezerwacja-konsultacji · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Policz koniec spotkania
- Utwórz wydarzenie w kalendarzu _(POST)_
- Wyślij potwierdzenie _(e-mail)_
- Powiadom zespół _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `kalendarzUrl` | https://YOUR-CALENDAR.example.com/api/events |
| `czasTrwaniaMin` | 30 |

**Co naprawiono:**

- Potwierdzenie zawierało dosłownie „{{$json.date}}”.
- Walidacja terminu (nie w przeszłości), wyliczenie końca spotkania.

---

## Marketing

### 06 – Generowanie treści i reklam

**Plik:** `06-marketing-generowanie-tresci.json`  
**Start:** Ręcznie – uruchamiany ręcznie

**Co robi:** Z briefu tworzy 3 warianty reklamy/posta i zapisuje jako wersje robocze.

**Przebieg:**

- Start (uzupełnij brief w Konfiguracji) _(uruchamiany ręcznie)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: 3 warianty treści _(prompt → model → wynik)_
- Zapisz wersje robocze _(POST)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `brief` | Opisz produkt/kampanię tutaj |
| `kanal` | Facebook / Instagram |
| `ton` | konkretny, przyjazny, bez przesady |
| `szkiceUrl` | https://YOUR-CMS.example.com/api/drafts |

**Co naprawiono:**

- Model nie dostawał briefu.
- Brief, kanał i ton w Konfiguracji.

---
### 07 – Automatyczne raportowanie kampanii

**Plik:** `07-marketing-raportowanie-kampanii.json`  
**Start:** Harmonogram – poniedziałki 8:00

**Co robi:** W poniedziałek rano Slack z wynikami Meta i Google Ads z 7 dni + komentarz AI i rekomendacje.

**Wymaga dodatkowo:** Konta reklamowe Meta i Google Ads, developer-token Google Ads.

**Przebieg:**

- Poniedziałek 8:00 _(poniedziałki 8:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz dane Meta Ads _(GET · facebook)_
- Pobierz dane Google Ads _(POST · googleapis)_
- Połącz dane w raport
- AI: komentarz do raportu _(prompt → model → wynik)_
- Wyślij raport na Slack _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `metaKontoReklamowe` | act_YOUR_ID |
| `googleIdKlienta` | YOUR_CUSTOMER_ID |
| `googleDeveloperToken` | YOUR_DEV_TOKEN |

**Co naprawiono:**

- Krok „połącz dane” był pustą zaślepką – teraz sumuje wydatki, kliknięcia, konwersje.
- Google Ads: poprawna metoda POST, zapytanie GAQL, OAuth + developer-token.

---
### 08 – Segmentacja i personalizacja mailingów

**Plik:** `08-marketing-segmentacja-mailingow.json`  
**Start:** Harmonogram – codziennie 7:00

**Co robi:** Codziennie przypisuje kontaktom segment (klient aktywny / uśpiony / lead) jako tag w systemie mailingowym.

**Przebieg:**

- Codziennie 7:00 _(codziennie 7:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz kontakty _(GET)_
- Rozbij listę kontaktów _(lista → pozycje)_
- **Ma zgodę marketingową?**
  - tak →
    - Przypisz segment
    - Zaktualizuj tag w ESP _(POST)_
  - nie →
    - Brak zgody – pomiń _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `kontaktyUrl` | https://YOUR-CRM.example.com/api/contacts |
| `espAktualizacjaUrl` | https://YOUR-ESP.example.com/api/contacts/upsert |
| `dniDoUspienia` | 90 |

**Co naprawiono:**

- Poprzednio wysyłał KAMPANIĘ do każdego kontaktu codziennie – teraz tylko aktualizuje tagi.
- Pomija kontakty bez zgody marketingowej.

---
### 09 – Monitoring wzmianek o marce

**Plik:** `09-marketing-monitoring-wzmianek.json`  
**Start:** Harmonogram – co 4 godziny

**Co robi:** Co 4 godziny sprawdza nowe wzmianki o marce i alarmuje o negatywnych.

**Oczekiwany format źródła danych:** `{ "data": [ { "id", "text", "url", "source" } ] }`

**Przebieg:**

- Co 4 godziny _(co 4 godziny)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz wzmianki _(GET)_
- Rozbij listę wzmianek _(lista → pozycje)_
- Pomiń już widziane _(pamięć workflow)_
- AI: sentyment _(prompt → model → wynik)_
- Zapamiętaj wzmiankę _(pamięć workflow)_
- **Czy negatywna?**
  - tak →
    - Alert: negatywna wzmianka _(Slack)_
  - nie →
    - Neutralna/pozytywna _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `wzmiankiUrl` | https://YOUR-MONITORING.example.com/api/mentions?since=4h |

**Co naprawiono:**

- Te same wzmianki alarmowały przy każdym przebiegu – teraz pamięć już widzianych.
- Alert zawierał dosłowny tekst {{ }}.

---

## Obsługa klienta

### 10 – Bot FAQ (Telegram)

**Plik:** `10-obsluga-bot-faq.json`  
**Start:** Telegram – wiadomość Telegram

**Co robi:** Bot na Telegramie odpowiada klientom na pytania z FAQ; gdy nie wie – odsyła do kontaktu.

**Wymaga dodatkowo:** Bot Telegram (token z @BotFather).

**Przebieg:**

- Wiadomość na Telegramie _(wiadomość Telegram)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- **Czy to wiadomość tekstowa?**
  - tak →
    - AI: odpowiedź FAQ _(prompt → model → wynik)_
    - Odpowiedz na Telegramie _(Telegram)_
  - nie →
    - Nie tekst – pomiń _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `faq` | P: Jakie są godziny otwarcia? O: Pn-Pt 9-17. P: Jak się skontaktować? O: kontakt@stfs.pl |
| `kontaktAwaryjny` | kontakt@stfs.pl |

**Co naprawiono:**

- Webhook nigdy nie zwracał odpowiedzi (konflikt trybu odpowiedzi).
- Natywny Telegram Trigger zamiast tokenu w URL.

---
### 11 – Kategoryzacja i priorytetyzacja zgłoszeń

**Plik:** `11-obsluga-kategoryzacja-zgloszen.json`  
**Start:** Webhook – POST /webhook/zgloszenie-nowe · Header Auth

**Co robi:** Zgłoszenie dostaje kategorię, priorytet i streszczenie; pilne od razu na Slacka.

**Przykład danych wejściowych:**

```json
{
  "email": "jan@firma.pl",
  "subject": "Nie mogę pobrać faktury",
  "message": "Szukamy chatbota na stronę, budżet ok. 15 tys. zł, start w listopadzie."
}
```

**Wymagane dane wejściowe:** `email`, `subject`, `message`

**Przebieg:**

- Nowe zgłoszenie (Webhook) _(POST /webhook/zgloszenie-nowe · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: kategoria i priorytet _(prompt → model → wynik)_
- Zapisz w helpdesku _(POST)_
- **Priorytet wysoki?**
  - tak →
    - Powiadom zespół (pilne) _(Slack)_
  - nie →
    - Priorytet normalny _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `helpdeskUrl` | https://YOUR-HELPDESK.example.com/api/tickets |
| `kategorie` | techniczne, sprzedaz, faktury, reklamacja, inne |

**Co naprawiono:**

- Slack dostawał puste pola.
- Przy błędzie AI priorytet domyślny „średni” zamiast braku.

---
### 12 – Tłumaczenie i streszczanie zgłoszeń

**Plik:** `12-obsluga-tlumaczenie-streszczanie.json`  
**Start:** Webhook – POST /webhook/zgloszenie-jezykowe · Header Auth

**Co robi:** Zgłoszenie w obcym języku jest tłumaczone na polski i streszczane dla zespołu.

**Przykład danych wejściowych:**

```json
{
  "message": "Szukamy chatbota na stronę, budżet ok. 15 tys. zł, start w listopadzie."
}
```

**Wymagane dane wejściowe:** `message`

**Przebieg:**

- Nowe zgłoszenie (Webhook) _(POST /webhook/zgloszenie-jezykowe · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: tłumaczenie _(prompt → model → wynik)_
- Wyślij streszczenie do zespołu _(Slack)_

**Co naprawiono:**

- Na Slacka szedł dosłowny tekst {{$json.aiResponse}}.

---

## Operacje i dokumenty

### 13 – Wystawianie i wysyłka faktur

**Plik:** `13-operacje-wystawianie-faktur.json`  
**Start:** Webhook – POST /webhook/zamowienie-oplacone · Header Auth

**Co robi:** Po opłaceniu zamówienia wystawia fakturę i wysyła ją klientowi e-mailem.

**Przykład danych wejściowych:**

```json
{
  "orderId": "ZAM-1042"
}
```

**Wymagane dane wejściowe:** `orderId`

**Przebieg:**

- Zamówienie opłacone (Webhook) _(POST /webhook/zamowienie-oplacone · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pomiń już zafakturowane _(pamięć workflow)_
- Pobierz zamówienie ze źródła _(GET)_
- **Zamówienie opłacone?**
  - tak →
    - Wystaw fakturę _(POST)_
    - Wyślij fakturę mailem _(e-mail)_
    - Zapamiętaj zafakturowane _(pamięć workflow)_
  - nie →
    - Zamówienie nieopłacone – pominięto _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `zamowieniaUrl` | https://YOUR-SHOP.example.com/api/orders |
| `fakturyUrl` | https://YOUR-BILLING.example.com/api/invoices |

**Co naprawiono:**

- Kwota była brana z webhooka (każdy mógł podać dowolną) – teraz zamówienie pobierane ze źródła.
- Faktura tylko dla statusu „paid” i tylko raz na zamówienie.

---
### 14 – OCR i ekstrakcja danych z dokumentów

**Plik:** `14-operacje-ocr-dokumentow.json`  
**Start:** Webhook – POST /webhook/dokument-nowy · Header Auth

**Co robi:** Skan faktury/paragonu → tekst (Google Vision) → AI wyciąga numer, datę, kwotę, NIP → zapis.

**Wymaga dodatkowo:** Klucz Google Cloud Vision.

**Przykład danych wejściowych:**

```json
{
  "fileUrl": "https://pliki.firma.pl/skany/faktura-0931.jpg"
}
```

**Wymagane dane wejściowe:** `fileUrl`

**Przebieg:**

- Nowy dokument (Webhook) _(POST /webhook/dokument-nowy · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- OCR: odczytaj dokument _(POST · googleapis)_
- Wyciągnij tekst
- AI: ekstrakcja pól _(prompt → model → wynik)_
- **Pewność wystarczająca?**
  - tak →
    - Zapisz dane _(POST)_
  - nie →
    - Do ręcznej weryfikacji _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `zapisUrl` | https://YOUR-DB.example.com/api/documents |

**Co naprawiono:**

- Krok „wyciągnij pola” nic nie wyciągał – dodana ekstrakcja AI.
- Niepewne dokumenty idą do ręcznej weryfikacji.

---
### 15 – Uzupełnianie arkuszy z formularzy i maili

**Plik:** `15-operacje-uzupelnianie-arkuszy.json`  
**Start:** Webhook – POST /webhook/formularz-nowy · Header Auth

**Co robi:** Każde zgłoszenie z formularza dopisuje się jako wiersz w Google Sheets.

**Przykład danych wejściowych:**

```json
{
  "name": "Jan Kowalski",
  "email": "jan@firma.pl"
}
```

**Wymagane dane wejściowe:** `name`, `email`

**Przebieg:**

- Nowe zgłoszenie formularza (Webhook) _(POST /webhook/formularz-nowy · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Zmapuj do kolumn
- Dopisz wiersz _(Google Sheets)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `arkuszUrl` | https://docs.google.com/spreadsheets/d/YOUR-SHEET-ID/edit |
| `zakladka` | Arkusz1 |

**Co naprawiono:**

- Węzeł Google Sheets nie miał wskazanego arkusza ani mapowania kolumn.
- Data w strefie Europe/Warsaw.

---
### 16 – Alerty o stanach magazynowych

**Plik:** `16-operacje-alerty-magazynowe.json`  
**Start:** Harmonogram – codziennie 6:00

**Co robi:** Codziennie rano jedna zbiorcza wiadomość o produktach poniżej minimalnego stanu.

**Oczekiwany format źródła danych:** `{ "data": [ { "sku", "productName", "quantity" } ] }`

**Przebieg:**

- Codziennie 6:00 _(codziennie 6:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz stany magazynowe _(GET)_
- Rozbij listę produktów _(lista → pozycje)_
- **Stan poniżej progu?**
  - tak →
    - Zbierz listę braków
    - Alert niskiego stanu _(Slack)_
  - nie →
    - Stan OK _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `stanyUrl` | https://YOUR-WMS.example.com/api/stock |
| `progMinimalny` | 10 |

**Co naprawiono:**

- Sprawdzał tylko pierwszy produkt (lista nie była rozbijana).
- Zbiorczy alert zamiast spamu per produkt.

---

## Finanse

### 17 – Kategoryzacja transakcji i wydatków

**Plik:** `17-finanse-kategoryzacja-transakcji.json`  
**Start:** Harmonogram – codziennie 5:00

**Co robi:** AI przypisuje transakcjom kategorię kosztową; niepewne trafiają do ręcznego sprawdzenia.

**Oczekiwany format źródła danych:** `{ "data": [ { "id", "date", "amount", "counterparty", "title" } ] }`

**Przebieg:**

- Codziennie 5:00 _(codziennie 5:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz transakcje _(GET)_
- Rozbij listę transakcji _(lista → pozycje)_
- Pomiń już skategoryzowane _(pamięć workflow)_
- AI: kategoria kosztu _(prompt → model → wynik)_
- Zapamiętaj transakcję _(pamięć workflow)_
- **Pewna kategoria?**
  - tak →
    - Zapisz kategorię _(POST)_
  - nie →
    - Do ręcznej weryfikacji _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `transakcjeUrl` | https://YOUR-BANK.example.com/api/transactions?since=yesterday |
| `zapisUrl` | https://YOUR-ACCOUNTING.example.com/api/transactions/categorize |
| `kategorie` | paliwo, biuro, marketing, oprogramowanie, podroze, wynagrodzenia, podatki, inne |
| `progPewnosci` | 0.75 |

**Co naprawiono:**

- Każda transakcja była kategoryzowana wielokrotnie – teraz raz.
- Próg pewności zamiast ślepego zapisu.

---
### 18 – Przypomnienia o nieopłaconych fakturach

**Plik:** `18-finanse-przypomnienia-platnosci.json`  
**Start:** Harmonogram – dni robocze 9:00

**Co robi:** Uprzejme przypomnienia o przeterminowanych fakturach (maks. raz w tygodniu), po 30 dniach eskalacja do człowieka.

**Oczekiwany format źródła danych:** `{ "data": [ { "id", "number", "email", "amount", "dueDate" } ] }`

**Przebieg:**

- Dni robocze 9:00 _(dni robocze 9:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz nieopłacone faktury _(GET)_
- Rozbij listę faktur _(lista → pozycje)_
- Policz dni po terminie
- **Termin minął?**
  - tak →
    - **Do eskalacji?**
      - tak →
        - Eskalacja do człowieka _(Slack)_
      - nie →
        - Maks. 1 przypomnienie w tygodniu _(pamięć workflow)_
        - Wyślij przypomnienie _(e-mail)_
        - Zapamiętaj przypomnienie _(pamięć workflow)_
  - nie →
    - Jeszcze w terminie _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `fakturyUrl` | https://YOUR-BILLING.example.com/api/invoices?status=unpaid |
| `dniPoTerminie` | 1 |
| `dniDoEskalacji` | 30 |

**Co naprawiono:**

- Przypomnienie codziennie tej samej osobie – teraz maks. raz na tydzień.
- Treść maila zawierała dosłowny tekst {{ }}.

---
### 19 – Raporty finansowe na koniec miesiąca

**Plik:** `19-finanse-raporty-miesieczne.json`  
**Start:** Harmonogram – 1. dnia miesiąca 7:00

**Co robi:** 1. dnia miesiąca e-mail z podsumowaniem finansów poprzedniego miesiąca.

**Przebieg:**

- 1. dzień miesiąca 7:00 _(1. dnia miesiąca 7:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz dane finansowe _(GET)_
- AI: podsumowanie miesiąca _(prompt → model → wynik)_
- Wyślij raport _(e-mail)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `podsumowanieUrl` | https://YOUR-ACCOUNTING.example.com/api/summary |
| `odbiorcaRaportu` | ceo@twojafirma.pl |

**Co naprawiono:**

- Nie określał okresu – teraz automatycznie poprzedni miesiąc.
- Odbiorca w Konfiguracji zamiast wpisanego na sztywno.

---

## HR i rekrutacja

### 20 – Wstępna selekcja CV

**Plik:** `20-hr-selekcja-cv.json`  
**Start:** Webhook – POST /webhook/cv-nowe · Header Auth

**Co robi:** AI ocenia dopasowanie CV do wymagań; wszystko trafia do ATS, rekruter dostaje info o najlepszych.

**Przykład danych wejściowych:**

```json
{
  "name": "Jan Kowalski",
  "email": "jan@firma.pl",
  "cvText": "Specjalista ds. marketingu, 4 lata doświadczenia, Google Ads, angielski C1…"
}
```

**Wymagane dane wejściowe:** `name`, `email`, `cvText`

**Przebieg:**

- Nowe CV (Webhook) _(POST /webhook/cv-nowe · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: dopasowanie CV _(prompt → model → wynik)_
- Zapisz w ATS _(POST)_
- **Dopasowanie wysokie?**
  - tak →
    - Powiadom rekrutera _(Slack)_
  - nie →
    - Czeka na przegląd w ATS _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `stanowisko` | Nazwa stanowiska |
| `wymagania` | Wypisz wymagania: doświadczenie, umiejętności, języki |
| `progDopasowania` | 70 |
| `atsUrl` | https://YOUR-ATS.example.com/api/applications |

**Co naprawiono:**

- Decyzja zostaje przy człowieku (RODO/AI Act) – brak automatycznych odmów.
- Prompt ignoruje cechy niezwiązane z pracą.

---
### 21 – Automatyczne umawianie rozmów rekrutacyjnych

**Plik:** `21-hr-umawianie-rozmow.json`  
**Start:** Webhook – POST /webhook/rozmowa-rekrutacyjna · Header Auth

**Co robi:** Kandydat wybiera termin → wydarzenie w kalendarzu → potwierdzenie → Slack.

**Przykład danych wejściowych:**

```json
{
  "name": "Jan Kowalski",
  "email": "jan@firma.pl",
  "start": "2026-10-01T14:00:00+02:00"
}
```

**Wymagane dane wejściowe:** `name`, `email`, `start`

**Przebieg:**

- Wybrano termin rozmowy (Webhook) _(POST /webhook/rozmowa-rekrutacyjna · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Policz koniec rozmowy
- Utwórz wydarzenie _(POST)_
- Wyślij potwierdzenie _(e-mail)_
- Powiadom rekrutera _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `kalendarzUrl` | https://YOUR-CALENDAR.example.com/api/events |
| `czasTrwaniaMin` | 45 |

**Co naprawiono:**

- Potwierdzenie z dosłownym {{ }}.
- Walidacja terminu.

---
### 22 – Onboarding nowych pracowników

**Plik:** `22-hr-onboarding.json`  
**Start:** Webhook – POST /webhook/pracownik-nowy · Header Auth

**Co robi:** Nowy pracownik: konta w narzędziach, info dla HR i e-mail powitalny z checklistą.

**Przykład danych wejściowych:**

```json
{
  "fullName": "Anna Nowak",
  "email": "jan@firma.pl",
  "startDate": "2026-10-15",
  "role": "Specjalistka ds. marketingu"
}
```

**Wymagane dane wejściowe:** `fullName`, `email`, `startDate`, `role`

**Przebieg:**

- Nowy pracownik (Webhook) _(POST /webhook/pracownik-nowy · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Utwórz konta w narzędziach _(POST)_
- Powiadom zespół HR _(Slack)_
- Wyślij checklistę onboardingową _(e-mail)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `kontaUrl` | https://YOUR-IDENTITY.example.com/api/accounts |
| `checklista` | 1. Odbierz sprzęt 2. Zaloguj się do poczty 3. Spotkanie z opiekunem 4. Szkolenie BHP i ROD |

**Co naprawiono:**

- Po kroku HTTP ginęły imię i e-mail pracownika.
- Checklista w Konfiguracji.

---
### 23 – Chatbot HR

**Plik:** `23-hr-chatbot.json`  
**Start:** Webhook – POST /webhook/hr-pytanie · Header Auth

**Co robi:** Pracownicy pytają o urlopy/benefity, AI odpowiada tylko z polityk HR.

**Przykład danych wejściowych:**

```json
{
  "question": "Ile dni urlopu mi przysługuje?"
}
```

**Wymagane dane wejściowe:** `question`

**Przebieg:**

- Pytanie pracownika (Webhook) _(POST /webhook/hr-pytanie · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: odpowiedź HR _(prompt → model → wynik)_
- Zwróć odpowiedź _(odpowiedź HTTP)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `politykiHR` | Wklej tu regulamin pracy, politykę urlopową, benefity… |
| `kontaktHR` | hr@twojafirma.pl |

**Co naprawiono:**

- Odpowiedź szła na Slacka zamiast wracać do pytającego.

---

## Zaawansowane AI

### 24 – Agent głosowy (recepcja AI)

**Plik:** `24-ai-agent-glosowy.json`  
**Start:** Webhook – POST /webhook/agent-glosowy

**Co robi:** Wirtualna recepcja przez telefon: Twilio rozpoznaje mowę, AI odpowiada, Twilio czyta odpowiedź.

**Wymaga dodatkowo:** Numer Twilio, TWILIO_AUTH_TOKEN i NODE_FUNCTION_ALLOW_BUILTIN=crypto w n8n.

**Przykład danych wejściowych:**

```json
{
  "CallSid": "CA1f…",
  "SpeechResult": "Do której jesteście otwarci w sobotę?"
}
```

**Przebieg:**

- Połączenie Twilio (Webhook) _(POST /webhook/agent-glosowy)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Weryfikuj podpis Twilio
- **Klient coś powiedział?**
  - tak →
    - AI: odpowiedź głosowa _(prompt → model → wynik)_
    - Zbuduj TwiML odpowiedzi
    - Zwróć TwiML (odpowiedź) _(odpowiedź HTTP)_
  - nie →
    - Zbuduj TwiML powitania
    - Zwróć TwiML (powitanie) _(odpowiedź HTTP)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `publicznyUrlWebhooka` | https://n8n.YOUR-DOMAIN.pl/webhook/agent-glosowy |
| `powitanie` | Dzień dobry, tu wirtualna recepcja. W czym mogę pomóc? |
| `informacjeOFirmie` | Godziny otwarcia, adres, usługi, cennik orientacyjny… |

**Co naprawiono:**

- Przebudowa: łańcuch STT→AI→TTS nie mógł działać w czasie rozmowy – teraz Twilio Gather/Say (TwiML).
- Weryfikacja podpisu Twilio zamiast Header Auth (którego Twilio nie wysyła).

---
### 25 – RAG chatbot na dokumentacji firmy

**Plik:** `25-ai-rag-chatbot.json`  
**Start:** Webhook – POST /webhook/rag-pytanie · Header Auth

**Co robi:** Chatbot odpowiadający z dokumentacji firmy (wyszukiwanie w Supabase pgvector) ze źródłami.

**Wymaga dodatkowo:** Supabase z pgvector, zaindeksowane dokumenty (funkcja match_documents).

**Przykład danych wejściowych:**

```json
{
  "question": "Ile dni urlopu mi przysługuje?"
}
```

**Wymagane dane wejściowe:** `question`

**Przebieg:**

- Pytanie użytkownika (Webhook) _(POST /webhook/rag-pytanie · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Embedduj pytanie _(POST · openai)_
- Szukaj w bazie wektorowej _(POST · supabase)_
- Złóż kontekst
- AI: odpowiedź RAG _(prompt → model → wynik)_
- Zwróć odpowiedź _(odpowiedź HTTP)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `supabaseRpcUrl` | https://YOUR-PROJECT.supabase.co/rest/v1/rpc/match_documents |
| `liczbaFragmentow` | 5 |

**Co naprawiono:**

- Embedding i wyszukiwanie nie dostawały pytania.
- Fragmenty są łączone w jeden kontekst; odpowiedź wraca do pytającego.

---
### 26 – Analiza rozmów sprzedażowych

**Plik:** `26-ai-analiza-rozmow.json`  
**Start:** Webhook – POST /webhook/rozmowa-nagranie · Header Auth

**Co robi:** Nagranie rozmowy → transkrypcja → ocena AI → CRM; słabe rozmowy do coachingu.

**Wymaga dodatkowo:** Dostęp do nagrań rozmów, zgoda rozmówców na nagrywanie.

**Przykład danych wejściowych:**

```json
{
  "recordingUrl": "https://nagrania.firma.pl/call-88.mp3",
  "callId": "CALL-88"
}
```

**Wymagane dane wejściowe:** `recordingUrl`, `callId`

**Przebieg:**

- Nagranie zakończone (Webhook) _(POST /webhook/rozmowa-nagranie · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz nagranie _(GET)_
- Transkrypcja (Whisper) _(POST · openai)_
- AI: ocena rozmowy _(prompt → model → wynik)_
- Zapisz ocenę w CRM _(POST)_
- **Rozmowa do coachingu?**
  - tak →
    - Powiadom managera _(Slack)_
  - nie →
    - Ocena OK _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `crmOcenyUrl` | https://YOUR-CRM.example.com/api/calls/score |
| `progCoachingu` | 5 |

**Co naprawiono:**

- Whisper wymaga pliku (multipart) – dodane pobranie nagrania i poprawna wysyłka.

---
### 27 – Generowanie ofert i wycen

**Plik:** `27-ai-generowanie-ofert.json`  
**Start:** Webhook – POST /webhook/brief-oferta · Header Auth

**Co robi:** Z briefu AI przygotowuje ofertę z cennika i PDF; handlowiec zatwierdza przed wysyłką.

**Wymaga dodatkowo:** Serwis PDF oraz n8n z węzłem Wait w trybie formularza.

**Przykład danych wejściowych:**

```json
{
  "name": "Jan Kowalski",
  "email": "jan@firma.pl",
  "brief": "Strona + chatbot dla gabinetu fizjoterapii"
}
```

**Wymagane dane wejściowe:** `name`, `email`, `brief`

**Przebieg:**

- Brief klienta (Webhook) _(POST /webhook/brief-oferta · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: oferta _(prompt → model → wynik)_
- Wygeneruj PDF _(POST)_
- Poproś handlowca o akceptację _(e-mail)_
- Czekaj na akceptację _(formularz akceptacji)_
- **Zatwierdzona?**
  - tak →
    - Wyślij ofertę do klienta _(e-mail)_
  - nie →
    - Odrzucona lub wygasła _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `cennik` | Wklej cennik usług (pozycja – cena netto) |
| `pdfUrl` | https://YOUR-PDF-SERVICE.example.com/api/generate |
| `emailHandlowca` | handlowiec@twojafirma.pl |

**Co naprawiono:**

- Oferta z cenami szła do klienta bez kontroli – teraz formularz akceptacji.
- Ceny tylko z cennika w Konfiguracji.

---
### 28 – Wykrywanie anomalii w danych

**Plik:** `28-ai-wykrywanie-anomalii.json`  
**Start:** Harmonogram – co godzinę

**Co robi:** Co godzinę wykrywa nietypowe skoki/spadki metryk; maks. 1 alert na metrykę dziennie.

**Oczekiwany format źródła danych:** `{ "data": [ { "metricName", "current", "average" } ] }`

**Przebieg:**

- Co godzinę _(co godzinę)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz metryki _(GET)_
- Rozbij listę metryk _(lista → pozycje)_
- Oblicz odchylenie
- **Odchylenie ponad próg?**
  - tak →
    - Maks. 1 alert dziennie na metrykę _(pamięć workflow)_
    - Alert anomalii _(Slack)_
    - Zapamiętaj alert _(pamięć workflow)_
  - nie →
    - W normie _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `metrykiUrl` | https://YOUR-ANALYTICS.example.com/api/metrics |
| `progOdchylenia` | 30 |

**Co naprawiono:**

- Brak średniej dawał fałszywe alarmy – teraz brak danych = brak alertu.
- Alert co godzinę dla tej samej anomalii – teraz raz na dobę.

---

## E-commerce

### 29 – Odpowiedzi na opinie (z akceptacją)

**Plik:** `29-ecommerce-odpowiedzi-na-opinie.json`  
**Start:** Webhook – POST /webhook/opinia-sklep · Header Auth

**Co robi:** Opinie w sklepie: AI pisze projekt odpowiedzi, właściciel zatwierdza/poprawia, potem publikacja.

**Wymaga dodatkowo:** n8n z węzłem Wait w trybie formularza, WEBHOOK_URL ustawiony.

**Przykład danych wejściowych:**

```json
{
  "reviewId": "R-311",
  "text": "Szybka dostawa, produkt zgodny z opisem. Polecam!",
  "rating": 5
}
```

**Wymagane dane wejściowe:** `reviewId`, `text`

**Przebieg:**

- Nowa opinia (Webhook) _(POST /webhook/opinia-sklep · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pomiń już obsłużone opinie _(pamięć workflow)_
- AI: odpowiedź na opinię _(prompt → model → wynik)_
- Wyślij projekt do akceptacji _(e-mail)_
- Czekaj na decyzję właściciela _(formularz akceptacji)_
- **Zatwierdzona?**
  - tak →
    - Opublikuj odpowiedź _(POST)_
    - Zapamiętaj opinię _(pamięć workflow)_
  - nie →
    - Odrzucona lub wygasła _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `nazwaFirmy` | Nazwa sklepu |
| `emailWlasciciela` | wlasciciel@twojafirma.pl |
| `publikacjaUrl` | https://YOUR-PLATFORM.example.com/api/reviews |

**Co naprawiono:**

- Publikował automatycznie – wbrew obietnicy „nic bez Twojej zgody”.
- Kolizja ścieżki webhooka z Monitoringiem opinii (teraz „opinia-sklep”).

---
### 30 – Dynamiczne opisy produktów pod SEO

**Plik:** `30-ecommerce-opisy-produktow.json`  
**Start:** Webhook – POST /webhook/produkt-nowy · Header Auth

**Co robi:** Nowy produkt dostaje opis SEO (tytuł, meta, opis, punkty) jako szkic do przejrzenia.

**Przykład danych wejściowych:**

```json
{
  "productId": "P-204",
  "name": "Kubek ceramiczny 350 ml",
  "category": "Kuchnia",
  "attributes": {
    "kolor": "grafitowy",
    "material": "kamionka"
  }
}
```

**Wymagane dane wejściowe:** `productId`, `name`

**Przebieg:**

- Nowy produkt (Webhook) _(POST /webhook/produkt-nowy · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- AI: opis SEO _(prompt → model → wynik)_
- Przytnij do limitów SEO
- Zapisz szkic opisu w sklepie _(PUT)_
- Powiadom o szkicu _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `produktyUrl` | https://YOUR-SHOP.example.com/api/products |

**Co naprawiono:**

- Nadpisywał opis na żywo – teraz szkic.
- Limity długości SEO pilnowane w kodzie.

---
### 31 – Przypomnienia o porzuconym koszyku

**Plik:** `31-ecommerce-porzucone-koszyki.json`  
**Start:** Harmonogram – co godzinę

**Co robi:** Jedno przypomnienie o porzuconym koszyku, tylko dla osób ze zgodą marketingową.

**Oczekiwany format źródła danych:** `{ "data": [ { "cartId", "email", "firstName", "items": [..], "cartUrl", "marketingConsent" } ] }`

**Przebieg:**

- Co godzinę _(co godzinę)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz porzucone koszyki _(GET)_
- Rozbij listę koszyków _(lista → pozycje)_
- **Ma zgodę marketingową?**
  - tak →
    - Pomiń już przypomniane _(pamięć workflow)_
    - AI: przypomnienie _(prompt → model → wynik)_
    - **AI zadziałało?**
      - tak →
        - Wyślij przypomnienie _(e-mail)_
        - Zapamiętaj koszyk _(pamięć workflow)_
      - nie →
        - AI nie odpowiedziało – spróbuj w kolejnym przebiegu _(koniec)_
  - nie →
    - Brak zgody – nie wysyłaj _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `koszykiUrl` | https://YOUR-SHOP.example.com/api/carts/abandoned?minAge=1h&maxAge=24h |
| `nazwaSklepu` | Nazwa sklepu |

**Co naprawiono:**

- Wysyłał co godzinę do tych samych osób – teraz raz na koszyk.
- Sprawdza zgodę marketingową (RODO).

---
### 32 – Monitoring cen konkurencji

**Plik:** `32-ecommerce-monitoring-cen.json`  
**Start:** Harmonogram – codziennie 6:00

**Co robi:** Codziennie jeden raport produktów, których cena odbiega od konkurencji o więcej niż próg.

**Oczekiwany format źródła danych:** `{ "data": [ { "productName", "ownPrice", "competitorPrice", "competitor" } ] }`

**Przebieg:**

- Codziennie 6:00 _(codziennie 6:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz ceny konkurencji _(GET)_
- Rozbij listę cen _(lista → pozycje)_
- Porównaj z własną ceną
- **Różnica ponad próg?**
  - tak →
    - Zbierz raport cenowy
    - Alert cenowy _(Slack)_
  - nie →
    - Ceny w normie _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `cenyUrl` | https://YOUR-PRICE-SOURCE.example.com/api/prices |
| `progRoznicy` | 10 |

**Co naprawiono:**

- Sprawdzał tylko pierwszy produkt i tylko „drożej” – teraz wszystkie, w obie strony.
- Brak ceny nie daje fałszywego alertu.

---

## Sprzedaż i leady

### 33 – Zapytanie o termin (sala / usługa)

**Plik:** `33-sprzedaz-zapytanie-o-termin.json`  
**Start:** Webhook – POST /webhook/zapytanie-termin · Header Auth

**Co robi:** Formularz „zapytaj o termin” (sale, restauracje, usługi): zgłoszenie trafia do CRM, biuro dostaje pełny e-mail, właściciel krótki SMS, a klient numer zgłoszenia.

**Wymaga dodatkowo:** Bramka SMS (SMSAPI / Twilio), CRM.

**Przykład danych wejściowych:**

```json
{
  "name": "Aleksandra Nowak",
  "phone": "+48 600 100 200",
  "email": "ola@example.pl",
  "date": "2027-06-12",
  "guests": 90,
  "type": "wesele",
  "message": "Czy jest możliwość przyjęcia w ogrodzie?"
}
```

**Wymagane dane wejściowe:** `name`, `phone`, `date`, `guests`, `type`

**Przebieg:**

- Zapytanie z formularza (Webhook) _(POST /webhook/zapytanie-termin · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Sprawdź telefon, datę i liczbę gości
- Zapisz zapytanie w CRM _(POST)_
- Powiadom biuro (pełne dane) _(e-mail)_
- SMS do właściciela (skrót) _(POST)_
- Potwierdź formularzowi _(odpowiedź HTTP)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `nazwaObiektu` | Nazwa obiektu |
| `crmUrl` | https://YOUR-CRM.example.com/api/leads |
| `emailBiura` | biuro@twojafirma.pl |
| `smsUrl` | https://YOUR-SMS-GATEWAY.example.com/api/sms |
| `telefonWlasciciela` | +48600000000 |

**Co naprawiono:**

- Wypełnia lukę ze stron Dom Przyjęć (inquiryEndpoint nie miał backendu).
- Walidacja telefonu (+48), daty i liczby gości.
- Awaria SMS nie gubi zgłoszenia – jest już w CRM i e-mailu.
- Zapytanie nie blokuje kalendarza – termin potwierdza człowiek.

---

## Obsługa klienta

### 34 – Weryfikacja numeru kodem SMS

**Plik:** `34-obsluga-weryfikacja-sms.json`  
**Start:** Webhook – POST /webhook/weryfikacja-sms · Header Auth

**Co robi:** Weryfikacja numeru telefonu kodem SMS przed ważną akcją (np. zamówieniem cateringu) – jeden webhook: wyślij kod / sprawdź kod.

**Wymaga dodatkowo:** Bramka SMS, OTP_SEKRET i NODE_FUNCTION_ALLOW_BUILTIN=crypto w n8n, backend z CAPTCHA przed webhookiem.

**Przykład danych wejściowych:**

```json
{
  "action": "start",
  "phone": "+48600100200"
}
```

**Wymagane dane wejściowe:** `action`, `phone`

**Przebieg:**

- Żądanie kodu / weryfikacji (Webhook) _(POST /webhook/weryfikacja-sms · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Obsłuż kod SMS _(pamięć workflow)_
- **Wysłać SMS?**
  - tak →
    - Wyślij SMS z kodem _(POST)_
    - Potwierdź wysłanie _(odpowiedź HTTP)_
  - nie →
    - Zwróć wynik _(odpowiedź HTTP)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `smsUrl` | https://YOUR-SMS-GATEWAY.example.com/api/sms |
| `nazwaNadawcy` | Twoja firma |
| `waznoscMin` | 10 |
| `maksProb` | 3 |
| `maksWysylekNaGodzine` | 3 |

**Co naprawiono:**

- Kod przechowywany tylko jako HMAC, porównanie w stałym czasie.
- Maks. 3 próby, ważność 10 min, maks. 3 SMS na numer na godzinę.
- Historia wykonań wyłączona – kod nie trafia do bazy n8n.
- Test znalazł i naprawił błąd: udana weryfikacja resetowała limit wysyłek.

---

## Operacje i dokumenty

### 35 – Przypomnienia o wizytach i rezerwacjach

**Plik:** `35-operacje-przypomnienia-o-wizytach.json`  
**Start:** Harmonogram – codziennie 18:00

**Co robi:** Dzień przed wizytą klient dostaje SMS (albo e-mail) z godziną, adresem i linkiem do zmiany terminu – mniej nieobecności.

**Wymaga dodatkowo:** System rezerwacji z API, bramka SMS.

**Oczekiwany format źródła danych:** `{ "data": [ { "id", "name", "phone", "email", "start", "service", "cancelUrl" } ] }`

**Przebieg:**

- Codziennie 18:00 _(codziennie 18:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz jutrzejsze rezerwacje _(GET)_
- Rozbij listę rezerwacji _(lista → pozycje)_
- Pomiń już przypomniane _(pamięć workflow)_
- Przygotuj treść
- **Ma numer telefonu?**
  - tak →
    - Wyślij SMS _(POST)_
    - Zapamiętaj (SMS) _(pamięć workflow)_
  - nie →
    - **Ma e-mail?**
      - tak →
        - Wyślij e-mail _(e-mail)_
        - Zapamiętaj (e-mail) _(pamięć workflow)_
      - nie →
        - Brak kontaktu do klienta _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `rezerwacjeUrl` | https://YOUR-BOOKING.example.com/api/bookings |
| `smsUrl` | https://YOUR-SMS-GATEWAY.example.com/api/sms |
| `nazwaFirmy` | Nazwa firmy |
| `adres` | ul. Przykładowa 1, Rybnik |

**Co naprawiono:**

- SMS, gdy jest numer; e-mail jako zapas; brak kontaktu → Slack.
- Każda rezerwacja dostaje jedno przypomnienie (pamięć workflow).
- Godzina w strefie Europe/Warsaw.

---

## Marketing

### 36 – Prośba o opinię po zakupie lub wizycie

**Plik:** `36-marketing-prosba-o-opinie.json`  
**Start:** Webhook – POST /webhook/zamowienie-zrealizowane · Header Auth

**Co robi:** Kilka dni po zrealizowanym zamówieniu klient dostaje uprzejmą prośbę o opinię w Google – buduje reputację razem z Monitoringiem opinii.

**Wymaga dodatkowo:** Link do wystawiania opinii w Google (Profil Firmy), API sklepu.

**Przykład danych wejściowych:**

```json
{
  "orderId": "ZAM-1042",
  "email": "jan@firma.pl",
  "name": "Jan Kowalski"
}
```

**Wymagane dane wejściowe:** `orderId`, `email`, `name`

**Przebieg:**

- Zamówienie zrealizowane (Webhook) _(POST /webhook/zamowienie-zrealizowane · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pomiń już poproszone _(pamięć workflow)_
- Odczekaj kilka dni _(wznawia się sam)_
- Sprawdź status zamówienia _(GET)_
- **Nadal zrealizowane?**
  - tak →
    - Poproś o opinię _(e-mail)_
    - Zapamiętaj prośbę _(pamięć workflow)_
  - nie →
    - Anulowane lub zwrócone – bez prośby _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `nazwaFirmy` | Nazwa firmy |
| `linkDoOpinii` | https://g.page/r/YOUR-PLACE-ID/review |
| `dniOczekiwania` | 3 |
| `zamowieniaUrl` | https://YOUR-SHOP.example.com/api/orders |

**Co naprawiono:**

- Workflow sam odczekuje X dni (węzeł Wait), potem sprawdza, czy zamówienie nie zostało anulowane.
- Prośbę dostaje każdy – bez filtrowania zadowolonych (zakaz „review gating” w Google) i bez nagród.
- Jedna prośba na zamówienie.

---

## Obsługa klienta

### 37 – Asystent skrzynki Gmail (szkice odpowiedzi)

**Plik:** `37-obsluga-skrzynka-gmail.json`  
**Start:** Gmail – nowy e-mail (co minutę)

**Co robi:** AI czyta nowe maile, nadaje kategorię i pilność, a gdy trzeba odpowiedzieć – tworzy szkic odpowiedzi w tym samym wątku Gmaila. Pilne od razu na Slacka.

**Wymaga dodatkowo:** Konto Google Workspace/Gmail (OAuth2).

**Przebieg:**

- Nowy e-mail w skrzynce _(nowy e-mail (co minutę))_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Przygotuj wiadomość
- **Do obsłużenia?**
  - tak →
    - AI: analiza e-maila _(prompt → model → wynik)_
    - **Wymaga odpowiedzi?**
      - tak →
        - Utwórz szkic odpowiedzi _(Gmail · szkic)_
        - **Pilne?**
          - tak →
            - Powiadom o pilnym mailu _(Slack)_
          - nie →
            - Zwykły priorytet _(koniec)_
      - nie →
        - Tylko informacja – bez szkicu _(koniec)_
  - nie →
    - Automatyczna wiadomość – pomiń _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `kategorie` | oferta, wsparcie, faktury, rekrutacja, wspolpraca, inne |
| `kontekstFirmy` | Opisz krótko firmę, usługi, godziny pracy i kontakt – AI użyje tego w szkicach. |
| `podpis` | Pozdrawiam, Zespół STFS |
| `pomijaj` | noreply,no-reply,newsletter,mailer-daemon,notifications |

**Co naprawiono:**

- Tylko szkice – nic nie jest wysyłane bez człowieka.
- Newslettery i noreply pomijane (nie marnuje tokenów).
- Ochrona przed poleceniami ukrytymi w treści maila (prompt injection).

---

## Marketing

### 38 – Tygodniowy raport ruchu na stronie (GA4 + Search Console)

**Plik:** `38-marketing-raport-ruchu-strony.json`  
**Start:** Harmonogram – poniedziałki 7:00

**Co robi:** W poniedziałek klient dostaje e-mail: ruch na stronie z GA4 (tydzień do tygodnia), 10 fraz z Google i 3 rekomendacje AI prostym językiem.

**Wymaga dodatkowo:** GA4 i Search Console z dostępem do odczytu (Google OAuth2).

**Przebieg:**

- Poniedziałek 7:00 _(poniedziałki 7:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz dane GA4 _(POST · googleapis)_
- Pobierz frazy z Search Console _(POST · googleapis)_
- Połącz dane
- AI: komentarz do ruchu _(prompt → model → wynik)_
- Wyślij raport _(e-mail)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `ga4PropertyId` | YOUR_PROPERTY_ID |
| `witrynaSearchConsole` | sc-domain:stfs.pl |
| `odbiorca` | kontakt@stfs.pl |
| `nazwaStrony` | stfs.pl |

**Co naprawiono:**

- Porównanie z poprzednim tygodniem w procentach.
- Okres Search Console przesunięty o 2 dni (opóźnienie danych Google).
- AI używa tylko podanych liczb.

---

## Operacje i dokumenty

### 39 – Monitoring dostępności stron

**Plik:** `39-operacje-monitoring-strony.json`  
**Start:** Harmonogram – co 5 minut

**Co robi:** Co 5 minut sprawdza, czy strony (klientów, stfs.pl, webhook chatbota) działają. Alert przy awarii i informacja po przywróceniu z czasem trwania.

**Przebieg:**

- Co 5 minut _(co 5 minut)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Lista adresów
- Sprawdź adres _(GET)_
- Oceń odpowiedź
- Wykryj zmianę stanu _(pamięć workflow)_
- **Awaria?**
  - tak →
    - Alert: strona nie działa _(Slack)_
    - Alert e-mailem _(e-mail)_
  - nie →
    - Strona przywrócona _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `adresy` | https://stfs.pl,https://www.stfs.pl |
| `progAwarii` | 2 |
| `odbiorcaAlertow` | kontakt@stfs.pl |

**Co naprawiono:**

- Alarm dopiero po 2 błędach z rzędu – bez fałszywych alarmów.
- Jeden alert na awarię, nie co 5 minut.
- Udane przebiegi nie są zapisywane (288 dziennie).

---

## System

### 40 – Kopia zapasowa workflowów n8n (GitHub)

**Plik:** `40-system-kopia-workflowow.json`  
**Start:** Harmonogram – codziennie 3:00

**Co robi:** Każdej nocy zapisuje wszystkie workflowy z n8n w prywatnym repo GitHub – historia zmian i kopia na wypadek awarii serwera.

**Wymaga dodatkowo:** Klucz API n8n, prywatne repo GitHub, token z prawem zapisu do tego repo.

**Przebieg:**

- Codziennie 3:00 _(codziennie 3:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz workflowy z n8n _(GET)_
- Rozbij listę workflowów _(lista → pozycje)_
- Przygotuj plik
- Sprawdź plik w repo _(GET)_
- Porównaj z repo
- **Zmieniony?**
  - tak →
    - Zapisz w GitHub _(PUT)_
  - nie →
    - Bez zmian _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `n8nApiUrl` | https://n8n.stfs.pl/api/v1 |
| `repo` | STFS-Workflows/n8n-backup |
| `galaz` | main |
| `katalog` | workflows |

**Co naprawiono:**

- Commit tylko, gdy workflow się zmienił.
- Z kopii usuwane staticData (m.in. adresy IP z limitów chatbota) i pinData.
- Zapisy do GitHuba po kolei, żeby nie było konfliktów.

---

## Finanse

### 41 – Weryfikacja kontrahenta (biała lista VAT)

**Plik:** `41-finanse-weryfikacja-kontrahenta.json`  
**Start:** Webhook – POST /webhook/weryfikacja-kontrahenta · Header Auth

**Co robi:** Przed zapłatą faktury sprawdza kontrahenta w białej liście VAT Ministerstwa Finansów: poprawność NIP, status „Czynny” i czy rachunek jest w wykazie. Zapisuje dowód sprawdzenia.

**Wymaga dodatkowo:** Nic poza n8n – API białej listy MF jest publiczne (limity dzienne).

**Przykład danych wejściowych:**

```json
{
  "nip": "5260250274",
  "bankAccount": "12 1010 1010 0000 0000 0000 0000",
  "invoiceNumber": "FV/2026/09/118"
}
```

**Wymagane dane wejściowe:** `nip`

**Przebieg:**

- Sprawdź kontrahenta (Webhook) _(POST /webhook/weryfikacja-kontrahenta · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Sprawdź NIP i rachunek
- Zapytaj białą listę MF _(GET)_
- Oceń wynik
- Zapisz potwierdzenie (requestId) _(POST)_
- **Kontrahent OK?**
  - tak →
    - Zwróć: OK _(odpowiedź HTTP)_
  - nie →
    - Alert: problem z kontrahentem _(Slack)_
    - Zwróć: problem _(odpowiedź HTTP)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `archiwumUrl` | https://YOUR-ACCOUNTING.example.com/api/whitelist-checks |

**Co naprawiono:**

- Suma kontrolna NIP i długość rachunku sprawdzane przed zapytaniem do MF.
- requestId z MF archiwizowany jako dowód sprawdzenia w dniu zapłaty.
- Problem → Slack z prośbą o wstrzymanie płatności.

---
### 42 – Przeliczanie faktur walutowych po kursie NBP

**Plik:** `42-finanse-przeliczanie-walut-nbp.json`  
**Start:** Webhook – POST /webhook/przelicz-walute · Header Auth

**Co robi:** Przelicza kwotę faktury walutowej na PLN po średnim kursie NBP z ostatniego dnia roboczego przed datą faktury i zwraca gotową adnotację (kurs, tabela, data).

**Wymaga dodatkowo:** Nic poza n8n – API NBP jest publiczne.

**Przykład danych wejściowych:**

```json
{
  "amount": 1250.5,
  "currency": "EUR",
  "invoiceDate": "2026-09-21"
}
```

**Wymagane dane wejściowe:** `amount`, `currency`, `invoiceDate`

**Przebieg:**

- Przelicz kwotę (Webhook) _(POST /webhook/przelicz-walute · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Przygotuj zapytanie
- Pobierz kursy NBP _(GET)_
- Przelicz na PLN
- Zwróć przeliczenie _(odpowiedź HTTP)_

**Co naprawiono:**

- Pobiera 10 dni wstecz, więc weekendy i święta nie psują wyniku.
- Wybiera ostatni kurs sprzed daty faktury, nie z tego samego dnia.
- Kwota zaokrąglana do groszy.

---

## Marketing

### 43 – Newsletter z nowych wpisów na blogu

**Plik:** `43-marketing-newsletter-z-bloga.json`  
**Start:** Harmonogram – czwartki 10:00

**Co robi:** Co tydzień z nowych wpisów na blogu powstaje szkic newslettera z krótkim wstępem AI – gotowy do przejrzenia i wysłania w systemie mailingowym.

**Wymaga dodatkowo:** Blog z kanałem RSS, system mailingowy z API (Mailchimp / Brevo / MailerLite).

**Przebieg:**

- Czwartek 10:00 _(czwartki 10:00)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Czytaj RSS bloga _(RSS)_
- Wybierz nowe wpisy
- AI: wstęp newslettera _(prompt → model → wynik)_
- Złóż treść newslettera
- Utwórz szkic kampanii _(POST)_
- Szkic newslettera gotowy _(Slack)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `rssUrl` | https://stfs.pl/blog/rss.xml |
| `dni` | 7 |
| `nazwaFirmy` | STFS |
| `espUrl` | https://YOUR-ESP.example.com/api/campaigns |
| `listaId` | YOUR_LIST_ID |

**Co naprawiono:**

- Tylko szkic kampanii – wysyłkę klika człowiek.
- Brak nowych wpisów = brak newslettera.
- Treść HTML escapowana (bez wstrzykiwania kodu z RSS).

---
### 44 – Publikacja postów z kalendarza treści

**Plik:** `44-marketing-publikacja-social-media.json`  
**Start:** Harmonogram – co 15 minut

**Co robi:** Posty zaplanowane w arkuszu Google (status „zatwierdzony”) same publikują się na stronie firmowej na Facebooku o wyznaczonej godzinie, a arkusz dostaje status i ID posta.

**Wymaga dodatkowo:** Arkusz Google z kalendarzem, token strony Facebook z pages_manage_posts (aplikacja Meta).

**Przebieg:**

- Co 15 minut _(co 15 minut)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Czytaj kalendarz treści _(Google Sheets)_
- Wybierz posty do publikacji
- Pomiń już opublikowane _(pamięć workflow)_
- Opublikuj na Facebooku _(POST · facebook)_
- Zapamiętaj publikację _(pamięć workflow)_
- Oznacz w arkuszu _(Google Sheets)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `arkuszUrl` | https://docs.google.com/spreadsheets/d/YOUR-SHEET-ID/edit |
| `zakladka` | Kalendarz |
| `fbPageId` | YOUR_PAGE_ID |

**Co naprawiono:**

- Publikuje tylko zatwierdzone posty z datą, która już minęła.
- Pamięć workflow chroni przed podwójną publikacją.
- Udane przebiegi co 15 minut nie są zapisywane.

---

## Obsługa klienta

### 45 – Analiza ankiet NPS i kontakt z niezadowolonymi

**Plik:** `45-obsluga-analiza-ankiet-nps.json`  
**Start:** Webhook – POST /webhook/ankieta-nps · Header Auth

**Co robi:** Każda odpowiedź NPS jest zapisywana; niezadowoleni klienci (0–6) od razu trafiają do zespołu jako zgłoszenie „oddzwoń” ze streszczeniem AI, zadowoleni dostają podziękowanie.

**Wymaga dodatkowo:** Narzędzie ankiet z webhookiem (Tally / Typeform), helpdesk lub CRM.

**Przykład danych wejściowych:**

```json
{
  "score": 4,
  "email": "jan@firma.pl",
  "name": "Jan",
  "comment": "Długo czekałem na odpowiedź z serwisu."
}
```

**Wymagane dane wejściowe:** `score`, `email`

**Przebieg:**

- Odpowiedź z ankiety (Webhook) _(POST /webhook/ankieta-nps · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Policz grupę NPS
- Zapisz odpowiedź _(POST)_
- **Detraktor?**
  - tak →
    - Weź odpowiedź z ankiety
    - AI: komentarz detraktora _(prompt → model → wynik)_
    - Utwórz zgłoszenie „oddzwoń” _(POST)_
    - Alert: niezadowolony klient _(Slack)_
  - nie →
    - **Promotor?**
      - tak →
        - Podziękuj promotorowi _(e-mail)_
      - nie →
        - Pasywny – tylko zapis _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `zapisUrl` | https://YOUR-CRM.example.com/api/nps |
| `helpdeskUrl` | https://YOUR-HELPDESK.example.com/api/tickets |
| `nazwaFirmy` | Nazwa firmy |

**Co naprawiono:**

- Podział detraktor / pasywny / promotor liczony w kodzie, nie przez AI.
- Promotorzy nie są tu proszeni o opinię (bez „review gating”).
- Brak komentarza nie blokuje zgłoszenia.

---

## E-commerce

### 46 – Zwroty i reklamacje (numer RMA i instrukcja)

**Plik:** `46-ecommerce-zwroty-i-reklamacje.json`  
**Start:** Webhook – POST /webhook/zwrot-reklamacja · Header Auth

**Co robi:** Formularz zwrotu lub reklamacji: sprawdza termin (14 dni na zwrot, 2 lata na reklamację) na podstawie daty dostawy z systemu, nadaje numer RMA i wysyła instrukcję odesłania.

**Wymaga dodatkowo:** API sklepu z datą dostawy zamówienia.

**Przykład danych wejściowych:**

```json
{
  "orderId": "ZAM-1042",
  "email": "jan@firma.pl",
  "typ": "zwrot",
  "reason": "Zły rozmiar"
}
```

**Wymagane dane wejściowe:** `orderId`, `email`, `typ`

**Przebieg:**

- Zgłoszenie zwrotu / reklamacji (Webhook) _(POST /webhook/zwrot-reklamacja · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz zamówienie _(GET)_
- Oceń termin
- **W terminie?**
  - tak →
    - Załóż zgłoszenie RMA _(POST)_
    - Wyślij instrukcję _(e-mail)_
    - Potwierdź (w terminie) _(odpowiedź HTTP)_
  - nie →
    - Do decyzji człowieka _(Slack)_
    - Potwierdź przyjęcie zgłoszenia _(e-mail)_
    - Potwierdź (do weryfikacji) _(odpowiedź HTTP)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `zamowieniaUrl` | https://YOUR-SHOP.example.com/api/orders |
| `rmaUrl` | https://YOUR-SHOP.example.com/api/returns |
| `dniNaZwrot` | 14 |
| `dniNaReklamacje` | 730 |
| `adresZwrotow` | Magazyn zwrotów, ul. Przykładowa 1, 44-200 Rybnik |

**Co naprawiono:**

- Data dostawy i e-mail brane z zamówienia w sklepie, nie od klienta.
- Po terminie nic nie jest odrzucane automatycznie – decyduje człowiek, klient dostaje potwierdzenie.
- Przypomnienie o 14 dniach na odpowiedź na reklamację.

---

## HR i rekrutacja

### 47 – Wnioski urlopowe z akceptacją przełożonego

**Plik:** `47-hr-wnioski-urlopowe.json`  
**Start:** Webhook – POST /webhook/wniosek-urlopowy · Header Auth

**Co robi:** Wniosek urlopowy z liczeniem dni roboczych (bez weekendów i polskich świąt), akceptacją przełożonego w formularzu i wpisem do kalendarza zespołu.

**Wymaga dodatkowo:** n8n z węzłem Wait w trybie formularza, WEBHOOK_URL, kalendarz zespołu z API.

**Przykład danych wejściowych:**

```json
{
  "employeeName": "Anna Nowak",
  "email": "anna@firma.pl",
  "managerEmail": "szef@firma.pl",
  "from": "2026-12-21",
  "to": "2026-12-31",
  "type": "wypoczynkowy"
}
```

**Wymagane dane wejściowe:** `employeeName`, `email`, `managerEmail`, `from`, `to`, `type`

**Przebieg:**

- Wniosek urlopowy (Webhook) _(POST /webhook/wniosek-urlopowy · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Policz dni robocze
- Poproś przełożonego o decyzję _(e-mail)_
- Czekaj na decyzję przełożonego _(formularz akceptacji)_
- **Zatwierdzony?**
  - tak →
    - Dodaj urlop do kalendarza zespołu _(POST)_
    - Potwierdź pracownikowi _(e-mail)_
  - nie →
    - Poinformuj o odrzuceniu _(e-mail)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `kalendarzUrl` | https://YOUR-CALENDAR.example.com/api/events |

**Co naprawiono:**

- Polskie święta liczone automatycznie, także ruchome (Wielkanoc, Boże Ciało) i Wigilia.
- Przełożony może dopisać komentarz, który trafia do pracownika.
- Brak decyzji w 5 dni = informacja do pracownika zamiast wiszącego wniosku.

---

## Zaawansowane AI

### 48 – Notatka i zadania ze spotkania (transkrypcja AI)

**Plik:** `48-ai-notatki-ze-spotkan.json`  
**Start:** Webhook – POST /webhook/notatka-spotkanie · Header Auth

**Co robi:** Z nagrania spotkania powstaje notatka (streszczenie, decyzje, zadania), która trafia do uczestników, a każde zadanie ląduje w narzędziu do zadań.

**Wymaga dodatkowo:** Nagrania spotkań (zgoda uczestników), narzędzie zadań z API (Trello / Asana / ClickUp).

**Przykład danych wejściowych:**

```json
{
  "recordingUrl": "https://nagrania.firma.pl/spotkanie-0923.m4a",
  "title": "Planowanie Q4",
  "participants": "anna@firma.pl,jan@firma.pl"
}
```

**Wymagane dane wejściowe:** `recordingUrl`, `title`, `participants`

**Przebieg:**

- Nagranie spotkania (Webhook) _(POST /webhook/notatka-spotkanie · Header Auth)_
- Walidacja danych _(wymagane pola)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz nagranie _(GET)_
- Transkrypcja (Whisper) _(POST · openai)_
- AI: notatka ze spotkania _(prompt → model → wynik)_
- Wyślij notatkę uczestnikom _(e-mail)_
- Rozbij zadania
- Utwórz zadanie _(POST)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `zadaniaUrl` | https://YOUR-TASKS.example.com/api/tasks |

**Co naprawiono:**

- AI wpisuje osobę i termin tylko, gdy padły w rozmowie (bez zgadywania).
- Maks. 30 zadań, tworzone po kolei.
- Przypomnienie o zgodzie na nagrywanie (RODO).

---

## Finanse

### 49 – Kontrola wysyłki faktur do KSeF

**Plik:** `49-finanse-kontrola-ksef.json`  
**Start:** Harmonogram – dni robocze co 2 h (8–18)

**Co robi:** W dni robocze co 2 godziny sprawdza, czy faktury trafiły do KSeF. Odrzucone lub bez potwierdzenia dłużej niż X godzin → alert.

**Wymaga dodatkowo:** System fakturowy zintegrowany z KSeF, udostępniający status wysyłki przez API.

**Oczekiwany format źródła danych:** `{ "data": [ { "id", "number", "issuedAt", "ksefStatus": "accepted|pending|rejected", "ksefError" } ] }`

**Przebieg:**

- Dni robocze co 2 godziny _(dni robocze co 2 h (8–18))_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz faktury ze statusem KSeF _(GET)_
- Rozbij listę faktur _(lista → pozycje)_
- Oceń status KSeF
- **Problem z KSeF?**
  - tak →
    - Pomiń już zgłoszone _(pamięć workflow)_
    - Alert KSeF _(Slack)_
    - Zapamiętaj zgłoszenie _(pamięć workflow)_
  - nie →
    - Faktura przyjęta lub w toku _(koniec)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `fakturyUrl` | https://YOUR-BILLING.example.com/api/invoices?ksef=1&days=3 |
| `godzinDoAlarmu` | 12 |

**Co naprawiono:**

- Alert raz na fakturę i status (bez spamu co 2 godziny).
- Działa na danych z systemu fakturowego – bez własnej integracji z API KSeF.
- Próg godzin w Konfiguracji.

---

## System

### 50 – Tygodniowy raport zdrowia automatyzacji

**Plik:** `50-system-raport-zdrowia-automatyzacji.json`  
**Start:** Harmonogram – poniedziałki 8:30

**Co robi:** W poniedziałek raport: liczba błędów z tygodnia, workflowy psujące się najczęściej i aktywne workflowy bez ustawionego Error Workflow.

**Wymaga dodatkowo:** Klucz API n8n.

**Przebieg:**

- Poniedziałek 8:30 _(poniedziałki 8:30)_
- Konfiguracja _(adresy, progi, odbiorcy)_
- Pobierz aktywne workflowy _(GET)_
- Pobierz błędy wykonań _(GET)_
- Zbierz statystyki
- Raport na Slacku _(Slack)_
- Raport e-mailem _(e-mail)_

**Do uzupełnienia w węźle Konfiguracja:**

| Pole | Wartość domyślna |
|---|---|
| `n8nApiUrl` | https://n8n.stfs.pl/api/v1 |
| `odbiorca` | kontakt@stfs.pl |
| `dni` | 7 |

**Co naprawiono:**

- Wskazuje workflowy, których awarii nikt by nie zauważył.
- Razem z 00 i 40 tworzy pakiet „opieka nad automatyzacjami”.
- Czyta tylko metadane wykonań, bez danych klientów.

---
