# Atelier 27 — instrukcja wdrożenia dla agenta AI

To jest statyczny, gotowy do personalizacji szablon dla restauracji i domu przyjęć. Został przygotowany pod lokalne SEO: ma osobne podstrony dla menu, przyjęć i kontaktu, dane schema.org, `robots.txt` oraz sitemapę.

## Zasada bezpieczeństwa

Zanim strona trafi na domenę klienta, zastąp **wszystkie dane demonstracyjne** prawdziwymi. Nie publikuj wymyślonych adresów, numerów telefonu, cen, opinii, godzin, alergenów, zdjęć ani deklaracji biznesowych.

## Kolejność wdrożenia

1. Zbierz brief: nazwa, adres, telefon, e-mail, link do rezerwacji, godziny, kuchnia, cena, obszar działania, social media, menu, zasady rezerwacji i zdjęcia z prawem użycia.
2. Zmień wspólne dane na stronie głównej, w podstronach oraz w danych strukturalnych.
3. Podłącz formularze do bezpiecznego systemu obsługi zapytań.
4. Wdróż prawdziwe dokumenty prawne, analitykę po zgodzie i zweryfikuj stronę przed publikacją.
5. Po zmianie domeny zgłoś sitemapę w Google Search Console i uzupełnij Google Business Profile.

## Mapa plików

| Cel | Plik | Co zmienić |
|---|---|---|
| Strona główna i lokalne SEO | `index.html` | title, description, canonical, Open Graph, JSON-LD, nagłówki, NAP, FAQ |
| Karta dań | `menu/index.html` | pełne menu jako HTML, ceny, alergeny, data aktualizacji |
| Oferta eventów | `przyjecia/index.html` | typy przyjęć, minimalna liczba gości, proces, formularz |
| Kontakt | `kontakt/index.html` | adres, dojazd, mapa, telefon, e-mail, godziny |
| Wygląd i zdjęcia | `styles.css`, `refinement.css` | zmienne w `:root`, adresy trzech obrazów; warstwa finalnej art direction |
| Formularze | `script.js` | tylko funkcja `sendLead()`; klucze API zawsze po stronie serwera |
| Indeksowanie | `robots.txt`, `sitemap.xml` | domena i lista adresów po publikacji |
| Konfiguracja hostingu | `.openai/hosting.json` | tylko ustawienia hostingu; nie usuwaj `project_id` |

## Dane, które muszą być identyczne

Nazwa firmy, adres, telefon i godziny muszą być identyczne w stopce, na stronie kontaktu, w JSON-LD i w Google Business Profile. Po zmianie domeny wyszukaj w całym projekcie frazę `atelier-27-restaurant-template` i zastąp ją prawdziwą domeną HTTPS.

## SEO przed publikacją

- Jedna strona = jeden cel i jeden `h1`.
- Tytuły powinny być unikalne i zwykle mieścić się w ok. 50–60 znakach; opisy meta — w ok. 150–160 znakach.
- Nie ukrywaj kluczowych treści w obrazach lub PDF-ach. Menu i oferta przyjęć powinny mieć wersję HTML.
- Dodaj prawdziwe, opisowe `alt` do zdjęć oraz zoptymalizuj je do WebP/AVIF i odpowiednich rozmiarów.
- Publikuj tylko schema.org odzwierciedlające stan faktyczny. Usuń pole `geo`, jeśli nie masz potwierdzonych współrzędnych.
- Jeżeli restauracja ma kilka lokali, przygotuj osobną, unikalną stronę lokalizacji dla każdego z nich.

## Formularze i rezerwacje

Obecne formularze walidują dane po stronie przeglądarki i pokazują stan sukcesu, ale nie wysyłają leadów. Podłącz `sendLead()` do serwerowego endpointu, n8n, CRM lub dostawcy rezerwacji. Waliduj dane również po stronie serwera, ogranicz spam (honeypot/rate-limit/CAPTCHA) i nie przekazuj kluczy do JavaScriptu.

## AI Elements

Nie zainstalowano AI Elements, ponieważ projekt jest statyczną witryną HTML bez generowanych przez AI odpowiedzi ani interfejsu React. To zgodne z wytycznymi biblioteki. Jeśli klient zamówi concierge AI, migruj moduł rozmowy do React, użyj AI SDK oraz komponentów `conversation`, `message` i `prompt-input` z AI Elements; nie buduj od zera renderera wiadomości AI.

## Checklista końcowa

- [ ] Brak demonstracyjnych danych i linków `#top`.
- [ ] Prawdziwa polityka prywatności oraz regulamin rezerwacji.
- [ ] Prawdziwy canonical, sitemap i robots.
- [ ] Formularze wysyłają dane i posiadają politykę retencji.
- [ ] Telefon, e-mail, mapa i rezerwacja działają na telefonie.
- [ ] Zweryfikowane dane strukturalne w Schema Markup Validator.
- [ ] Test mobilny, test szybkości oraz przesłanie sitemapy do Search Console.
