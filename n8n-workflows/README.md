# Katalog automatyzacji STFS — workflowy n8n

32 gotowe do importu szkielety workflowów n8n, po jednym na każdy proces z katalogu automatyzacji na stronie STFS.

## Chatbot strony STFS (szablon backendu)

`site-chatbot-odpowiedzi-na-zywo.json` to szablon backendu widgetu czatu. Obecna statyczna strona w tym repozytorium nie wywołuje go bezpośrednio. Nie kieruj do niego żądań z JavaScriptu przeglądarki — chroniony webhook n8n musi być wywoływany wyłącznie przez własny backend/gateway.

Nie używa bazy wektorowej — cała wiedza o STFS (usługi, proces, konsultacja, kontakt) jest wpisana wprost w węźle "Zbuduj prompt", bo w całości mieści się w jednym zapytaniu do modelu AI. Prościej i taniej niż pełny RAG, wystarczające przy tej wielkości bazy wiedzy.

**Uruchomienie:**
1. Zaimportuj plik, utwórz credential Header Auth i przypisz go do webhooka.
2. Utwórz serwerowy gateway dla widgetu: weryfikuj CAPTCHA, ograniczaj liczbę żądań na IP i sesję, a następnie wywołuj webhook n8n z tokenem przechowywanym wyłącznie po stronie serwera.
3. W węźle "AI: wygeneruj odpowiedź" użyj credentiala n8n dla wybranego dostawcy modelu (OpenAI/Claude), a nie klucza w pliku workflow.
4. Dopiero po tych krokach aktywuj workflow.

## Monitoring opinii i reputacji (szkielet testowalny, nie produkcyjny)

`monitoring-opinii-odpowiedzi.json` to dokładniejszy, testowalny szkielet dla usługi "Monitoring opinii i reputacji" opisanej na stronie — dokładniejszy niż `29-ecommerce-odpowiedzi-na-opinie.json` z katalogu poniżej. Przyjmuje opinię (webhook), AI ocenia sentyment i pisze projekt odpowiedzi, wynik wraca w odpowiedzi HTTP jako gotowy do akceptacji — **nic nie publikuje automatycznie**, zgodnie z tym co obiecujemy na stronie.

Nie mamy dostępu do żadnej realnej lokalizacji Google z opiniami, więc testuje się to ręcznie wysłanym payloadem (curl/Postman/tryb testowy webhooka w n8n) — dokładna instrukcja jest w żółtej notatce w samym pliku. Podłączenie prawdziwego API platformy z opiniami (Google Business Profile, Allegro itd.) następuje dopiero per konkretny klient, który ma tam swoje konto.

## Jak zaimportować

1. Otwórz n8n → **Workflows → Import from File**.
2. Wybierz plik `.json` z tego folderu.
3. Workflow pojawi się z żółtą **notatką (sticky note)** u góry — opisuje, co trzeba podmienić/skonfigurować (klucze API, konta, realne endpointy).
4. Podmień placeholdery (adresy `YOUR-...`, klucze AI) na realne dane i włącz workflow.

## Bezpieczeństwo przed aktywacją

- Każdy webhook w tym katalogu wymaga **Header Auth**. Przed aktywacją utwórz dla niego osobny credential z długim, losowym tokenem i przypisz go do węzła. Nie przechowuj tokenu w kodzie strony ani w pliku workflow.
- Publiczne formularze i chatboty kieruj najpierw do własnego backendu/gateway z CAPTCHA oraz rate-limitem. Gateway powinien wywoływać chroniony webhook n8n po stronie serwera.
- Dla webhooków od Stripe, Twilio i innych dostawców sprawdzaj ich podpis na surowym body przed wykonaniem akcji. Kwoty i statusy płatności pobieraj z API dostawcy, a nie z danych nadesłanych przez klienta.
- Szczegółowa checklista jest w [SECURITY.md](SECURITY.md).

## Ważne

- Wszystkie kroki HTTP/AI to **szkielety** — placeholder URL-e (`https://YOUR-....example.com`) trzeba podmienić na realne konta/API.
- Węzeł "AI: ..." domyślnie woła OpenAI Chat Completions — podmień na swojego dostawcę (OpenAI/Claude/inny) i zapisz klucz jako credential w n8n albo użyj natywnego węzła AI.
- Workflowy w kategorii **Zaawansowane AI** (agent głosowy, RAG) wymagają dodatkowej infrastruktury (Twilio, baza wektorowa) — potraktuj je jako punkt startowy, nie gotowe rozwiązanie plug-and-play.
- Żadne hasła/klucze nie są w plikach — musisz je wpisać sam w panelu n8n (Credentials).
- Węzły **IF** mają podłączoną tylko gałąź "true" (dalszy ciąg workflow). Gałąź "false" (np. "lead niegorący", "brak anomalii") zostaw pustą albo podepnij własną ścieżkę (np. inny kanał powiadomień) — w edytorze n8n przeciągnij z drugiego wyjścia węzła IF.

## Lista workflowów

### Sprzedaż i leady

- **Kwalifikacja i scoring leadów** — `01-sprzedaz-kwalifikacja-leadow.json`
- **Automatyczne odpowiedzi na zapytania** — `02-sprzedaz-automatyczne-odpowiedzi.json`
- **Follow-up po braku odpowiedzi** — `03-sprzedaz-follow-up.json`
- **Aktualizacja CRM bez ręcznego wpisywania** — `04-sprzedaz-aktualizacja-crm.json`
- **Umawianie spotkań i konsultacji** — `05-sprzedaz-umawianie-spotkan.json`

### Marketing

- **Generowanie treści i reklam** — `06-marketing-generowanie-tresci.json`
- **Automatyczne raportowanie kampanii** — `07-marketing-raportowanie-kampanii.json`
- **Segmentacja i personalizacja mailingów** — `08-marketing-segmentacja-mailingow.json`
- **Monitoring wzmianek o marce** — `09-marketing-monitoring-wzmianek.json`

### Obsługa klienta

- **Bot FAQ (Telegram / WhatsApp / czat)** — `10-obsluga-bot-faq.json`
- **Kategoryzacja i priorytetyzacja zgłoszeń** — `11-obsluga-kategoryzacja-zgloszen.json`
- **Tłumaczenie i streszczanie zgłoszeń** — `12-obsluga-tlumaczenie-streszczanie.json`

### Operacje i dokumenty

- **Wystawianie i wysyłka faktur** — `13-operacje-wystawianie-faktur.json`
- **OCR i ekstrakcja danych z dokumentów** — `14-operacje-ocr-dokumentow.json`
- **Uzupełnianie arkuszy z formularzy i maili** — `15-operacje-uzupelnianie-arkuszy.json`
- **Alerty o stanach magazynowych** — `16-operacje-alerty-magazynowe.json`

### Finanse

- **Kategoryzacja transakcji i wydatków** — `17-finanse-kategoryzacja-transakcji.json`
- **Przypomnienia o nieopłaconych fakturach** — `18-finanse-przypomnienia-platnosci.json`
- **Raporty finansowe na koniec miesiąca** — `19-finanse-raporty-miesieczne.json`

### HR i rekrutacja

- **Wstępna selekcja CV** — `20-hr-selekcja-cv.json`
- **Automatyczne umawianie rozmów rekrutacyjnych** — `21-hr-umawianie-rozmow.json`
- **Onboarding nowych pracowników** — `22-hr-onboarding.json`
- **Chatbot HR** — `23-hr-chatbot.json`

### Zaawansowane AI

- **Agent głosowy (recepcja AI)** — `24-ai-agent-glosowy.json`
- **RAG chatbot na dokumentacji firmy** — `25-ai-rag-chatbot.json`
- **Analiza rozmów sprzedażowych** — `26-ai-analiza-rozmow.json`
- **Generowanie ofert i wycen** — `27-ai-generowanie-ofert.json`
- **Wykrywanie anomalii w danych** — `28-ai-wykrywanie-anomalii.json`

### E-commerce

- **Automatyczne odpowiedzi na opinie** — `29-ecommerce-odpowiedzi-na-opinie.json`
- **Dynamiczne opisy produktów pod SEO** — `30-ecommerce-opisy-produktow.json`
- **Przypomnienia o porzuconym koszyku** — `31-ecommerce-porzucone-koszyki.json`
- **Monitoring cen konkurencji** — `32-ecommerce-monitoring-cen.json`
