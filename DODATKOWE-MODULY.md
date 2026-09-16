# Atelier 27 — moduły dodatkowe: automatyzacje i cyfrowa sala

Ten dokument opisuje **opcjonalne rozszerzenia wdrożeniowe**. Nie uruchamia żadnej automatyzacji ani rezerwacji na obecnej stronie. Jest instrukcją dla agenta lub zespołu, który będzie wdrażał stronę konkretnej restauracji.

## Szybka decyzja

| Moduł | Warto wdrożyć, gdy | Minimalna wersja |
|---|---|---|
| Obsługa zapytań rezerwacyjnych | lokal potrzebuje szybkiej odpowiedzi na formularz | formularz → n8n → e-mail/CRM → ręczne potwierdzenie |
| Zapytania o przyjęcia | zapytania wymagają wyceny i kontaktu handlowego | kwalifikacja briefu → CRM → przypomnienie dla zespołu |
| Monitoring opinii | ktoś regularnie odpowiada na opinie | raport i szkic odpowiedzi do akceptacji człowieka |
| Cyfrowa sala | lokal ma powtarzalny układ stolików i chce dać wybór miejsca | mapa sali → prośba o wybrany stolik → ręczne potwierdzenie |
| Rezerwacja stolika online | istnieje wiarygodny system dostępności | mapa → sprawdzenie dostępności → krótka blokada → potwierdzenie |

## ADR-001 — n8n koordynuje, a nie przechowuje stan rezerwacji

### Kontekst

W folderze `n8n-workflows/` są gotowe punkty wyjścia do kwalifikacji leadów, umawiania spotkań, monitoringu opinii i odpowiedzi. Rezerwacja stolika wymaga jednak aktualnego, odpornego na równoczesne zgłoszenia stanu dostępności.

### Decyzja

Użyj n8n jako warstwy orkiestracji: odbiera webhook, waliduje zgłoszenie, powiadamia obsługę, tworzy wpis CRM i wysyła komunikację. Źródłem prawdy o stolikach powinien być system rezerwacyjny dostawcy albo mała baza danych z atomową blokadą rekordu.

### Opcje i kompromisy

| Opcja | Zaleta | Ryzyko / ograniczenie |
|---|---|---|
| Formularz jako zapytanie | szybki, bezpieczny start; brak nadrezerwacji | gość nie dostaje natychmiastowego potwierdzenia |
| n8n + arkusz | łatwy panel dla małego lokalu | słabe blokady przy wielu równoczesnych rezerwacjach |
| System rezerwacyjny jako źródło prawdy | prawdziwa dostępność, blokady i anulacje | integracja zależy od API dostawcy |
| Własna baza + API | pełna kontrola nad mapą sali | wymaga backendu, monitoringu i utrzymania |

### Konsekwencje

Nie potwierdzaj automatycznie rezerwacji tylko na podstawie danych przesłanych z przeglądarki lub pojedynczego workflow n8n. Zawsze sprawdzaj dostępność ponownie po stronie serwera. Przy wersji MVP komunikat powinien brzmieć „przyjęliśmy prośbę o stolik”, a nie „rezerwacja potwierdzona”.

### Działania wdrożeniowe

1. Wybierz jedno źródło prawdy: dostawcę rezerwacji lub bazę danych.
2. Ustal, kto może ręcznie potwierdzać, zmieniać i anulować rezerwacje.
3. Dopiero potem podłącz webhook n8n i komunikaty do gościa.

## Moduł A — automatyzacje operacyjne

### 1. Rezerwacje i zapytania ze strony

Rozszerz workflow `05-sprzedaz-umawianie-spotkan.json` o wejście `reservation-request`.

```text
Formularz strony / mapa sali
  → webhook n8n
  → walidacja + antyspam
  → sprawdzenie dostępności w źródle prawdy
  → [dostępne] utworzenie prośby lub blokady
  → e-mail/SMS do gościa + powiadomienie obsługi
  → CRM i historia kontaktu
```

Na początek można pominąć automatyczne sprawdzanie dostępności: n8n wysyła wtedy obsłudze komplet danych oraz zadanie odpowiedzi w ustalonym czasie, np. 30 minut w godzinach pracy.

### 2. Przyjęcia, wesela i grupy

Połącz wzorzec z `01-sprzedaz-kwalifikacja-leadow.json` z ofertą `przyjecia/`:

1. Formularz zbiera datę, liczbę gości, typ wydarzenia, budżet orientacyjny i kontakt.
2. n8n odrzuca spam, tworzy lead w CRM i oznacza priorytet.
3. Obsługa dostaje czytelne podsumowanie oraz termin kontaktu.
4. Jeżeli nie ma odpowiedzi, workflow wysyła wewnętrzne przypomnienie; marketingowy follow-up do klienta wymaga osobnej zgody, jeśli nie wynika z obsługi zapytania.

### 3. Opinie i pytania gości

`monitoring-opinii-odpowiedzi.json` jest dobrym punktem startu dla raportu opinii. Zalecany proces: wykrycie → propozycja odpowiedzi → akceptacja managera → publikacja przez człowieka. Nie publikuj automatycznie odpowiedzi AI, zwłaszcza na ocenę negatywną.

FAQ/chat można dodać dopiero po zebraniu zatwierdzonej bazy: menu, alergeny, godziny, zasady rezerwacji i parking. Odpowiedzi muszą być oparte wyłącznie na tych aktualnych danych, a pytania o nietypowe wymagania powinny trafiać do obsługi.

### Ochrona danych

- Zgoda na kontakt w sprawie rezerwacji nie jest zgodą marketingową; stosuj osobne checkboxy.
- Przekazuj do automatyzacji minimum danych potrzebnych do obsługi sprawy.
- Określ retencję danych, dostęp zespołu i procedurę usunięcia danych.
- Klucze API, tokeny i hasła przechowuj po stronie serwera / w poświadczeniach n8n, nigdy w `script.js`.

## ADR-002 — cyfrowa sala udostępnia tylko kontrolowaną część stolików

### Kontekst

Gość ma móc zobaczyć układ sali i wskazać preferowany stolik. Restauracja musi jednak zachować miejsca dla telefonów, gości bez rezerwacji, zmian operacyjnych oraz większych grup.

### Decyzja

Wyznacz stoliki dostępne online flagą `online_enabled` i dodatkowym limitem na konkretną zmianę. Punktem startowym jest maksymalnie **35% aktywnych stolików** na rezerwacje online — przykładowo 20 aktywnych stolików oznacza nie więcej niż 7 udostępnionych online. Nie licz limitu wyłącznie arytmetycznie: manager powinien móc wyłączyć pojedynczy stolik albo zmniejszyć pulę dla konkretnego dnia i serwisu.

### Alternatywy

| Model | Ocena |
|---|---|
| Wszystkie stoliki online | niezalecany: usztywnia pracę sali i zwiększa ryzyko konfliktów |
| Stałe 35% wybranych stolików | dobry MVP; prosty do wytłumaczenia obsłudze |
| Dynamiczny limit zależny od obłożenia i personelu | docelowy wariant; wymaga wiarygodnych danych operacyjnych |

### Konsekwencje

Wybór na mapie jest preferencją gościa, dopóki serwer nie potwierdzi dostępności i nie utworzy rezerwacji. Przy braku stołu zaproponuj inną godzinę, strefę lub kontakt z obsługą — nie zostawiaj gościa na błędzie technicznym.

## Moduł B — cyfrowa sala: plan implementacji

### Przepływ użytkownika

```text
Data + godzina + liczba osób
  → dostępne stoliki na mapie i w liście
  → wybór stolika / preferowanej strefy
  → dane kontaktowe i zgoda operacyjna
  → sprawdzenie ponowne po stronie serwera
  → prośba przyjęta albo potwierdzona rezerwacja
```

W wersji dla domu przyjęć ta sama mapa może pokazywać warianty ustawienia sali (bankiet, komunia, szkolenie) zamiast pojedynczych stolików.

### Architektura

```text
Konfiguracja sali (JSON/CMS)
  → interfejs mapy SVG + dostępna lista stolików
  → API rezerwacji
  → źródło prawdy o dostępności (dostawca / baza)
  → n8n: CRM, e-mail, zadania dla obsługi
```

Mapa SVG jest najlepsza dla stałego rzutu sali: skaluje się dobrze, pozwala opisać każdy stolik i nie wymaga ciężkiej biblioteki canvas. Nie buduj funkcji wyłącznie jako klikalnego obrazka — pod mapą musi istnieć równoważna lista „Stolik 1, okno, 2 osoby”.

### Minimalny model danych

| Pole | Przykład | Znaczenie |
|---|---|---|
| `table_id` | `sala-glowna-07` | niezmienny identyfikator techniczny |
| `label` | `Stolik 7` | nazwa widoczna dla gościa |
| `zone` | `przy-oknie` | strefa sali |
| `seats_min` / `seats_max` | `2` / `4` | dopuszczalna liczba gości |
| `online_enabled` | `true` | czy stolik może pojawić się online |
| `features` | `['okno', 'krzeselko-dzieciece']` | opis pomocny przy wyborze |
| `status` | `available` | stan zwrócony dla danego terminu |
| `updated_at` | ISO 8601 | moment ostatniego odświeżenia |

Odpowiedź o dostępności nie powinna zawierać danych innych gości ani szczegółów ich rezerwacji.

### Przykładowe żądanie integracyjne

To kontrakt do zaimplementowania po stronie serwera lub webhooka — nie wysyłaj go bezpośrednio z klienta z tajnymi kluczami.

```json
POST /api/reservation-requests
{
  "date": "2026-10-17",
  "time": "19:00",
  "party_size": 2,
  "selected_table_id": "sala-glowna-07",
  "guest": {
    "name": "Jan Kowalski",
    "email": "jan@example.com",
    "phone": "+48..."
  },
  "consents": { "reservation_contact": true, "marketing": false }
}
```

Przykładowa odpowiedź MVP: `{"status":"requested","message":"Sprawdzamy dostępność stolika 7."}`. Odpowiedź live, po udanej blokadzie: `{"status":"held","expires_at":"..."}` albo `{"status":"confirmed","reservation_reference":"..."}`.

### Stany i ochrona przed podwójną rezerwacją

```text
available → held (np. 10 min) → confirmed
             └──────────────→ released / expired
available → requested → confirmed lub declined
confirmed → cancelled
```

Interfejs może pokazać stolik jako dostępny, a sekundę później ktoś może go zająć. Dlatego backend musi wykonać finalne, atomowe sprawdzenie i utworzenie blokady. n8n sam nie gwarantuje takiej blokady — zapewnia ją dostawca rezerwacji albo transakcja w bazie. W przypadku konfliktu API zwraca alternatywę, a nie tworzy drugiej rezerwacji.

### Dostępność i UX

- Każdy stolik jako przycisk dostępny klawiaturą; kolory nie mogą być jedyną informacją o stanie.
- Czytnik ekranu powinien odczytać np. „Stolik 7, przy oknie, 2–4 osoby, dostępny”.
- Lista stolików i filtr „liczba osób / strefa / udogodnienia” są pełnoprawną alternatywą dla mapy.
- Po wyborze pokaż jasne podsumowanie: data, godzina, liczba osób i wybrany stolik.
- Na telefonie zacznij od listy i prostego mini-rzutu; duża mapa nie może dominować ekranu.

### Konfiguracja przekazywana przez klienta

Przed wdrożeniem zbierz: rzut sali, identyfikatory i pojemność stolików, niedostępne strefy, godziny serwisów, czas trwania wizyty, limit 35% dla każdego serwisu, wyjątki na daty specjalne, zasady spóźnienia/anulacji, kanał powiadomień i osobę dyżurną.

## Etapy wdrożenia

1. **Prototyp statyczny** — mapa i przykładowe stany bez wysyłki; test z obsługą sali.
2. **Prośba o stolik** — wybrany `table_id` trafia przez bezpieczny endpoint do n8n; obsługa potwierdza ręcznie.
3. **Dostępność live** — API odczytuje stan ze źródła prawdy i tworzy czasową blokadę.
4. **Panel operacyjny** — manager zmienia pulę online, wyłącza stoliki i widzi konflikty; można wtedy zwiększać automatyzację ostrożnie.

## Kryteria odbioru

- [ ] Maksymalna pula online nie przekracza konfiguracji (domyślnie 35%).
- [ ] Ten sam stolik i termin nie mogą przejść dwóch potwierdzeń.
- [ ] Awaria integracji nie komunikuje fałszywego potwierdzenia.
- [ ] Gość może zarezerwować/złożyć prośbę bez używania mapy.
- [ ] Obsługa ma prostą procedurę zmiany puli, anulacji i kontaktu z gościem.
- [ ] Dane osobowe, zgody i retencja są zatwierdzone przed uruchomieniem.

## Miejsca w obecnym szablonie

| Element | Docelowy punkt zmiany |
|---|---|
| CTA „Rezerwuj stolik” | `index.html`, `menu/index.html`, `kontakt/index.html` — prowadzi do modułu lub zewnętrznego systemu |
| Wysyłka danych | `script.js`, funkcja `sendLead()` — zastąpić bezpiecznym wywołaniem endpointu |
| Integracja operacyjna | nowy workflow n8n, oparty na `05-sprzedaz-umawianie-spotkan.json` |
| Mapa sali | nowa sekcja lub osobna trasa `/rezerwacje/`; nie doklejać ciężkiego modułu do hero |

Nie wdrażaj mapy i automatycznego potwierdzania „na skróty” przed ustaleniem źródła prawdy, procedury obsługi oraz zasad rezerwacji klienta.
