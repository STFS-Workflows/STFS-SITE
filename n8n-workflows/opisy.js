// Opisy "ludzkim językiem" i lista napraw dla każdego workflow.
// Używane przez zbuduj-przewodnik.js (katalog .md + mapa .html).
module.exports = {
  kategorie: {
    stfs: 'Działające u nas (STFS)',
    system: 'System',
    sprzedaz: 'Sprzedaż i leady',
    marketing: 'Marketing',
    obsluga: 'Obsługa klienta',
    operacje: 'Operacje i dokumenty',
    finanse: 'Finanse',
    hr: 'HR i rekrutacja',
    ai: 'Zaawansowane AI',
    ecommerce: 'E-commerce',
  },
  wspolne: [
    { temat: 'Krok AI', przed: 'Do OpenAI szły surowe dane formularza – bez modelu, wiadomości i klucza. Każde wywołanie kończyło się błędem 400.', po: 'Trzy węzły: prompt → model → wynik. Odpowiedź jest parsowana jako JSON, liczby przycinane do zakresu, a przy błędzie nic nie trafia do klienta.' },
    { temat: 'Dane między krokami', przed: 'Po każdym kroku HTTP dane wejściowe znikały: e-mail pusty, score zawsze 50, Slack bez treści.', po: 'Kolejne kroki czytają z właściwego węzła źródłowego; walidator pilnuje, żeby był wcześniej w przepływie.' },
    { temat: 'Treść wiadomości', przed: 'Wyrażenia bez „=” – klient dostawał dosłownie {{$json.date}}.', po: 'Każde wyrażenie zaczyna się od „=”, nowe linie działają.' },
    { temat: 'Dane z webhooka', przed: 'Pola czytane z niewłaściwego miejsca, brak kontroli poprawności.', po: 'Węzeł „Walidacja danych”: wymagane pola, format e-maila, limit długości.' },
    { temat: 'Listy z API', przed: 'Z 50 faktur sprawdzana była tylko pierwsza.', po: 'Węzeł „Rozbij listę” – każdy rekord osobno.' },
    { temat: 'Duplikaty', przed: 'Follow-upy, przypomnienia i alerty wysyłane przy każdym przebiegu; ryzyko podwójnej faktury.', po: 'Pamięć workflow: „Pomiń już…” i „Zapamiętaj…” z czasem wygaśnięcia.' },
    { temat: 'Konfiguracja i dostęp', przed: 'Adresy i progi rozrzucone po węzłach, HTTP bez credentiali.', po: 'Jeden węzeł „Konfiguracja”; każdy HTTP z credentialem, timeoutem i 3 próbami.' },
    { temat: 'Błędy i czas', przed: 'Awarie niewidoczne, niepodłączone gałęzie IF, strefa czasowa serwera.', po: 'Workflow 00 wysyła alert, obie gałęzie IF jawne, strefa Europe/Warsaw.' },
  ],
  workflowy: {
    '00-obsluga-bledow.json': {
      cel: 'Gdy którykolwiek workflow się wysypie, dostajesz od razu Slacka i e-mail z nazwą workflow, węzłem i komunikatem błędu.',
      naprawiono: ['Nowy – wcześniej błędy były niewidoczne, dopóki klient się nie poskarżył.'],
    },
    'site-chatbot-odpowiedzi-na-zywo.json': {
      cel: 'Chatbot na stfs.pl: odpowiada odwiedzającym na pytania o usługi STFS na podstawie wklejonej bazy wiedzy (Claude Haiku).',
      naprawiono: [
        'Żądanie ze złym kluczem nadal wywoływało model (płaciliśmy za spam) – teraz odmowa BEZ wywołania AI.',
        'Dodane limity: 15 pytań / 10 min na IP i 600 dziennie.',
        'Sprawdzany nagłówek Origin + CORS tylko dla stfs.pl.',
        'Klucz Anthropic przeniesiony do credentiala (wcześniej wpisywany w nagłówek w workflow – ryzyko wycieku przy eksporcie).',
        'Kontrakt z widgetem bez zmian – script.js nie wymaga modyfikacji.',
      ],
    },
    'monitoring-opinii-odpowiedzi.json': {
      cel: 'Usługa „Monitoring opinii”: AI ocenia opinię i pisze projekt odpowiedzi, właściciel zatwierdza w formularzu, dopiero wtedy publikacja w Google.',
      naprawiono: [
        'Pole opinia_oryginalna było zawsze puste (gubione po kroku AI).',
        'Dodany krok akceptacji przez właściciela (formularz) i publikacja w Google Business Profile.',
        'Brak credentiala dla OpenAI – dodany.',
      ],
    },
    '01-sprzedaz-kwalifikacja-leadow.json': {
      cel: 'Każdy lead z formularza dostaje ocenę 0–100 od AI, trafia do CRM, a handlowiec dostaje Slacka tylko o gorących.',
      naprawiono: ['Score zawsze wynosił 50, więc żaden lead nie był „gorący” – teraz liczony z odpowiedzi AI.', 'Do CRM trafia każdy lead (wcześniej tylko gorące).'],
    },
    '02-sprzedaz-automatyczne-odpowiedzi.json': {
      cel: 'Klient dostaje w minutę uprzejmą odpowiedź z zaproszeniem na konsultację; zespół widzi kopię.',
      naprawiono: ['E-mail szedł na pusty adres z pustą treścią.', 'Jeśli AI zawiedzie – nic nie idzie do klienta, zespół dostaje alert.'],
    },
    '03-sprzedaz-follow-up.json': {
      cel: 'W dni robocze wysyła jeden nienachalny follow-up do leadów, które nie odpowiedziały od X dni.',
      naprawiono: ['Wysyłał follow-up codziennie w kółko – teraz raz na lead (oznaczenie w CRM + pamięć workflow).', 'Lista z CRM jest rozbijana na pojedyncze leady; dni liczone z daty kontaktu.'],
    },
    '04-sprzedaz-aktualizacja-crm.json': {
      cel: 'Dane z formularzy/czatu same trafiają do CRM jako nowy lub zaktualizowany kontakt (bez duplikatów).',
      naprawiono: ['Pola były czytane z niewłaściwego miejsca (body webhooka) – zawsze puste.'],
    },
    '05-sprzedaz-umawianie-spotkan.json': {
      cel: 'Rezerwacja konsultacji tworzy wydarzenie w kalendarzu i wysyła potwierdzenie z terminem po polsku.',
      naprawiono: ['Potwierdzenie zawierało dosłownie „{{$json.date}}”.', 'Walidacja terminu (nie w przeszłości), wyliczenie końca spotkania.'],
    },
    '06-marketing-generowanie-tresci.json': {
      cel: 'Z briefu tworzy 3 warianty reklamy/posta i zapisuje jako wersje robocze.',
      naprawiono: ['Model nie dostawał briefu.', 'Brief, kanał i ton w Konfiguracji.'],
    },
    '07-marketing-raportowanie-kampanii.json': {
      cel: 'W poniedziałek rano Slack z wynikami Meta i Google Ads z 7 dni + komentarz AI i rekomendacje.',
      naprawiono: ['Krok „połącz dane” był pustą zaślepką – teraz sumuje wydatki, kliknięcia, konwersje.', 'Google Ads: poprawna metoda POST, zapytanie GAQL, OAuth + developer-token.'],
    },
    '08-marketing-segmentacja-mailingow.json': {
      cel: 'Codziennie przypisuje kontaktom segment (klient aktywny / uśpiony / lead) jako tag w systemie mailingowym.',
      naprawiono: ['Poprzednio wysyłał KAMPANIĘ do każdego kontaktu codziennie – teraz tylko aktualizuje tagi.', 'Pomija kontakty bez zgody marketingowej.'],
    },
    '09-marketing-monitoring-wzmianek.json': {
      cel: 'Co 4 godziny sprawdza nowe wzmianki o marce i alarmuje o negatywnych.',
      naprawiono: ['Te same wzmianki alarmowały przy każdym przebiegu – teraz pamięć już widzianych.', 'Alert zawierał dosłowny tekst {{ }}.'],
    },
    '10-obsluga-bot-faq.json': {
      cel: 'Bot na Telegramie odpowiada klientom na pytania z FAQ; gdy nie wie – odsyła do kontaktu.',
      naprawiono: ['Webhook nigdy nie zwracał odpowiedzi (konflikt trybu odpowiedzi).', 'Natywny Telegram Trigger zamiast tokenu w URL.'],
    },
    '11-obsluga-kategoryzacja-zgloszen.json': {
      cel: 'Zgłoszenie dostaje kategorię, priorytet i streszczenie; pilne od razu na Slacka.',
      naprawiono: ['Slack dostawał puste pola.', 'Przy błędzie AI priorytet domyślny „średni” zamiast braku.'],
    },
    '12-obsluga-tlumaczenie-streszczanie.json': {
      cel: 'Zgłoszenie w obcym języku jest tłumaczone na polski i streszczane dla zespołu.',
      naprawiono: ['Na Slacka szedł dosłowny tekst {{$json.aiResponse}}.'],
    },
    '13-operacje-wystawianie-faktur.json': {
      cel: 'Po opłaceniu zamówienia wystawia fakturę i wysyła ją klientowi e-mailem.',
      naprawiono: ['Kwota była brana z webhooka (każdy mógł podać dowolną) – teraz zamówienie pobierane ze źródła.', 'Faktura tylko dla statusu „paid” i tylko raz na zamówienie.'],
    },
    '14-operacje-ocr-dokumentow.json': {
      cel: 'Skan faktury/paragonu → tekst (Google Vision) → AI wyciąga numer, datę, kwotę, NIP → zapis.',
      naprawiono: ['Krok „wyciągnij pola” nic nie wyciągał – dodana ekstrakcja AI.', 'Niepewne dokumenty idą do ręcznej weryfikacji.'],
    },
    '15-operacje-uzupelnianie-arkuszy.json': {
      cel: 'Każde zgłoszenie z formularza dopisuje się jako wiersz w Google Sheets.',
      naprawiono: ['Węzeł Google Sheets nie miał wskazanego arkusza ani mapowania kolumn.', 'Data w strefie Europe/Warsaw.'],
    },
    '16-operacje-alerty-magazynowe.json': {
      cel: 'Codziennie rano jedna zbiorcza wiadomość o produktach poniżej minimalnego stanu.',
      naprawiono: ['Sprawdzał tylko pierwszy produkt (lista nie była rozbijana).', 'Zbiorczy alert zamiast spamu per produkt.'],
    },
    '17-finanse-kategoryzacja-transakcji.json': {
      cel: 'AI przypisuje transakcjom kategorię kosztową; niepewne trafiają do ręcznego sprawdzenia.',
      naprawiono: ['Każda transakcja była kategoryzowana wielokrotnie – teraz raz.', 'Próg pewności zamiast ślepego zapisu.'],
    },
    '18-finanse-przypomnienia-platnosci.json': {
      cel: 'Uprzejme przypomnienia o przeterminowanych fakturach (maks. raz w tygodniu), po 30 dniach eskalacja do człowieka.',
      naprawiono: ['Przypomnienie codziennie tej samej osobie – teraz maks. raz na tydzień.', 'Treść maila zawierała dosłowny tekst {{ }}.'],
    },
    '19-finanse-raporty-miesieczne.json': {
      cel: '1. dnia miesiąca e-mail z podsumowaniem finansów poprzedniego miesiąca.',
      naprawiono: ['Nie określał okresu – teraz automatycznie poprzedni miesiąc.', 'Odbiorca w Konfiguracji zamiast wpisanego na sztywno.'],
    },
    '20-hr-selekcja-cv.json': {
      cel: 'AI ocenia dopasowanie CV do wymagań; wszystko trafia do ATS, rekruter dostaje info o najlepszych.',
      naprawiono: ['Decyzja zostaje przy człowieku (RODO/AI Act) – brak automatycznych odmów.', 'Prompt ignoruje cechy niezwiązane z pracą.'],
    },
    '21-hr-umawianie-rozmow.json': {
      cel: 'Kandydat wybiera termin → wydarzenie w kalendarzu → potwierdzenie → Slack.',
      naprawiono: ['Potwierdzenie z dosłownym {{ }}.', 'Walidacja terminu.'],
    },
    '22-hr-onboarding.json': {
      cel: 'Nowy pracownik: konta w narzędziach, info dla HR i e-mail powitalny z checklistą.',
      naprawiono: ['Po kroku HTTP ginęły imię i e-mail pracownika.', 'Checklista w Konfiguracji.'],
    },
    '23-hr-chatbot.json': {
      cel: 'Pracownicy pytają o urlopy/benefity, AI odpowiada tylko z polityk HR.',
      naprawiono: ['Odpowiedź szła na Slacka zamiast wracać do pytającego.'],
    },
    '24-ai-agent-glosowy.json': {
      cel: 'Wirtualna recepcja przez telefon: Twilio rozpoznaje mowę, AI odpowiada, Twilio czyta odpowiedź.',
      naprawiono: ['Przebudowa: łańcuch STT→AI→TTS nie mógł działać w czasie rozmowy – teraz Twilio Gather/Say (TwiML).', 'Weryfikacja podpisu Twilio zamiast Header Auth (którego Twilio nie wysyła).'],
    },
    '25-ai-rag-chatbot.json': {
      cel: 'Chatbot odpowiadający z dokumentacji firmy (wyszukiwanie w Supabase pgvector) ze źródłami.',
      naprawiono: ['Embedding i wyszukiwanie nie dostawały pytania.', 'Fragmenty są łączone w jeden kontekst; odpowiedź wraca do pytającego.'],
    },
    '26-ai-analiza-rozmow.json': {
      cel: 'Nagranie rozmowy → transkrypcja → ocena AI → CRM; słabe rozmowy do coachingu.',
      naprawiono: ['Whisper wymaga pliku (multipart) – dodane pobranie nagrania i poprawna wysyłka.'],
    },
    '27-ai-generowanie-ofert.json': {
      cel: 'Z briefu AI przygotowuje ofertę z cennika i PDF; handlowiec zatwierdza przed wysyłką.',
      naprawiono: ['Oferta z cenami szła do klienta bez kontroli – teraz formularz akceptacji.', 'Ceny tylko z cennika w Konfiguracji.'],
    },
    '28-ai-wykrywanie-anomalii.json': {
      cel: 'Co godzinę wykrywa nietypowe skoki/spadki metryk; maks. 1 alert na metrykę dziennie.',
      naprawiono: ['Brak średniej dawał fałszywe alarmy – teraz brak danych = brak alertu.', 'Alert co godzinę dla tej samej anomalii – teraz raz na dobę.'],
    },
    '29-ecommerce-odpowiedzi-na-opinie.json': {
      cel: 'Opinie w sklepie: AI pisze projekt odpowiedzi, właściciel zatwierdza/poprawia, potem publikacja.',
      naprawiono: ['Publikował automatycznie – wbrew obietnicy „nic bez Twojej zgody”.', 'Kolizja ścieżki webhooka z Monitoringiem opinii (teraz „opinia-sklep”).'],
    },
    '30-ecommerce-opisy-produktow.json': {
      cel: 'Nowy produkt dostaje opis SEO (tytuł, meta, opis, punkty) jako szkic do przejrzenia.',
      naprawiono: ['Nadpisywał opis na żywo – teraz szkic.', 'Limity długości SEO pilnowane w kodzie.'],
    },
    '31-ecommerce-porzucone-koszyki.json': {
      cel: 'Jedno przypomnienie o porzuconym koszyku, tylko dla osób ze zgodą marketingową.',
      naprawiono: ['Wysyłał co godzinę do tych samych osób – teraz raz na koszyk.', 'Sprawdza zgodę marketingową (RODO).'],
    },
    '32-ecommerce-monitoring-cen.json': {
      cel: 'Codziennie jeden raport produktów, których cena odbiega od konkurencji o więcej niż próg.',
      naprawiono: ['Sprawdzał tylko pierwszy produkt i tylko „drożej” – teraz wszystkie, w obie strony.', 'Brak ceny nie daje fałszywego alertu.'],
    },
    '33-sprzedaz-zapytanie-o-termin.json': {
      nowy: true,
      cel: 'Formularz „zapytaj o termin” (sale, restauracje, usługi): zgłoszenie trafia do CRM, biuro dostaje pełny e-mail, właściciel krótki SMS, a klient numer zgłoszenia.',
      naprawiono: ['Wypełnia lukę ze stron Dom Przyjęć (inquiryEndpoint nie miał backendu).', 'Walidacja telefonu (+48), daty i liczby gości.', 'Awaria SMS nie gubi zgłoszenia – jest już w CRM i e-mailu.', 'Zapytanie nie blokuje kalendarza – termin potwierdza człowiek.'],
    },
    '34-obsluga-weryfikacja-sms.json': {
      nowy: true,
      cel: 'Weryfikacja numeru telefonu kodem SMS przed ważną akcją (np. zamówieniem cateringu) – jeden webhook: wyślij kod / sprawdź kod.',
      naprawiono: ['Kod przechowywany tylko jako HMAC, porównanie w stałym czasie.', 'Maks. 3 próby, ważność 10 min, maks. 3 SMS na numer na godzinę.', 'Historia wykonań wyłączona – kod nie trafia do bazy n8n.', 'Test znalazł i naprawił błąd: udana weryfikacja resetowała limit wysyłek.'],
    },
    '35-operacje-przypomnienia-o-wizytach.json': {
      nowy: true,
      cel: 'Dzień przed wizytą klient dostaje SMS (albo e-mail) z godziną, adresem i linkiem do zmiany terminu – mniej nieobecności.',
      naprawiono: ['SMS, gdy jest numer; e-mail jako zapas; brak kontaktu → Slack.', 'Każda rezerwacja dostaje jedno przypomnienie (pamięć workflow).', 'Godzina w strefie Europe/Warsaw.'],
    },
    '36-marketing-prosba-o-opinie.json': {
      nowy: true,
      cel: 'Kilka dni po zrealizowanym zamówieniu klient dostaje uprzejmą prośbę o opinię w Google – buduje reputację razem z Monitoringiem opinii.',
      naprawiono: ['Workflow sam odczekuje X dni (węzeł Wait), potem sprawdza, czy zamówienie nie zostało anulowane.', 'Prośbę dostaje każdy – bez filtrowania zadowolonych (zakaz „review gating” w Google) i bez nagród.', 'Jedna prośba na zamówienie.'],
    },
    '37-obsluga-skrzynka-gmail.json': {
      nowy: true,
      cel: 'AI czyta nowe maile, nadaje kategorię i pilność, a gdy trzeba odpowiedzieć – tworzy szkic odpowiedzi w tym samym wątku Gmaila. Pilne od razu na Slacka.',
      naprawiono: ['Tylko szkice – nic nie jest wysyłane bez człowieka.', 'Newslettery i noreply pomijane (nie marnuje tokenów).', 'Ochrona przed poleceniami ukrytymi w treści maila (prompt injection).'],
    },
    '38-marketing-raport-ruchu-strony.json': {
      nowy: true,
      cel: 'W poniedziałek klient dostaje e-mail: ruch na stronie z GA4 (tydzień do tygodnia), 10 fraz z Google i 3 rekomendacje AI prostym językiem.',
      naprawiono: ['Porównanie z poprzednim tygodniem w procentach.', 'Okres Search Console przesunięty o 2 dni (opóźnienie danych Google).', 'AI używa tylko podanych liczb.'],
    },
    '39-operacje-monitoring-strony.json': {
      nowy: true,
      cel: 'Co 5 minut sprawdza, czy strony (klientów, stfs.pl, webhook chatbota) działają. Alert przy awarii i informacja po przywróceniu z czasem trwania.',
      naprawiono: ['Alarm dopiero po 2 błędach z rzędu – bez fałszywych alarmów.', 'Jeden alert na awarię, nie co 5 minut.', 'Udane przebiegi nie są zapisywane (288 dziennie).'],
    },
    '40-system-kopia-workflowow.json': {
      nowy: true,
      cel: 'Każdej nocy zapisuje wszystkie workflowy z n8n w prywatnym repo GitHub – historia zmian i kopia na wypadek awarii serwera.',
      naprawiono: ['Commit tylko, gdy workflow się zmienił.', 'Z kopii usuwane staticData (m.in. adresy IP z limitów chatbota) i pinData.', 'Zapisy do GitHuba po kolei, żeby nie było konfliktów.'],
    },
    '41-finanse-weryfikacja-kontrahenta.json': {
      nowy: true,
      cel: 'Przed zapłatą faktury sprawdza kontrahenta w białej liście VAT Ministerstwa Finansów: poprawność NIP, status „Czynny” i czy rachunek jest w wykazie. Zapisuje dowód sprawdzenia.',
      naprawiono: ['Suma kontrolna NIP i długość rachunku sprawdzane przed zapytaniem do MF.', 'requestId z MF archiwizowany jako dowód sprawdzenia w dniu zapłaty.', 'Problem → Slack z prośbą o wstrzymanie płatności.'],
    },
    '42-finanse-przeliczanie-walut-nbp.json': {
      nowy: true,
      cel: 'Przelicza kwotę faktury walutowej na PLN po średnim kursie NBP z ostatniego dnia roboczego przed datą faktury i zwraca gotową adnotację (kurs, tabela, data).',
      naprawiono: ['Pobiera 10 dni wstecz, więc weekendy i święta nie psują wyniku.', 'Wybiera ostatni kurs sprzed daty faktury, nie z tego samego dnia.', 'Kwota zaokrąglana do groszy.'],
    },
    '43-marketing-newsletter-z-bloga.json': {
      nowy: true,
      cel: 'Co tydzień z nowych wpisów na blogu powstaje szkic newslettera z krótkim wstępem AI – gotowy do przejrzenia i wysłania w systemie mailingowym.',
      naprawiono: ['Tylko szkic kampanii – wysyłkę klika człowiek.', 'Brak nowych wpisów = brak newslettera.', 'Treść HTML escapowana (bez wstrzykiwania kodu z RSS).'],
    },
    '44-marketing-publikacja-social-media.json': {
      nowy: true,
      cel: 'Posty zaplanowane w arkuszu Google (status „zatwierdzony”) same publikują się na stronie firmowej na Facebooku o wyznaczonej godzinie, a arkusz dostaje status i ID posta.',
      naprawiono: ['Publikuje tylko zatwierdzone posty z datą, która już minęła.', 'Pamięć workflow chroni przed podwójną publikacją.', 'Udane przebiegi co 15 minut nie są zapisywane.'],
    },
    '45-obsluga-analiza-ankiet-nps.json': {
      nowy: true,
      cel: 'Każda odpowiedź NPS jest zapisywana; niezadowoleni klienci (0–6) od razu trafiają do zespołu jako zgłoszenie „oddzwoń” ze streszczeniem AI, zadowoleni dostają podziękowanie.',
      naprawiono: ['Podział detraktor / pasywny / promotor liczony w kodzie, nie przez AI.', 'Promotorzy nie są tu proszeni o opinię (bez „review gating”).', 'Brak komentarza nie blokuje zgłoszenia.'],
    },
    '46-ecommerce-zwroty-i-reklamacje.json': {
      nowy: true,
      cel: 'Formularz zwrotu lub reklamacji: sprawdza termin (14 dni na zwrot, 2 lata na reklamację) na podstawie daty dostawy z systemu, nadaje numer RMA i wysyła instrukcję odesłania.',
      naprawiono: ['Data dostawy i e-mail brane z zamówienia w sklepie, nie od klienta.', 'Po terminie nic nie jest odrzucane automatycznie – decyduje człowiek, klient dostaje potwierdzenie.', 'Przypomnienie o 14 dniach na odpowiedź na reklamację.'],
    },
    '47-hr-wnioski-urlopowe.json': {
      nowy: true,
      cel: 'Wniosek urlopowy z liczeniem dni roboczych (bez weekendów i polskich świąt), akceptacją przełożonego w formularzu i wpisem do kalendarza zespołu.',
      naprawiono: ['Polskie święta liczone automatycznie, także ruchome (Wielkanoc, Boże Ciało) i Wigilia.', 'Przełożony może dopisać komentarz, który trafia do pracownika.', 'Brak decyzji w 5 dni = informacja do pracownika zamiast wiszącego wniosku.'],
    },
    '48-ai-notatki-ze-spotkan.json': {
      nowy: true,
      cel: 'Z nagrania spotkania powstaje notatka (streszczenie, decyzje, zadania), która trafia do uczestników, a każde zadanie ląduje w narzędziu do zadań.',
      naprawiono: ['AI wpisuje osobę i termin tylko, gdy padły w rozmowie (bez zgadywania).', 'Maks. 30 zadań, tworzone po kolei.', 'Przypomnienie o zgodzie na nagrywanie (RODO).'],
    },
    '49-finanse-kontrola-ksef.json': {
      nowy: true,
      cel: 'W dni robocze co 2 godziny sprawdza, czy faktury trafiły do KSeF. Odrzucone lub bez potwierdzenia dłużej niż X godzin → alert.',
      naprawiono: ['Alert raz na fakturę i status (bez spamu co 2 godziny).', 'Działa na danych z systemu fakturowego – bez własnej integracji z API KSeF.', 'Próg godzin w Konfiguracji.'],
    },
    '50-system-raport-zdrowia-automatyzacji.json': {
      nowy: true,
      cel: 'W poniedziałek raport: liczba błędów z tygodnia, workflowy psujące się najczęściej i aktywne workflowy bez ustawionego Error Workflow.',
      naprawiono: ['Wskazuje workflowy, których awarii nikt by nie zauważył.', 'Razem z 00 i 40 tworzy pakiet „opieka nad automatyzacjami”.', 'Czyta tylko metadane wykonań, bez danych klientów.'],
    },
  },
};
