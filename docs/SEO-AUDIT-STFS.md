# Audyt SEO STFS — 27 października 2026

## Ocena i zakres

STFS ma czytelną ofertę, polską wersję językową, HTTPS i prostą strukturę. Najważniejsze poprawki to jasne komunikowanie usług w tytułach i nagłówkach, umożliwienie wyszukiwarkom odczytania listy projektów oraz przygotowanie prawidłowych adresów i mapy strony. Opinie znajdują się na stronie głównej, a projekty na osobnej stronie.

Audyt dotyczy kodu gałęzi roboczej i wybranych, publicznie dostępnych stron konkurencyjnych. Nie ma dostępu do Google Search Console, Analytics, danych o wolumenie wyszukiwań, backlinków ani pomiarów Core Web Vitals. Pozycje, liczby wyszukiwań, trudność słów i porównania ruchu pozostają **niezweryfikowane**; poniższe priorytety są oceną dopasowania do oferty, nie wynikami pomiaru.

## Zmiany przygotowane w gałęzi

- Strona główna: bardziej opisowy tytuł, opis i H1 dotyczące automatyzacji AI oraz stron internetowych; Open Graph i dane organizacji zawierające podane dane spółki.
- Opinie Google: sekcja strony głównej z rzetelnymi stanami braku danych, błędu i danych testowych. Nie dodano fikcyjnych opinii, ocen ani danych `AggregateRating`.
- Projekty: osobny adres, unikalne metadane, H1 i canonical; linki oraz nazwy projektów istnieją w początkowym HTML także bez JavaScript. Kolorystyka i krój pisma nawiązują do strony głównej.
- `sitemap.xml`: adres strony głównej i docelowy adres listy projektów; `robots.txt` zachowuje odnośnik do mapy.
- Podglądy projektów: lokalny serwer oznacza je nagłówkiem `X-Robots-Tag: noindex, nofollow`; dynamiczna strona szczegółów pozostaje `noindex` do czasu przygotowania odrębnych, zweryfikowanych i dostępnych publicznie stron projektów.
- Menu mobilne może przewijać wszystkie pozycje, gdy nie mieszczą się na ekranie.
- Nagłówki i treści usług są widoczne również bez JavaScriptu; animacja odsłaniania włącza się dopiero po uruchomieniu skryptu. Dodano też opis logo i język do metadanych udostępniania.

## Propozycje tematów i fraz

To lista jakościowa oparta na zakresie usług i przeglądzie wyników, bez deklaracji wolumenu lub miejsca w wynikach. Najpierw sprawdź dane w Search Console i narzędziu do badania słów kluczowych, a treści dopasuj do faktycznych kompetencji i realizacji.

| Temat / fraza | Intencja | Priorytet i sugerowany format |
|---|---|---|
| automatyzacje AI dla firm | komercyjna | wysoki — strona główna lub opis usługi |
| strony internetowe dla firm | komercyjna | wysoki — opis usługi i przykłady projektów |
| automatyzacja procesów biznesowych | komercyjna | wysoki — strona usługi z przykładami |
| automatyzacja AI Katowice | lokalna / komercyjna | wysoki — naturalna informacja o lokalizacji i zakresie obsługi |
| tworzenie stron internetowych Katowice | lokalna / komercyjna | wysoki — projekty i oferta |
| chatbot AI na stronę internetową | komercyjna | wysoki — wyjaśnienie działania i ograniczeń |
| automatyzacja obsługi e-mail | komercyjna | wysoki — praktyczny opis rozwiązania |
| monitoring opinii Google | komercyjna | wysoki — opis zakresu, zatwierdzania i zależności integracji |
| automatyzacja rezerwacji dla firm | komercyjna | średni — opis sposobu działania |
| automatyzacja zapytań klientów | komercyjna | średni — przykład przepływu |
| strona internetowa dla restauracji | komercyjna | średni — przykładowy projekt i zakres |
| strona internetowa dla domu przyjęć | komercyjna | średni — projekt z potwierdzonym opisem |
| ile kosztuje strona internetowa dla firmy | informacyjna / komercyjna | średni — uczciwy poradnik o czynnikach kosztu |
| ile kosztuje automatyzacja AI | informacyjna / komercyjna | średni — poradnik o wycenie i kosztach integracji |
| jak wdrożyć AI w małej firmie | informacyjna | średni — przewodnik z praktycznymi przykładami |
| jak odpowiadać na opinie Google | informacyjna | średni — poradnik o odpowiedziach i kontroli człowieka |

## Kontrola techniczna i treści

| Obszar | Stan | Działanie / ograniczenie |
|---|---|---|
| Tytuły, opisy, H1 | poprawione w gałęzi | Sprawdzić końcowe renderowanie po publikacji; Google może wybrać własny tytuł i snippet. |
| Lista projektów | przygotowana | Usunięto `noindex`; dodano canonical i statyczne linki. Nie potwierdza to dostępności adresu na produkcji. |
| Mapa strony i robots | przygotowane | Po wdrożeniu sprawdzić HTTP 200 dla każdego adresu, a następnie zgłosić mapę w Search Console. |
| Szczegóły i podglądy projektów | do przygotowania | Pozostają demonstracyjne / `noindex`; przed indeksowaniem potrzebują potwierdzonych treści, działających adresów oraz dostępu do podglądów. |
| Opinie | oczekują danych | STFS nie podało jeszcze własnej wizytówki; pobieranie prawdziwych opinii nie zostało potwierdzone. |
| Rich results dla opinii | celowo nie dodano | Google ogranicza gwiazdki dla opinii o własnej organizacji na jej stronie. Nie obiecujemy gwiazdek w wynikach. |
| Dostępność i mobile | sprawdzenie lokalne | Przetestowano podstawowy układ i nawigację; pełny audyt dostępności pozostaje do wykonania. |
| Szybkość / LCP / INP / CLS | niezmierzone | Wykonać pomiary PageSpeed Insights i Search Console na opublikowanym adresie; obecność skryptów i osadzonych elementów wymaga pomiaru. |
| Indeksacja i ranking | niezweryfikowane | Sprawdzić raport indeksowania i skuteczności w Search Console. |
| Routing produkcyjny | wymaga wdrożenia | `https://stfs.pl/` zwróciło HTTP 200, a `/projekty` HTTP 404 w sprawdzeniu z 27 października 2026 r. To stan live, a nie wynik wdrożenia tej gałęzi. |

## Konkurenci i luki treści

W publicznych wynikach dla usług AI i stron w Katowicach pojawiają się m.in. [Michał Janiec](https://www.mjaniec.it/pl/automatyzacja-ai) oraz [Resolveo](https://resolveo.pl/). Pierwsza strona opisuje m.in. bezpieczeństwo, proces i orientacyjne formy współpracy; druga akcentuje lokalną obsługę i pytania klientów. To obserwacje treści, a nie pomiar pozycji, siły domeny czy ruchu. Bez danych SEO nie da się rzetelnie wskazać zwycięzcy ani policzyć luk słów kluczowych.

| Wymiar | STFS | Michał Janiec | Resolveo |
|---|---|---|---|
| Zakres treści | AI, strony, marketing i przykładowe projekty | AI, proces wdrożenia i bezpieczeństwo | strony, AI, grafika i lokalna obsługa |
| Cennik / wycena | wycena po konsultacji | widoczne orientacyjne pakiety | informacje o wycenie w pytaniach klientów |
| Liczba fraz / pozycje | brak danych | brak danych | brak danych |
| Backlinki / ruch / wyniki specjalne | brak danych | brak danych | brak danych |
| Szybkość / Core Web Vitals | nie mierzono | nie mierzono | nie mierzono |

Trudność oraz aktualna pozycja wszystkich wymienionych fraz są nieznane. Porównanie nie pozwala ustalić zwycięzcy bez danych o wyszukiwaniu i ruchu.

| Obszar | STFS: następny krok | Priorytet / nakład |
|---|---|---|
| Zakres usługi i czas | Dopisać potwierdzone etapy, zakres dostaw oraz odpowiedzialności. | wysoki / pół dnia |
| Realizacje | Potwierdzić zgodę na publikację, zakres, czas i rezultaty; następnie stworzyć indeksowalne strony projektów z indywidualnymi adresami. | wysoki / kilka dni |
| Pytania o koszty | Wyjaśnić, od czego zależy wycena; nie podawać nieustalonych cen. | średni / 1–2 godziny |
| Praktyczne zastosowania AI | Przygotować przykłady automatyzacji e-mail, rezerwacji i odpowiedzi na opinie. | średni / kilka dni |
| Lokalne zapytania | Uzupełnić i zweryfikować właściwy profil Google firmy, gdy będzie dostępny. | wysoki / zależne od profilu |

## Kolejność działań

**Szybkie działania:** sprawdzić finalne teksty i dane firmy; potwierdzić możliwość publikacji projektów; wdrożyć działający routing i podglądy; po publikacji skontrolować stronę, canonical, sitemapę i Search Console.

**Dalszy rozwój:** przygotować osobne, wartościowe opisy głównych usług; uzupełnić udokumentowane case studies; mierzyć rzeczywisty ruch i Core Web Vitals; wybrać bezpieczną, zgodną z warunkami dostawcy integrację opinii po otrzymaniu właściwego profilu.

## Źródła

- [Google: tytuły wyników wyszukiwania](https://developers.google.com/search/docs/appearance/title-link) i [opisy wyników](https://developers.google.com/search/docs/appearance/snippet).
- [Google: SEO i JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) oraz [mapy witryn](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview).
- [Google: dane strukturalne organizacji](https://developers.google.com/search/docs/appearance/structured-data/organization) i [zasady opinii](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
