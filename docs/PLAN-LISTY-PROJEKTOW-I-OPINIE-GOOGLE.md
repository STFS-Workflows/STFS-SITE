# Plan implementacyjny: listy projektów i opinie Google

Dokument opisuje zakres przyszłych prac. Oba moduły pozostają niezaimplementowane.

## 1. Kompleksowe listy projektów

### Zakres

- katalog projektów z kartami, wyszukiwaniem, filtrami kategorii i technologii oraz sortowaniem;
- osobny adres URL dla każdego projektu: opis, zakres prac, technologie, rezultaty, galeria, link do realizacji i SEO metadata;
- model danych obejmujący: `title`, `slug`, `excerpt`, `description`, `category`, `services`, `technologies`, `status`, `date`, `cover`, `gallery`, `url` i `featured`;
- responsywność, obsługa klawiatury, stany ładowania/pustki/błędu, alt teksty i lazy loading obrazów;
- analityka otwarcia projektu, użycia filtra i kliknięcia CTA.

### Etapy

1. Spisać realne projekty i ustalić kategorie.
2. Wybrać źródło danych: JSON w repozytorium, CMS albo baza danych.
3. Zaimplementować listę, filtrowanie i szablon szczegółów.
4. Uzupełnić treści, obrazy, linki i dane SEO.
5. Przetestować mobile, dostępność, wydajność, linki i indeksowanie.

## 2. Opinie Google

### Zakres

- potwierdzenie właściwego profilu Google Business Profile i identyfikatora miejsca;
- integracja przez Places API po stronie backendu lub workflow, z kluczem ograniczonym i cache'em;
- prezentacja oceny zbiorczej, liczby opinii, autora, oceny, treści, daty oraz linku do Google;
- stany ładowania, brak danych, błąd API, limit zapytań i nieaktualny cache;
- atrybucja Google i zgodność z aktualnymi zasadami użycia treści opinii;
- monitoring świeżości danych i kosztów API.

### Etapy

1. Potwierdzić profil i uzyskać identyfikator miejsca.
2. Wybrać API oraz miejsce przechowywania sekretów.
3. Zbudować backendowy endpoint/cache, aby nie ujawniać klucza w przeglądarce.
4. Dodać komponent opinii i bezpieczne fallbacki.
5. Przetestować limity, responsywność, dostępność i aktualność danych.
