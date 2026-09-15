# Bezpieczne uruchamianie workflowów n8n

Workflowy są nieaktywne i celowo nie mają żadnych prawdziwych danych ani credentials. Nie aktywuj ich przed przejściem poniższej listy.

## Webhooki

1. Dla każdego webhooka utwórz oddzielny credential typu **Header Auth** w n8n. Użyj losowego tokenu o co najmniej 32 bajtach i trzymaj go wyłącznie w credentialu.
2. Nie przekazuj tokenu do strony statycznej ani aplikacji mobilnej. Formularze z przeglądarki powinny trafiać najpierw do własnego backendu lub gatewaya.
3. Gateway ma sprawdzić CAPTCHA, ograniczyć żądania według IP i sesji oraz zweryfikować schemat wejścia. Dopiero wtedy może wysłać żądanie do n8n z sekretnym nagłówkiem.
4. W przypadku Stripe, Twilio, Shopify i podobnych usług zweryfikuj ich podpis webhooka na surowym body. Header Auth nie zastępuje weryfikacji podpisu dostawcy.
5. Ogranicz CORS w webhookach do znanych originów tylko wtedy, gdy endpoint rzeczywiście musi być wywoływany przez przeglądarkę. CORS nie jest mechanizmem uwierzytelniania.

## Skutki uboczne i AI

- Waliduj dane po stronie serwera przed wysłaniem e-maila, utworzeniem wydarzenia, zapisem do CRM lub publikacją odpowiedzi.
- Pobieraj kwoty, produkty oraz statusy płatności z zaufanego systemu źródłowego na podstawie identyfikatora transakcji. Nigdy nie ufaj cenie w payloadzie klienta.
- Klucze dostawców AI zapisuj jako Credentials w n8n. Ustaw limity kosztów u dostawcy oraz rate-limit w gatewayu.
- Traktuj odpowiedź modelu jako nieufną: ogranicz jej długość, waliduj strukturę przed użyciem i renderuj ją jako tekst, nie HTML.

## Weryfikacja przed produkcją

1. Uruchom `n8n audit` na instancji i usuń zgłoszone niechronione webhooki.
2. Sprawdź, że żaden workflow nie ma danych testowych, placeholderów ani poświadczeń w eksporcie.
3. Przetestuj niepoprawny podpis, brak tokenu, zbyt częste żądania oraz nieprawidłowy payload. Każdy przypadek musi zostać odrzucony bez uruchomienia akcji zewnętrznej.
