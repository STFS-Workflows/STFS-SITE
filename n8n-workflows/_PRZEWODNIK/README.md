# Przewodnik po workflowach n8n STFS – zacznij tutaj

Ten folder wyjaśnia po polsku, **co jest czym** w `n8n-workflows/`, co zostało naprawione i jak to uruchomić.

## Co czytać i w jakiej kolejności

| Plik | Po co |
|---|---|
| `README.md` (ten plik) | Mapa folderu: co jest czym |
| `mapa-workflowow.html` | **Wizualna mapa** – każdy workflow jako diagram kroków, z filtrem i wyszukiwarką. Otwórz w przeglądarce. |
| `CO-NAPRAWIONO.md` | Jakie były błędy i jak zostały naprawione (ogólnie i w każdym workflow) |
| `NOWE-WORKFLOWY.md` | 18 nowych workflowów (33–50): co robią, dlaczego te, czego wymagają |
| `JAK-URUCHOMIC.md` | Krok po kroku: import do n8n, credentiale, Konfiguracja, testy, aktywacja |
| `KATALOG.md` | Opis każdego workflow: co robi, przebieg, dane wejściowe, pola Konfiguracji, credentiale |

`KATALOG.md` i `mapa-workflowow.html` są **generowane automatycznie** z plików JSON – nie edytuj ich ręcznie.

## Co jest czym w folderze `n8n-workflows/`

```
n8n-workflows/
├── 00-obsluga-bledow.json            ← Error Workflow: alert Slack + e-mail, gdy coś się wysypie
├── 01…32-*.json                      ← katalog 32 automatyzacji (sprzedaż, marketing, obsługa, operacje,
│                                        finanse, HR, AI, e-commerce) – do importu w n8n
├── 33…50-*.json                      ← 18 nowych workflowów (23.09.2026) – opis w NOWE-WORKFLOWY.md
├── site-chatbot-odpowiedzi-na-zywo.json   ← DZIAŁAJĄCY chatbot na stfs.pl (webhook stfs-chat)
├── monitoring-opinii-odpowiedzi.json      ← usługa „Monitoring opinii” z akceptacją właściciela
│
├── _lib.js                     ← wspólna biblioteka budująca workflowy (zasady jakości w jednym miejscu)
├── generate.js                 ← generuje 00 + 01…50
├── generate-site-chatbot.js    ← generuje chatbota strony (tu jest baza wiedzy STFS)
├── generate-review-responder.js← generuje Monitoring opinii
├── validate.js                 ← automatyczna kontrola jakości wszystkich plików JSON
├── testy.js                    ← testy kodu z węzłów Code (walidacja, AI, limity, Twilio…)
├── opisy.js                    ← opisy „ludzkim językiem” + listy napraw (do przewodnika)
├── zbuduj-przewodnik.js        ← buduje KATALOG.md i mapa-workflowow.html
├── generuj-wszystko.js         ← JEDNA komenda: generuj → sprawdź → testuj → przewodnik
├── _indeks.json                ← lista workflowów z kategoriami (generowana)
├── README.md, SECURITY.md      ← ogólny opis i zasady bezpieczeństwa
└── _PRZEWODNIK/                ← ten folder
```

## Najważniejsza zasada

**Nie edytuj plików `.json` ręcznie.** Zmieniaj generator (`generate*.js`), potem uruchom:

```bash
cd n8n-workflows
node generuj-wszystko.js
```

To wygeneruje wszystkie workflowy od nowa (identycznie przy każdym uruchomieniu – czysty `git diff`), sprawdzi je (`validate.js`), przetestuje kod węzłów (`testy.js`) i odświeży ten przewodnik.

Wyjątek: jeśli zmienisz coś w edytorze n8n na żywym workflow – przenieś zmianę do generatora, inaczej zniknie przy kolejnym generowaniu.

## Jak zbudowany jest każdy workflow (wspólny szkielet)

```
Start (webhook / harmonogram / Telegram / ręcznie)
  → Walidacja danych      (tylko webhooki: wymagane pola, e-mail, długość tekstu)
  → Konfiguracja          (JEDYNE miejsce do podmiany adresów, progów, odbiorców)
  → właściwe kroki:
       AI = 3 węzły: „AI: prompt (…)” → „AI: …” → „AI: wynik (…)”
       IF  = zawsze obie gałęzie (tak / nie)
       Pamięć = „Pomiń już …” / „Zapamiętaj …” (bez duplikatów)
       Akceptacja = formularz dla człowieka przed wysłaniem czegoś ważnego
  → powiadomienie / zapis / odpowiedź
```

Workflowy z akceptacją człowieka: **27** (oferty), **29** (opinie w sklepie), **47** (urlopy), **Monitoring opinii**. Workflow **37** (Gmail) tworzy tylko szkice – wysyła człowiek.
