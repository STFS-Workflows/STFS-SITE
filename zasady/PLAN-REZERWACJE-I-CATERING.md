# Plan wdrożenia: oglądanie sali i zamówienie cateringu

Ten dokument opisuje następny etap produktu. Obecna strona pozostaje szybkim, statycznym prototypem: CTA prowadzą do telefonu lub e-maila, bez zapisu danych do zewnętrznego systemu.

## 1. Umówienie oglądania sali

### Doświadczenie użytkownika

1. Przycisk „Umów oglądanie sali” otwiera krótki panel lub osobną stronę.
2. Gość wybiera typ uroczystości, orientacyjną liczbę osób oraz preferowany dzień i porę kontaktu.
3. Widzi jasny komunikat: termin wizyty jest prośbą, nie automatycznym potwierdzeniem.
4. Po wysłaniu otrzymuje potwierdzenie e-mail, a zespół otrzymuje zgłoszenie w jednym miejscu.

### Minimalne pola

- imię i nazwisko,
- telefon lub e-mail,
- rodzaj uroczystości,
- liczba gości,
- preferowany termin wizyty,
- zgoda na kontakt i link do polityki prywatności.

### Implementacja

- Frontend: osobna trasa `/umow-spotkanie/`, walidacja po stronie przeglądarki i dostępne komunikaty błędu.
- Backend: endpoint `POST /api/viewing-requests`, limitowanie zgłoszeń i walidacja po stronie serwera.
- Dane: tabela `viewing_requests` ze statusem `new`, `contacted`, `confirmed`, `cancelled`.
- Integracja: n8n tworzy zdarzenie „do potwierdzenia” w kalendarzu, wysyła e-mail do klienta i powiadomienie do obsługi.
- Wersja późniejsza: prawdziwy kalendarz dostępności, który pokazuje wyłącznie zatwierdzone okna wizyt.

## 2. Zapytanie o catering

### Doświadczenie użytkownika

1. Przycisk „Zapytaj o catering” otwiera formularz wyceny.
2. Klient podaje datę, adres realizacji, liczbę osób, rodzaj wydarzenia i sposób obsługi.
3. Nie pokazujemy automatycznej ceny, jeśli menu i logistyka wymagają wyceny człowieka.
4. Po wysłaniu klient dostaje podsumowanie, a zespół otrzymuje komplet informacji do odpowiedzi.

### Minimalne pola

- dane kontaktowe,
- data i godzina wydarzenia,
- miejscowość lub adres realizacji,
- liczba osób,
- rodzaj wydarzenia,
- preferowany model: odbiór, dostawa, pełna obsługa,
- alergie lub uwagi,
- zgoda na kontakt.

### Implementacja

- Frontend: trasa `/catering/` z etapowym formularzem, aby nie przeciążyć użytkownika na telefonie.
- Backend: endpoint `POST /api/catering-requests`, walidacja dat, limitowanie oraz antyspamowy honeypot.
- Dane: tabela `catering_requests` i osobna tabela załączników, jeżeli klient może wysłać inspiracje.
- Integracja: n8n przekazuje zgłoszenie do CRM lub arkusza, przypisuje właściciela i wysyła szablon odpowiedzi.
- Opcjonalnie: kalkulator „od” wyłącznie dla prostych pakietów, z wyraźnym zastrzeżeniem o finalnej wycenie.

## Wspólne wymagania przed uruchomieniem

- zatwierdzone teksty zgód i polityki prywatności,
- prawdziwy adres e-mail nadawcy oraz domena z SPF, DKIM i DMARC,
- właściciel każdego zgłoszenia i czas odpowiedzi,
- ręczny test telefonu, tabletu i desktopu,
- test błędnego formularza, braku internetu i ponownego wysłania,
- wydarzenia analityczne: otwarcie formularza, rozpoczęcie, wysłanie i kontakt telefoniczny.

## Kolejność prac

Najpierw wdrożyć oglądanie sali, bo jest prostsze i najbliższe głównemu celowi strony. Potem uruchomić formularz cateringu. Dopiero po zebraniu realnych zgłoszeń warto budować automatyczny kalendarz lub kalkulator cen.
