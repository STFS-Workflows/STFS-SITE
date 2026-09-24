# Nowe workflowy 33–50 (23.09.2026)

Katalog jest kompletny: **50 workflowów** (32 poprawione + 18 nowych), plus workflowy działające u nas: 00 (obsługa błędów), chatbot strony i Monitoring opinii. Nowe zbudowano od razu na poprawionej bibliotece `_lib.js`, więc mają te same zabezpieczenia: walidacja, Konfiguracja, credentiale, pamięć bez duplikatów, obie gałęzie IF.

## Część 1: 33–40

### Dlaczego te 8

Wybrane tak, żeby: (1) domknąć luki znalezione w audycie – strony Dom Przyjęć wołały endpointy, których nie było; (2) dać każdej usłudze z oferty STFS gotowy „silnik”; (3) zabezpieczyć samo STFS (monitoring, kopie).

| Nr | Workflow | Start | Do jakiej usługi / po co |
|---|---|---|---|
| 33 | Zapytanie o termin (sala / usługa) | webhook `zapytanie-termin` | Backend formularza stron Dom Przyjęć (`inquiryEndpoint`) i każdej firmy z rezerwacją terminów |
| 34 | Weryfikacja numeru kodem SMS | webhook `weryfikacja-sms` | `smsStartEndpoint` / `smsVerifyEndpoint` ze stron Dom Przyjęć (np. catering) |
| 35 | Przypomnienia o wizytach i rezerwacjach | codziennie 18:00 | „System rezerwacji” – mniej nieobecności |
| 36 | Prośba o opinię po zakupie lub wizycie | webhook `zamowienie-zrealizowane` + odczekanie | „Monitoring opinii” – więcej opinii w Google |
| 37 | Asystent skrzynki Gmail (szkice) | nowy e-mail (co minutę) | „Automatyzacja skrzynki Gmail” – rdzeń usługi |
| 38 | Tygodniowy raport ruchu (GA4 + Search Console) | poniedziałki 7:00 | „Strony internetowe” – klient widzi efekty co tydzień |
| 39 | Monitoring dostępności stron | co 5 minut | Opieka nad stronami klientów i stfs.pl, webhook chatbota |
| 40 | Kopia zapasowa workflowów n8n (GitHub) | codziennie 3:00 | Bezpieczeństwo STFS: historia zmian i kopia serwera n8n |

### Najważniejsze decyzje projektowe

- **33** – zapytanie nie blokuje kalendarza (termin potwierdza człowiek); awaria SMS nie gubi zgłoszenia, bo jest już w CRM i e-mailu; formularz dostaje numer zgłoszenia.
- **34** – kod nigdy nie jest zapisany jawnie (HMAC z sekretem), 3 próby, 10 minut, 3 SMS na godzinę, historia wykonań wyłączona. Test wykrył i naprawił błąd: udana weryfikacja zerowała limit wysyłek.
- **35** – SMS, gdy jest telefon; e-mail jako zapas; bez kontaktu → Slack; jedno przypomnienie na rezerwację.
- **36** – prośbę dostaje **każdy** klient ze zrealizowanym zamówieniem. Nie filtrujemy zadowolonych (Google zakazuje „review gating”) i nie dajemy nagród za opinie. Anulowane/zwrócone zamówienia są pomijane.
- **37** – tylko **szkice** w Gmailu, nic nie wychodzi samo; newslettery pomijane; model ma zakaz wykonywania poleceń z treści maila.
- **38** – porównanie tydzień do tygodnia; okres Search Console przesunięty o 2 dni (opóźnienie danych).
- **39** – alarm po 2 błędach z rzędu, jeden alert na awarię, wiadomość po przywróceniu z czasem trwania.
- **40** – commit tylko przy zmianie; z kopii usuwane `staticData` (m.in. adresy IP z limitów chatbota) i `pinData`; zapisy do GitHuba po kolei. Repo musi być **prywatne**.

### Czego wymagają

| Nr | Wymaga |
|---|---|
| 33 | CRM z API, bramka SMS (SMSAPI / Twilio), SMTP |
| 34 | Bramka SMS, `OTP_SEKRET` i `NODE_FUNCTION_ALLOW_BUILTIN=crypto` w n8n, własny backend z CAPTCHA przed webhookiem |
| 35 | System rezerwacji z API, bramka SMS, SMTP, Slack |
| 36 | Link „napisz opinię” z Profilu Firmy w Google, API sklepu, SMTP; n8n musi działać ciągle (węzeł Wait) |
| 37 | Gmail / Google Workspace (OAuth2), OpenAI, Slack |
| 38 | GA4 i Search Console (Google OAuth2, odczyt), OpenAI, SMTP |
| 39 | Slack, SMTP |
| 40 | Klucz API n8n, prywatne repo GitHub, token z prawem zapisu do tego repo |

## Część 2: 41–50

Ostatnia dziesiątka domyka katalog rzeczami typowo polskimi (biała lista VAT, kursy NBP, KSeF, zwroty 14 dni, polskie święta w urlopach) i usługami, których jeszcze brakowało: newsletter, publikacja postów, NPS, notatki ze spotkań oraz raport „zdrowia” automatyzacji.

| Nr | Workflow | Start | Po co |
|---|---|---|---|
| 41 | Weryfikacja kontrahenta (biała lista VAT) | webhook `weryfikacja-kontrahenta` | Przed zapłatą: NIP, status VAT, rachunek w wykazie MF + dowód sprawdzenia (`requestId`) |
| 42 | Przeliczanie faktur walutowych po kursie NBP | webhook `przelicz-walute` | Kwota w PLN po kursie z ostatniego dnia roboczego przed datą faktury |
| 43 | Newsletter z nowych wpisów na blogu | czwartki 10:00 | Szkic newslettera z RSS + wstęp AI |
| 44 | Publikacja postów z kalendarza treści | co 15 minut | Zatwierdzone posty z arkusza Google → Facebook, status wraca do arkusza |
| 45 | Analiza ankiet NPS | webhook `ankieta-nps` | Niezadowoleni → zgłoszenie „oddzwoń”; zadowoleni → podziękowanie |
| 46 | Zwroty i reklamacje | webhook `zwrot-reklamacja` | Termin 14 dni / 2 lata, numer RMA, instrukcja; po terminie decyduje człowiek |
| 47 | Wnioski urlopowe z akceptacją | webhook `wniosek-urlopowy` | Dni robocze bez polskich świąt, formularz dla przełożonego, kalendarz |
| 48 | Notatka i zadania ze spotkania | webhook `notatka-spotkanie` | Transkrypcja → streszczenie, decyzje, zadania → e-mail + narzędzie zadań |
| 49 | Kontrola wysyłki faktur do KSeF | dni robocze co 2 h | Alert, gdy faktura odrzucona lub bez potwierdzenia |
| 50 | Tygodniowy raport zdrowia automatyzacji | poniedziałki 8:30 | Błędy z tygodnia + workflowy bez Error Workflow |

### Najważniejsze decyzje projektowe

- **41** – najpierw suma kontrolna NIP i długość rachunku (bez zbędnych zapytań do MF); `requestId` archiwizowany jako dowód; przy problemie prośba o wstrzymanie płatności.
- **42** – pobiera 10 dni kursów wstecz i wybiera ostatni **przed** datą faktury (weekendy i święta nie psują wyniku). Zasadę w nietypowych przypadkach potwierdź z księgową.
- **43** – tylko szkic kampanii; brak wpisów = brak newslettera; treść z RSS escapowana.
- **44** – tylko posty „zatwierdzone” z minioną datą i bez `postId`; pamięć chroni przed podwójną publikacją.
- **45** – grupy NPS liczone w kodzie; promotorzy nie są proszeni o opinię (prośbę dostają wszyscy przez 36).
- **46** – data dostawy i e-mail z systemu sklepu; po terminie nic nie jest odrzucane automatycznie. Zasady dotyczą konsumentów – dla B2B ustaw własne.
- **47** – święta stałe, ruchome (Wielkanoc, Zesłanie Ducha Świętego, Boże Ciało) i Wigilia; test sprawdza grudzień 2026 i Wielkanoc/Boże Ciało 2027.
- **48** – AI nie zgaduje osób ani terminów; maks. 30 zadań, tworzone po kolei; zgoda na nagrywanie.
- **49** – nie wysyła niczego do KSeF, tylko pilnuje statusów z systemu fakturowego; alert raz na fakturę i status.
- **50** – czyta tylko metadane wykonań; razem z 00 (alert) i 40 (kopia) to pakiet „opieka nad automatyzacjami”.

### Czego wymagają

| Nr | Wymaga |
|---|---|
| 41, 42 | Nic poza n8n – API MF i NBP są publiczne (41: archiwum/księgowość z API na `requestId`) |
| 43 | Blog z RSS, system mailingowy z API, OpenAI, Slack |
| 44 | Arkusz Google (OAuth2), token strony Facebook z `pages_manage_posts` |
| 45 | Narzędzie ankiet z webhookiem, CRM/helpdesk, OpenAI, SMTP, Slack |
| 46 | API sklepu z datą dostawy, SMTP, Slack |
| 47 | n8n z formularzem Wait i `WEBHOOK_URL`, kalendarz z API, SMTP |
| 48 | Nagrania spotkań, OpenAI (Whisper), narzędzie zadań z API, SMTP |
| 49 | System fakturowy zintegrowany z KSeF (status przez API), Slack |
| 50 | Klucz API n8n, Slack, SMTP |

## Testy

`testy.js` obejmuje nowe workflowy – część 1: telefon i data w 33, pełny cykl kodu SMS w 34 (brak sekretu, zły/dobry kod, jednorazowość, limit), pomijanie newsletterów w 37, alarm i przywrócenie w 39, czyszczenie kopii w 40. Część 2: suma kontrolna NIP i konto spoza białej listy (41), wybór kursu NBP sprzed daty faktury i zaokrąglenie (42), wybór postów do publikacji (44), grupy NPS (45), terminy zwrotu/reklamacji i zgodność e-maila (46), dni robocze z polskimi świętami (47), statusy KSeF (49), statystyki raportu (50). Razem **34 testy**, walidacja **53 plików bez błędów**.
