# STFS – Workflows audit (2026-09-22)

Scope: everything in `stfs/` that automates something:

| Group | Where | What |
|---|---|---|
| A. n8n automation catalog | `n8n-workflows/01…32-*.json` + `generate.js` | 32 importable skeletons, one per service on the STFS site catalog |
| B. Live site chatbot | `n8n-workflows/site-chatbot-odpowiedzi-na-zywo.json` + `generate-site-chatbot.js` + `script.js` widget | The only workflow actually running in production (`n8n.stfs.pl/webhook/stfs-chat`) |
| C. Review monitoring | `n8n-workflows/monitoring-opinii-odpowiedzi.json` + `generate-review-responder.js` | Testable prototype of the "Monitoring opinii" service |
| D. Deploy pipeline (Contabo) | `.github/workflows/deploy-onepager.yml` + `ops/onepagers/*` + `docs/ONEPAGER_DEPLOYMENT.md` | Manual, validated, atomic static-site deploy to a VPS |
| E. Client sites | `Dom-Przyjec-Premium-Radlin/`, `Dom-Przyjec-Gonsior/` (separate git repos) | GitHub Pages deploy + `venue-integrations.js` expecting n8n endpoints |

---

## 1. How it all fits together

```
Visitor ── stfs.pl (static) ──► chat widget (script.js)
                                   │  POST {question} + X-Stfs-Client header
                                   ▼
                     n8n.stfs.pl /webhook/stfs-chat  (B)
                     Code: build prompt (KB inline) → Anthropic Messages API (Haiku 4.5)
                     → Code: extract text → Respond {answer}

Sales demo / client onboarding ──► import catalog JSON (A) into client's n8n
                                   → replace placeholders, credentials → activate

Client one-pager repo ──► GitHub Actions (D, manual dispatch)
                          validate → tar → scp → sudo deploy-release.sh (atomic symlink)
                          → verify-release.sh → Caddy serves /…/current

Venue sites (E) ──► form → venue-integrations.js endpoints (inquiry / SMS / reviews / availability)
                    → n8n webhooks (NOT YET BUILT)
```

## 2. Group A – the 32 catalog workflows

### How they are built
`generate.js` is a tiny DSL: helper factories (`webhookTrigger`, `scheduleTrigger`, `aiHttpNode`, `ifNode`, `slackNode`, `emailNode`…) and `buildWorkflow()` that lays nodes out left-to-right, wires them as a **single linear chain**, prepends a yellow sticky note with setup instructions (+ a security note for webhook triggers), sets `active:false`, and writes JSON. Why: one source of truth, consistent look, cheap to regenerate 32 files, no secrets in files.

### What each one does

| # | Trigger | Chain | Purpose |
|---|---|---|---|
| 01 | Webhook `lead-nowy` | AI score → Code (score) → IF ≥70 → CRM POST → Slack | Lead scoring |
| 02 | Webhook `zapytanie-nowe` | AI reply → Email | Instant first reply |
| 03 | Cron 09:00 | GET CRM no_reply → IF ≥3 days → AI follow-up → Email | Follow-up |
| 04 | Webhook `dane-kontaktu` | Set (map fields) → CRM upsert | CRM without typing |
| 05 | Webhook `rezerwacja-konsultacji` | Calendar POST → Email | Booking |
| 06 | Manual | Set brief → AI 3 variants → CMS draft | Content gen |
| 07 | Cron Mon 08:00 | Meta Ads → Google Ads → Code merge (stub) → Slack | Campaign report |
| 08 | Cron 07:00 | GET contacts → Code segment → ESP send | Segmentation |
| 09 | Cron every 4h | GET mentions → AI sentiment → IF negative → Slack | Brand monitoring |
| 10 | Webhook `bot-faq` | AI → Telegram → Respond | FAQ bot |
| 11 | Webhook | AI category/priority → helpdesk → Slack | Ticket triage |
| 12 | Webhook | AI translate/summarise → Slack | Ticket translation |
| 13 | Webhook `zamowienie-oplacone` | Set → invoice API → Email | Invoicing |
| 14 | Webhook | OCR → Code fields → save | OCR |
| 15 | Webhook | Set → Google Sheets append | Sheets from forms |
| 16 | Cron 06:00 | GET stock → IF <10 → Slack | Stock alerts |
| 17 | Cron 05:00 | GET transactions → AI category → save | Expense categorisation |
| 18 | Cron 09:00 | GET unpaid → IF overdue → Email | Payment reminders |
| 19 | Cron 1st 07:00 | GET finance → AI summary → Email | Monthly report |
| 20 | Webhook | AI CV match → IF ≥70 → Slack | CV screening |
| 21 | Webhook | Calendar → Email | Interview booking |
| 22 | Webhook | Create accounts → Slack → Email | Onboarding |
| 23 | Webhook | AI → Slack | HR chatbot |
| 24 | Webhook (Twilio) | STT → AI → TTS → Respond | Voice receptionist |
| 25 | Webhook | Embed → vector search → AI → Respond | RAG chatbot |
| 26 | Webhook | Transcribe → AI score → save | Call analysis |
| 27 | Webhook | AI fill template → PDF → Email | Offers/quotes |
| 28 | Cron hourly | GET metrics → Code deviation → IF >30% → Slack | Anomaly detection |
| 29 | Webhook `opinia-nowa` | AI → **publish reply** | Review replies |
| 30 | Webhook | AI SEO description → shop | Product copy |
| 31 | Cron hourly | GET carts → AI → Email | Abandoned carts |
| 32 | Cron 06:00 | GET prices → Code diff → IF >10% → Slack | Price monitoring |

### Verdict
They are honest **visual skeletons / sales demos**, not runnable automations. Imported as-is, almost none produce a correct result even after filling URLs, because of structural bugs in the generator (fix once in `generate.js`, regenerate all):

**Blocking bugs (all found by static analysis of the JSON):**
1. **AI node sends the wrong body.** `aiHttpNode` posts `JSON.stringify($json)` (the raw webhook payload) to `/v1/chat/completions` – no `model`, no `messages`, no auth header. Affects 22 workflows. OpenAI will return 400.
2. **Data is lost after every HTTP node.** An HTTP node's output *replaces* the item, so later nodes reading `$json.email`, `$json.name`, `$json.aiResponse`, `$json.score` get `undefined` (e.g. 02 sends mail to nobody; 01 "score ?? 50" is always 50 → IF ≥70 never true → no lead ever reaches CRM). Need either a Code "parse AI" node that merges back `$('Trigger').item.json`, or HTTP option "Include input fields" / a Merge node.
3. **Expressions without `=` prefix are literal text.** Slack/email texts like `'Nowy gorący lead ({{$json.score}} pkt)'` send the braces verbatim. Affects 01, 05, 07, 09, 11, 12, 16, 18, 20, 21, 22, 28, 32.
4. **Respond-to-Webhook conflict** (10, 24, 25): trigger has `responseMode: onReceived` but chain ends in `respondToWebhook` → n8n errors / the caller never gets the answer. Use `responseMode: 'responseNode'` whenever a Respond node exists.
5. **No credentials on any HTTP node** (only notes). Should use `authentication: predefinedCredentialType` / generic Header Auth credentials, or native nodes (OpenAI, Anthropic, Google Calendar, Gmail, HubSpot, Telegram…).
6. **Multi-item handling ignored.** Scheduled GETs (03, 08, 16, 17, 18, 28, 31, 32) usually return `{data:[…]}` – one item. Needs `Split Out`; Code nodes returning a single item collapse lists.
7. **IF false branches unconnected**, no error workflow, no retries (`retryOnFail`), no idempotency (e.g. 13 invoice webhook re-delivered = duplicate invoice; 31/03 resend every run – no "already sent" flag).
8. **Webhook path collision:** 29 and `monitoring-opinii-odpowiedzi.json` both use `opinia-nowa` – cannot be active in the same instance.
9. **Promise mismatch:** 29 publishes AI replies automatically, the website promises "nic nie wychodzi bez zgody". Replace with the approval flow from group C.
10. Smaller: sender `hello@stfs.studio` vs real `kontakt@stfs.pl`; Telegram token embedded in URL (use Telegram node); 28 defaults `average=1` → huge false deviation when data is missing; 07 "merge" is a stub; 13 trusts `amount` from payload (your own SECURITY.md says not to – fetch from Stripe by id and verify signature); `const uid = () => crypto.randomUUID()` unused.

## 3. Group B – live site chatbot

**How:** widget POSTs `{question}` (≤500 chars) with header `X-Stfs-Client: stfs-site-widget-2026` → n8n Code node inlines a ~3 kB knowledge base in the system prompt (deliberate: KB too small to justify vector DB/RAG – cheaper, simpler, correct choice) → Anthropic `claude-haiku-4-5`, `max_tokens 400` → returns `{answer}`; widget types it out, falls back to e-mail text on errors.

**Problems:**
1. **Contradicts your own README/SECURITY.md.** Docs say "never call the protected webhook from browser JS; go through a gateway with CAPTCHA + rate-limit". Reality: the static site calls an *unauthenticated* webhook directly. The "client key" is public in page source (comment admits it).
2. **Unauthorized requests still cost money.** When the key is wrong the Code node swaps the question for a greeting prompt – but still calls Anthropic. Anyone can loop `curl` and burn your API budget. Fix: return early (IF → Respond 403) without calling the model.
3. **No rate limiting / CORS / abuse protection.** Minimum: Caddy `rate_limit` (or Cloudflare) on `/webhook/stfs-chat`, CORS allow-origin `https://stfs.pl` only, Turnstile token verified in n8n, and a hard monthly spend cap on the Anthropic key.
4. **API key as a plain header parameter** (`x-api-key` value) – it lives in the workflow JSON; any export/sync to git (you did "sync with live export" once) can leak it. Use an n8n Header Auth credential (or native Anthropic node).
5. **KB duplicated by hand** (script string vs site copy) – will drift. Generate KB from the site HTML at build time or keep one `kb.md` read by the generator.
6. No conversation memory (each question stateless) and no logging of questions → you lose the best source of lead insight. Add session id + write Q/A to a Sheet/Postgres (no PII).
7. Prompt-injection surface is small (text-only, rendered as text – good), keep it that way.

## 4. Group C – review monitoring prototype

Good design: validates input, truncates, strict JSON output (`response_format: json_object`), safe fallback, returns draft for approval instead of publishing.

Bugs/gaps:
1. `Wyodrebnij wynik` reads `$json.opinia_oryginalna` **after** the OpenAI node – it is gone. Use `$('Zbuduj prompt').item.json.opinia_oryginalna`.
2. OpenAI node has no auth configured.
3. Approval step missing (sticky note admits it): add email/Slack with "Approve / Edit" link → n8n `Wait` node (resume on webhook) → publish via Google Business Profile API.
4. Missing source: schedule + GBP API polling, dedupe by review id, store state.
5. Company name placeholder hard-coded in code – move to a Set node / per-client config.

## 5. Group D – Contabo one-pager deploy

**How/why:** manual `workflow_dispatch` (client sites need human sign-off), fail-closed preflight (title, description, canonical, no demo domains), immutable tarball tagged by SHA, restricted `onepager-deploy` user with sudo limited to two scripts, atomic `current` symlink, 5 releases kept for rollback. Solid architecture.

**Issues:**
1. **Path mismatch:** scripts deploy to `/opt/onepagers/sites/<slug>/current`, but Caddy example + docs use `/srv/onepagers/<site>/current`. Sites would 404.
2. **Default `source_dir: dist` is git-ignored** (`.gitignore` has `dist/`) – in CI checkout it does not exist, so the STFS repo can never deploy through this. Either build in CI or commit a real artifact dir.
3. **`rg` (ripgrep) is not guaranteed on `ubuntu-latest`** – add `sudo apt-get install -y ripgrep` or use `grep -E`.
4. **Script injection:** `${{ inputs.* }}` interpolated directly into `run:` shell. Pass via `env:` and quote.
5. **Symlink/hardlink entries in tar are not rejected** and extraction runs as root → a crafted artifact could make Caddy serve files outside the site. Reject `tar -tvzf | grep '^[lh]'`. Also normalise `ARTIFACT` with `realpath` (the glob check accepts `incoming/../..`).
6. Redeploying the **same SHA** does `rm -rf` on the live release dir before the symlink moves → brief outage. Stage then swap, or skip if identical.
7. "Smoke-test" only checks files on disk – add `curl -fsS https://<host>/ | grep <title>` after deploy.
8. Incoming tarballs never deleted; deploy user has a full bash shell (could be restricted to scp/rrsync).
9. Caddy HSTS `includeSubDomains` on client domains is risky (breaks any non-HTTPS subdomain the client has). Add a CSP.

## 6. Group E – venue sites (Radlin / Gonsior)

1. **Radlin `CNAME` = `stfs.pl`.** Its Pages workflow would try to claim your main domain. Remove/replace with the venue's domain.
2. **Radlin Pages publishes the whole repo**: `n8n-workflows/`, internal docs (`NASTEPNE-KROKI.md`, `README-WDROZENIE.md`…), `dist/` duplicates. Build `_site` from an allow-list instead.
3. The `sed` rewrite `href="/` → `/<repo>/` is correct for project Pages, but wrong once a custom domain is set (Radlin). Make it conditional.
4. Radlin carries an **older, insecure copy** of the catalog (no Header Auth on any webhook, no SECURITY.md). Delete it from the client repo – the catalog is STFS's IP and shouldn't sit in a client site repo.
5. `.package-stage/` holds 20+ tarballs – not in git, but clutter; add to `.gitignore`.
6. `venue-integrations.js` expects `inquiryEndpoint`, `smsStartEndpoint`, `smsVerifyEndpoint`, `reviewsEndpoint`, `availabilityEndpoint` – **none of these n8n workflows exist yet**. These are the workflows that would actually earn money for these clients.

## 7. Prioritised plan

**P0 – do now (security/cost/breakage)**
- Chatbot: early-return on bad key, Caddy rate-limit + CORS + Turnstile, key → n8n credential, Anthropic spend cap.
- Radlin: fix `CNAME`, allow-list publish, remove `n8n-workflows/` from repo.
- Deploy: fix `/srv` vs `/opt` path, `rg` install, env-var inputs, reject symlinks.

**P1 – make the catalog real**
- Rewrite `generate.js` helpers: proper AI node (native OpenAI/Anthropic node or HTTP with `model`/`messages` + credential), "Parse AI JSON" code node that merges trigger data, `=` on every expression, `responseMode` auto-set when a Respond node exists, `Split Out` after list GETs, `retryOnFail`, error workflow reference in `settings.errorWorkflow`.
- Add a CI check (`node generate.js && git diff --exit-code` + a lint like the one used for this audit) so JSON never drifts from the generator.
- Fix review prototype bug; replace 29 with approve-then-publish flow; unique webhook paths.

**P2 – productise**
- Build the 5 venue workflows (inquiry→CRM+mail, SMS OTP start/verify with hashed codes + limits, approved reviews feed, availability feed) as a reusable "venue pack".
- Per-client config via one Set node/env (`$env`) instead of editing code nodes.
- Chatbot: session memory, Q/A logging, KB generated from site content.
- Pick 5–6 catalog items you actually sell and turn them into tested, native-node versions with test payloads (Postman collection) instead of 32 thin skeletons.
