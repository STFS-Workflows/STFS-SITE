# OnePagery na Contabo — instrukcja

## Co jest zautomatyzowane

Każdy OnePager dostaje ten sam proces w GitHub Actions:

1. ręczne `Run workflow` z trzema polami: `site_slug`, katalog artefaktu i docelowa domena;
2. blokująca kontrola HTML/SEO — `index.html`, `robots.txt`, `sitemap.xml`, title, description, canonical oraz brak adresów demo;
3. archiwum oznaczone SHA commita;
4. przesłanie na VPS przez dedykowany klucz SSH;
5. atomowa zmiana symlinku `current` i zachowanie pięciu ostatnich wydań;
6. test plików aktywnej wersji na VPS.

Wdrożenie nie zaczyna się po każdym pushu. Jest ręczne, bo pojedyncze strony są zwykle stronami klientów i przed publikacją wymagają akceptacji danych, domeny oraz SEO.

## Stan STFS-SITE

`STFS-Workflows/STFS-SITE` jest podłączone jako pierwszy projekt i ma token tylko do odczytu na VPS. Jego lokalny katalog `dist/` nadal zawiera demonstracyjne dane `Atelier 27` i canonical do domeny generatora. Workflow celowo odrzuci ten artefakt. Nie zastępuje działającego `stfs.pl`.

Najpierw przygotuj prawdziwy artefakt STFS (nazwa, oferta, kontakt, dane prawne, canonical `https://stfs.pl`, sitemap, robots), a następnie uruchom workflow z `source_dir` wskazującym ten katalog. Dopiero po pomyślnym preflight oraz ręcznej kontroli można przełączyć DNS/Caddy na VPS.

## Pierwsza konfiguracja VPS

Wykonywana jednorazowo jako root:

```bash
bash /tmp/bootstrap-host.sh
install -m 755 /tmp/deploy-release.sh /opt/onepagers/bin/deploy-release.sh
install -m 755 /tmp/verify-release.sh /opt/onepagers/bin/verify-release.sh
```

Katalogi docelowe:

```text
/opt/onepagers/incoming/              # krótkotrwałe archiwa z GitHub Actions
/opt/onepagers/sites/<site>/releases/ # wydania
/opt/onepagers/sites/<site>/current   # aktywne wydanie — symlink
/opt/onepagers/secrets/               # tokeny tylko do odczytu, 0700/0600
```

## GitHub Environment `contabo-production`

W każdym repozytorium OnePagera ustaw Environment `contabo-production` i dodaj dokładnie:

| Sekret | Wartość |
|---|---|
| `CONTABO_SSH_HOST` | publiczny IP VPS |
| `CONTABO_ONEPAGER_SSH_USER` | `onepager-deploy` |
| `CONTABO_ONEPAGER_SSH_PRIVATE_KEY` | prywatny klucz tylko dla GitHub Actions |
| `CONTABO_KNOWN_HOSTS` | pojedyncza linia z `ssh-keyscan -H <IP>` |

Klucz GitHub Actions nie jest kluczem administratora ani kluczem lokalnym. Dostaje tylko możliwość przesłania artefaktu i uruchomienia dwóch dokładnie wskazanych poleceń przez `sudo`.

## Dodanie kolejnego klienta

1. Skopiuj `.github/workflows/deploy-onepager.yml` oraz `ops/onepagers/validate-static-site.sh` do repo klienta.
2. Wskaż katalog, który jest gotowym artefaktem statycznym, np. `dist`.
3. Ustaw te same cztery sekrety w Environment.
4. Dodaj w centralnym Caddy osobny fragment na podstawie `ops/onepagers/Caddyfile.site.example`; ustaw `root` na `/srv/onepagers/<site>/current`.
5. Dopiero wtedy ustaw DNS A/AAAA dla domeny klienta na VPS i uruchom workflow.

Nie używaj `stfs.pl` jako domeny klienta. Każdy klient dostaje własny `site_slug`, własny fragment Caddy i własną domenę.

## Rollback

Na VPS wybierz poprzedni katalog z `releases/` i przełącz symlink:

```bash
cd /opt/onepagers/sites/<site>
ln -sfn releases/<poprzedni-release> current
bash /opt/onepagers/bin/verify-release.sh <site>
```

Rollback nie rusza bazy danych, ponieważ OnePagery są statyczne.
