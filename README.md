# ModelWatch

Live site: **https://paul.mou.dev/modelwatch/**

Track how many days have passed since each major AI model line was updated, measured against its historical release cadence — across OpenAI, Anthropic, Google DeepMind, xAI, Meta, DeepSeek, Alibaba Qwen, Mistral AI, Moonshot AI (Kimi), Z.AI (GLM), MiniMax, Microsoft, NVIDIA, and Cohere.

Includes full English (`EN`) and Chinese (`中文`) localization, plus direct links to official release posts, Artificial Analysis, and Arena leaderboards for every model.

## Quick Start

```bash
npm install
npm run dev      # http://localhost:5188
npm test         # Validates catalog invariants + runs Vitest suite
npm run build    # Validates catalog + TypeScript check + production Vite build
```

## Updating When New Models Drop

All day counts, generation spans, rolling 5-cycle medians, all-time averages, and Buyer's Guide status badges (`Just Dropped`, `Fresh`, `Mid-Cycle`, `Due Soon`, `Overdue`, `Consolidated`) are computed dynamically from release dates in `src/data/models.json`.

### Option 1: One-Line CLI Updater (Recommended)

```bash
# List all existing model line IDs
npm run model:list

# Append a release (auto-sorts chronologically, updates lastVerified, validates invariants)
npm run model:add -- \
  --line anthropic-opus \
  --version "Claude Opus 5.6" \
  --date 2026-11-25 \
  --url "https://www.anthropic.com/news/claude-opus-5-6" \
  --highlights "Expanded autonomous repo synthesis and faster adaptive thinking."
```

### Option 2: Direct JSON Edit

Edit `src/data/models.json` (backed by `src/data/models.schema.json` for instant editor autocomplete & inline validation) and run:

```bash
npm run build
```

### Option 3: Autonomous Agent / Weekly Cron Refresh

Point any coding agent at `CRON_AGENT.md` for an end-to-end source-verified refresh (catalog + AA/Arena links + Chinese localization + tests + GitHub Pages deploy), or run the scheduled wrapper directly:

```bash
npm run cron:check    # Verify cron environment, auth, and catalog invariants
npm run cron:refresh  # Run unattended Copilot CLI refresh against CRON_AGENT.md
```

