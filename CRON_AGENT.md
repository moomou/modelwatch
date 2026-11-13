# ModelWatch Weekly Refresh — Agent Runbook (`CRON_AGENT.md`)

You are the autonomous maintenance agent for **ModelWatch** (`/home/moomou/dev/modelwatch`, GitHub repository `moomou/modelwatch`, public site `https://paul.mou.dev/modelwatch/`).

Follow every step below in order whenever asked to refresh ModelWatch.

---

## 1. Sync & Inspect Current State

```bash
cd /home/moomou/dev/modelwatch
git checkout main
git pull --ff-only origin main
npm run model:list
```

Note the current `lastVerified` date in `src/data/models.json` and the latest release on each of the tracked model lines across all 14 labs.

---

## 2. Sweep Authoritative Release Sources

Check what shipped since `lastVerified` (and catch any missed intermediate releases on active tracks).

### 2A. Cross-Provider Confirmed Trackers (Check First)
1. `https://benchlm.ai/model-updates` (source-linked confirmed releases)
2. `https://artificialanalysis.ai/leaderboards/models` (live benchmarked models & exact AA `/models/<slug>` URLs)
3. `https://llm-stats.com/llm-updates`

### 2B. Primary Vendor Changelogs & Provider Feeds (Verify Every Addition Here)
Every release added to `src/data/models.json` **must** have an exact `YYYY-MM-DD` date verified from an official primary source (`openai.com`, `anthropic.com`, `aistudio.google.com` / `blog.google`, `x.ai` / `docs.x.ai`, `ai.meta.com` / `research.meta.ai`, `api-docs.deepseek.com`, `qwen.ai` / `alibabacloud.com`, `mistral.ai`, `kimi.ai`, `z.ai` / `docs.z.ai`, `minimax.io`, `microsoft.ai`, `huggingface.co`, `cohere.com`):

| Lab (`companyId`) | BenchLM Provider Feed | Primary Changelog / Release Hub |
| --- | --- | --- |
| `openai` | `https://benchlm.ai/model-updates/providers/openai` | `https://developers.openai.com/api/docs/changelog` / `https://openai.com/news/` |
| `anthropic` | `https://benchlm.ai/model-updates/providers/anthropic` | `https://www.anthropic.com/news` |
| `google` | `https://benchlm.ai/model-updates/providers/google` | `https://aistudio.google.com/docs/changelog` |
| `xai` | `https://benchlm.ai/model-updates/providers/xai` | `https://docs.x.ai/developers/release-notes` / `https://x.ai/news` |
| `meta` | `https://benchlm.ai/model-updates/providers/meta` | `https://research.meta.ai/blog/` / `https://ai.meta.com/blog/` |
| `deepseek` | `https://benchlm.ai/model-updates/providers/deepseek` | `https://api-docs.deepseek.com/updates/` |
| `alibaba` | `https://benchlm.ai/model-updates/providers/alibaba` | `https://www.alibabacloud.com/help/en/model-studio/newly-released-models` / `https://qwen.ai` |
| `mistral` | `https://benchlm.ai/model-updates/providers/mistral` | `https://mistral.ai/news/` |
| `moonshot` | `https://benchlm.ai/model-updates/providers/moonshot-ai` | `https://www.kimi.ai/blog` / `https://huggingface.co/moonshotai` |
| `zai` | `https://benchlm.ai/model-updates/providers/z-ai` | `https://docs.z.ai/release-notes/new-released` / `https://z.ai/blog` |
| `minimax` | `https://benchlm.ai/model-updates/providers/minimax` | `https://www.minimax.io/blog` |
| `microsoft` | `https://benchlm.ai/model-updates/providers/microsoft` | `https://microsoft.ai/news/` |
| `nvidia` | `https://benchlm.ai/model-updates/providers/nvidia` | `https://huggingface.co/nvidia` |
| `cohere` | `https://benchlm.ai/model-updates/providers/cohere` | `https://cohere.com/blog` |

### 2C. Strict Data-Quality Rules
- **Never trust SEO blogs** (`scriptbyai.com`, `taskade.com`, etc.) without primary-source confirmation. Never add rumors or unshipped future dates.
- **No zero-day collisions or trivial sub-variants**: Do not add GGUF/FP8 re-uploads, minor quantization drops, or tiny edge sub-variants into a flagship track if they distort the track's rolling 5-cycle median cadence.
- **Canonical date consistency**: Prefer public/API General Availability (`GA`) dates when a restricted preview preceded GA by a few days; do not add both preview and GA of the exact same model version as two separate generations in one track.
- **Track continuity & naming**:
  - When a lab renames a direct successor tier (e.g., `Gemini 3.8 Flash` → `Gemini 4 Hydrogen`, or `GPT-5.5` → `GPT-5.6 Sol`), append to that track and update the track's `name` and `summary` so historical cycle continuity is preserved.
  - When a lab retires or folds a track into another line, set `"lifecycle": "consolidated"` and provide a factual `"lifecycleNote"` so it no longer inflates active refresh-window counts.
  - When a tracked lab launches a genuinely new flagship product line, add it with `npm run model:add -- --new-line ...` (or directly in `src/data/models.json`).

---

## 3. Update Catalog, Benchmark Links & Chinese (`中文`) i18n

### 3A. Add Confirmed Releases & Update `lastVerified`
Use the CLI helper (auto-sorts chronologically, updates `lastVerified`, validates invariants, and rebuilds `dist/`):

```bash
npm run model:add -- \
  --line <lineId> \
  --version "<Exact Model Version>" \
  --date YYYY-MM-DD \
  --url "https://..." \
  --highlights "<Concise 1-sentence technical summary>"
```

If **zero** new releases shipped since the last check, still update `"lastVerified"` in `src/data/models.json` to today's `YYYY-MM-DD` date (`date +%Y-%m-%d`) so the site reflects a fresh verification pass.

### 3B. Verify Artificial Analysis & Arena Links (`src/lib/links.ts`)
For each newly added model, check whether Artificial Analysis has a live HTTP-200 model page:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://artificialanalysis.ai/models/<candidate-slug>"
```

- If it returns **`200`**, add `'<lowercase version>': '<candidate-slug>'` to `VERIFIED_AA_MODEL_SLUGS` in `src/lib/links.ts`.
- If it returns **`404`**, do **not** guess a slug — `resolveModelLinks()` will automatically fall back to the verified HTTP-200 provider/modality page on `artificialanalysis.ai` and the matching `arena.ai/leaderboard/...` category.

### 3C. Update Traditional Chinese Localization (`src/lib/i18n.ts`)
Whenever a track's latest model, track `name`, `tierLabel`, or `lifecycleNote` changes, update `src/lib/i18n.ts` so the `中文` (`zh-Hant`) view stays 100% localized:
- `ZH_CURRENT_HIGHLIGHTS['<lineId>']`: concise, natural Traditional Chinese summary of the new current release.
- `ZH_LINE_NAMES['<lineId>']`: update if the track's English `name` changed or a new line was created.
- `ZH_LIFECYCLE_NOTES['<lineId>']`: update if a line became `consolidated`.
- Terminology rule: use natural Traditional Chinese technical phrasing; call the language "Chinese" / `中文` (never label the language "Taiwanese").

---

## 4. Validate, Test & Build

Run the full validation, test, and build gate sequentially:

```bash
npm test && npm run build
```

All checks **must** pass with zero errors:
1. `scripts/validate-data.mjs` (schema, chronology, no duplicate versions/dates, valid `https://` URLs)
2. `vitest run` (`tests/cadence.test.ts` — UTC date math, cadence medians, link resolution, and complete Chinese localization across every line)
3. `tsc --noEmit` & `vite build` (updates `dist/` in ~100ms)

Also verify the local tailnet preview server on port `5188` is serving `dist/`:

```bash
curl -sfI http://127.0.0.1:5188/ >/dev/null || nohup ./node_modules/.bin/vite preview --host :: --port 5188 --strictPort >/dev/null 2>&1 &
```

*(Note: if you ever use `agent-browser` to inspect the UI, always run `agent-browser close` before finishing.)*

---

## 5. Commit, Push & Verify GitHub Pages Deployment

If `git status --short` shows changes:

```bash
git add src/data/models.json src/lib/links.ts src/lib/i18n.ts
git commit -m "Refresh model release data through $(date +%Y-%m-%d)"
git push origin main
```

Wait for the `Deploy GitHub Pages` GitHub Actions workflow to succeed and confirm the public site responds `HTTP 200`:

```bash
sleep 5
run_id=$(gh run list -R moomou/modelwatch --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$run_id" -R moomou/modelwatch --exit-status
curl -sfI "https://paul.mou.dev/modelwatch/" | head -n 5
```

Print a concise summary listing every newly added model (version, release date, official source URL) or confirming no new releases were published since the prior check.
