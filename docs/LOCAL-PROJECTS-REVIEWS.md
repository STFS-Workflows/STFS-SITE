# Projekty i opinie — lokalna wersja robocza

Gałąź: `codex/projekty-opinie-google`. Nie scalać z main bez przeglądu.

## Uruchomienie

Wymagany Node.js 22+ oraz Chrome. W katalogu STFS-SITE:

```powershell
npm install
npm start
```

- http://127.0.0.1:4173/projekty — katalog z wyszukiwarką i filtrami;
- http://127.0.0.1:4173/projekt?slug=dom-przyjec-gonsior — podgląd i opis projektu;
- http://127.0.0.1:4173/opinie — opinie Google.

Konfigurację skopiuj z `.env.example` do lokalnego `.env`. Plik `.env` nie jest wersjonowany. Zmiana konfiguracji wymaga ponownego uruchomienia serwera.

## Projekty

Treści kart, zakres, lokalizacja i opisy rozdziałów znajdują się w tablicy `projects` w `portfolio.js`. Czas realizacji obu projektów pozostaje do potwierdzenia. Nie podano fikcyjnych dat, wyników ani referencji.

Pełne podglądy Gonsior i PREMIUM czytają pliki z oddzielnego repozytorium STFS-Templates. `STFS_TEMPLATES_ROOT` wskazuje jego katalog główny. Serwer udostępnia wyłącznie pliki stron i assety; nie kopiuje ani nie zmienia projektów klientów. Bez tego katalogu karty tekstowe działają, ale zdjęcia i podglądy nie będą dostępne. Przed wdrożeniem na innym serwerze należy zapewnić tę samą strukturę materiałów lub przygotować osobne artefakty podglądów.

Podglądy działają w izolowanej ramce. Formularze i połączenia do backendów są zablokowane nagłówkiem CSP, aby oglądanie portfolio nie wysyłało zapytań klientów.

## Automatyczne pobieranie opinii

Do testu obcej wizytówki ustaw w środowisku procesu `REVIEWS_DEMO=true`. Interfejs pokaże wtedy wyraźną informację, że opinie nie dotyczą STFS. Nie zapisuj testowego URL w repozytorium. Dane pobrane przez scraper pozostają wyłącznie w pamięci procesu i znikają po jego zamknięciu.

Ustaw `GOOGLE_MAPS_URL` na potwierdzony adres wizytówki STFS. Nie wybieraj profilu automatycznie po samej nazwie. Domyślnie opinie są pobierane po uruchomieniu i odświeżane co godzinę. Endpoint `GET /api/reviews` zwraca dane z pamięci; wyświetlenie strony nie uruchamia nowego pobrania.

Scraper Playwright odczytuje publiczne opinie z Google Maps: autora, ocenę, tekst, datę i link źródłowy. Ocena zbiorcza i licznik są prezentowane tylko wtedy, gdy Google je zwróci. Pobieranie ma limit liczby opinii i czasu. Blokada Google, logowanie, CAPTCHA lub ekran zgody przerywają pobranie; scraper nie omija tych ekranów. Zmiana struktury Google może wymagać aktualizacji selektorów.

Bez URL moduł pokazuje stan niepodłączonego profilu. Przy błędzie odświeżenia zachowuje poprzednie dane i oznacza je jako nieaktualne. Cache jest w pamięci i znika po restarcie. Frontend nie otrzymuje sekretów; scraper nie wymaga klucza API. Jeżeli używasz Playwright Chromium zamiast Chrome, usuń `PLAYWRIGHT_CHANNEL` i wykonaj `npx playwright install chromium`.

Odczyt prawdziwych opinii wymaga linku do wizytówki; bez niego nie można potwierdzić działania na docelowym profilu. Selektory ekstrakcji i zachowanie cache przetestowano na lokalnych danych testowych. Przed publicznym uruchomieniem należy sprawdzić bieżące warunki Google; alternatywą dla scrapera jest autoryzowana integracja. Źródło: https://developers.google.com/maps/documentation/places/web-service/policies

## Weryfikacja

Przy działającym serwerze:

```powershell
node scripts/verify-portfolio.mjs
node scripts/verify-reviews.mjs
```

Test interfejsu sprawdza karty, wyszukiwanie, pełny podgląd, animacje, stany opinii i szerokości 390/768/1024/1440 px. Test opinii obejmuje walidację URL, ekstrakcję DOM, blokadę równoczesnego pobierania i zachowanie cache po błędzie. Zrzuty podglądowe trafiają do systemowego katalogu tymczasowego.

Nowe podstrony mają `noindex` na czas prac. To osobny serwer Node; samo wysłanie HTML na hosting statyczny nie uruchamia scrapera. Ta gałąź nie zmienia konfiguracji wdrożenia produkcji.
