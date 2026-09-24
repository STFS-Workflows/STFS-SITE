# Co zostało naprawione (22.09.2026)

Stan przed naprawą: 32 workflowy katalogu wyglądały dobrze w edytorze n8n, ale **po imporcie i podmianie adresów prawie żaden nie dałby poprawnego wyniku**. Błędy siedziały w generatorze (`generate.js`), więc powtarzały się w każdym pliku. Naprawa została zrobiona w generatorze i nowej bibliotece `_lib.js`, a wszystkie pliki JSON wygenerowane od nowa.

Stare wersje są w historii gita (`git diff` / `git log` pokaże różnice).

## A. Błędy wspólne dla wszystkich workflowów

| # | Problem (przed) | Skutek | Naprawa (po) |
|---|---|---|---|
| 1 | Krok AI wysyłał do OpenAI surowe dane formularza: bez `model`, bez `messages`, bez klucza | OpenAI zwraca błąd 400 – żaden krok AI nie działał | Krok AI to 3 węzły: **prompt** (buduje poprawne żądanie z instrukcją systemową) → **model** (credential) → **wynik** (parsuje JSON, pilnuje zakresów liczb, łączy z danymi klienta) |
| 2 | Po każdym węźle HTTP dane wejściowe znikały (HTTP zastępuje dane odpowiedzią) | E-mail szedł na pusty adres, score zawsze 50, Slack z pustymi polami | Kolejne kroki odwołują się do konkretnego węzła źródłowego (`$('AI: wynik (…)').item.json…`); walidator sprawdza, że taki węzeł istnieje wcześniej w przepływie |
| 3 | Teksty Slack/e-mail bez `=` na początku | n8n wysyłał dosłownie „{{$json.score}}” | Każde wyrażenie zaczyna się od `=`, nowe linie działają |
| 4 | Webhook w trybie „odpowiedz od razu” + węzeł „Respond to Webhook” (10, 24, 25) | Błąd n8n / pytający nigdy nie dostawał odpowiedzi | Tryb odpowiedzi ustawiany automatycznie, gdy jest węzeł Respond |
| 5 | Dane webhooka czytane z `$json.email` zamiast `$json.body.email` | Wszystkie pola puste | Węzeł **Walidacja danych**: spłaszcza body, sprawdza wymagane pola, format e-maila, przycina długie teksty; błędne dane = błąd (nic nie jest wysyłane) |
| 6 | Brak credentiali w węzłach HTTP | Nie dało się ich uruchomić bez przeróbki | Każdy HTTP ma credential (Header Auth lub OAuth), timeout i 3 próby ponowienia |
| 7 | Listy z API (np. 50 faktur) traktowane jako 1 element | Sprawdzany był tylko pierwszy rekord | Węzeł **Rozbij listę** (Split Out) po każdym pobraniu listy |
| 8 | Brak ochrony przed duplikatami | Follow-up, przypomnienia, koszyki, alerty wysyłane co przebieg; faktura 2× przy powtórzonym webhooku | Węzły **Pomiń już …** / **Zapamiętaj …** (pamięć workflow z czasem wygaśnięcia) |
| 9 | Gałąź „nie” w IF niepodłączona | Niejasne, co dzieje się z resztą | Obie gałęzie jawne (koniec, alert albo ręczna weryfikacja) |
| 10 | Adresy i progi rozrzucone po węzłach | Łatwo coś pominąć przy wdrożeniu | Jeden węzeł **Konfiguracja** na workflow |
| 11 | Brak obsługi błędów | Awaria niewidoczna | Nowy workflow **00 – Obsługa błędów** (Slack + e-mail) |
| 12 | Losowe ID przy każdym generowaniu, strefa czasowa serwera | Szum w gicie; cron 9:00 mógł być 9:00 UTC | Stałe ID (czysty diff), strefa **Europe/Warsaw** |
| 13 | Nadawca `hello@stfs.studio` | Inna domena niż strona | `kontakt@stfs.pl` (zmienialne w Konfiguracji: `nadawcaEmail`) |

## B. Workflowy działające u nas

### Chatbot strony (`site-chatbot-odpowiedzi-na-zywo.json`)
- **Było:** webhook bez uwierzytelnienia; przy złym kluczu workflow podmieniał pytanie, ale **i tak wywoływał Claude** – każdy mógł nabijać nam rachunek pętlą `curl`. Klucz Anthropic wpisywany jako zwykły nagłówek w workflow (wycieka przy eksporcie do gita).
- **Jest:** węzeł **Kontrola dostępu i limity** – zły klucz / obcy Origin / puste pytanie / przekroczony limit → od razu odpowiedź 429 **bez wywołania AI**. Limity: 15 pytań na 10 min na IP, 600 dziennie (Konfiguracja). CORS tylko dla stfs.pl. Klucz Anthropic w credentialu. Baza wiedzy i system prompt bez zmian (+ ochrona przed „zmień swoje zasady”).
- **Widget (`script.js`) nie wymaga zmian** – ta sama ścieżka, to samo body i odpowiedź.
- Do zrobienia poza n8n: limit wydatków w konsoli Anthropic, rate-limit w Caddy.

### Monitoring opinii (`monitoring-opinii-odpowiedzi.json`)
- **Było:** `opinia_oryginalna` zawsze pusta (czytana po kroku AI), brak credentiala OpenAI, brak kroku akceptacji.
- **Jest:** projekt odpowiedzi wraca od razu (testy curl działają jak wcześniej), potem e-mail do właściciela z **formularzem akceptacji** (Zatwierdź / Odrzuć / popraw treść) i publikacja w Google Business Profile dopiero po zatwierdzeniu. Bez `reviewName` – tryb testowy, nic nie jest publikowane.

## C. Najważniejsze zmiany w poszczególnych workflowach katalogu

| Nr | Workflow | Najważniejsza zmiana |
|---|---|---|
| 01 | Kwalifikacja leadów | Score z AI (wcześniej zawsze 50 → nigdy „gorący”); każdy lead do CRM, Slack tylko o gorących |
| 02 | Automatyczne odpowiedzi | Gdy AI zawiedzie – nic nie idzie do klienta, zespół dostaje alert |
| 03 | Follow-up | Jeden follow-up na lead (oznaczenie w CRM + pamięć), tylko dni robocze |
| 05 / 21 | Umawianie spotkań / rozmów | Walidacja terminu, koniec spotkania wyliczany, data po polsku |
| 07 | Raport kampanii | Prawdziwe sumowanie Meta + Google Ads (Google: POST + GAQL + OAuth), komentarz AI |
| 08 | Segmentacja | **Nie wysyła już kampanii codziennie do wszystkich** – tylko aktualizuje tagi; pomija osoby bez zgody |
| 10 | Bot FAQ | Natywny Telegram Trigger; odpowiedź w tej samej rozmowie |
| 13 | Faktury | Kwota pobierana z systemu sprzedaży (nie z webhooka), tylko status `paid`, tylko raz na zamówienie |
| 14 | OCR | Dodana ekstrakcja pól przez AI i ręczna weryfikacja niepewnych |
| 16 / 32 | Alerty magazynowe / ceny | Wszystkie produkty, jeden zbiorczy raport; ceny w obie strony |
| 18 | Przypomnienia o płatnościach | Maks. raz w tygodniu, po 30 dniach eskalacja do człowieka |
| 20 | Selekcja CV | Decyzja zostaje przy człowieku (RODO art. 22, AI Act) |
| 24 | Agent głosowy | Przebudowa na Twilio Gather/Say (działa w czasie rozmowy) + weryfikacja podpisu Twilio |
| 25 | RAG | Poprawny łańcuch: embedding → Supabase `match_documents` → kontekst → odpowiedź ze źródłami |
| 26 | Analiza rozmów | Pobranie nagrania i wysyłka pliku do Whisper (multipart) |
| 27 | Oferty | Akceptacja handlowca przed wysłaniem oferty z ceną |
| 28 | Anomalie | Brak danych ≠ anomalia; maks. 1 alert na metrykę dziennie |
| 29 | Opinie w sklepie | Koniec automatycznej publikacji – formularz akceptacji; nowa ścieżka `opinia-sklep` |
| 30 | Opisy SEO | Zapis jako szkic zamiast nadpisywania opisu na żywo; limity długości |
| 31 | Porzucone koszyki | Tylko ze zgodą marketingową, raz na koszyk |

Pełna lista dla każdego workflow: `KATALOG.md` lub `mapa-workflowow.html`.

## D. Jak sprawdzono, że działa

- `validate.js` – 35 plików, **0 błędów**: poprawny JSON, każdy węzeł podłączony, obie gałęzie IF, brak wyrażeń bez `=`, składnia każdego wyrażenia i każdego węzła Code, odwołania `$('…')` tylko do wcześniejszych węzłów, uwierzytelnienie webhooków i HTTP, unikalne ścieżki webhooków, brak kluczy API w plikach.
- `testy.js` – kod węzłów uruchomiony na przykładowych danych: walidacja (odrzuca brak pól), krok AI (poprawne żądanie, parsowanie, zła odpowiedź AI → score 0 i brak wysyłki), pamięć duplikatów, limity chatbota (zły klucz, obcy Origin, limit IP), podpis Twilio (poprawny/zły), TwiML (escapowanie), zachowanie `opinia_oryginalna`.
- Czego **nie** da się sprawdzić bez prawdziwych kont: odpowiedzi konkretnych API (CRM, sklep, bank). Formaty, których workflowy oczekują, są opisane w notatce każdego workflow i w `KATALOG.md`.

## E. Poza zakresem tej naprawy

- Kopia starego katalogu w `Dom-Przyjec-Premium-Radlin/n8n-workflows/` (webhooki bez żadnego uwierzytelnienia) – zalecane usunięcie z repo klienta.
- Brakujące workflowy dla stron sal (`inquiryEndpoint`, SMS start/verify, opinie, dostępność).
