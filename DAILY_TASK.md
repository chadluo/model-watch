# DAILY_TASK

Instructions for the daily routine (Claude executes this file unattended). Schema and conventions: `CLAUDE.md`.

## Goal

Keep `MODELS` in `data.js` in sync with OpenRouter popularity, then record new releases for every tracked family.

## Config

- Ranking source: OpenRouter Data API (https://openrouter.ai/docs/cookbook/administration/data-api.md, raw markdown; no `.md` = HTML), 7-day window, top 20.
- Auth: `Authorization: Bearer $OPENROUTER_API_KEY`.
- Important providers (never remove their families for ranking): OpenAI, Anthropic, Google, DeepSeek, Qwen, Z.ai, plus any
  other provider of similar independent reach. List may exceed 20.
- Pinned families (always keep; add if missing; ranking irrelevant, they hover near the top-20 edge):
  - `claude-haiku` — Claude Haiku (lab: Anthropic, tier `frontier`)
  - `rednote-dots` — RedNote dots (lab: RedNote / Xiaohongshu, tier `chinese`)
  - `openai-oss` — OpenAI gpt-oss (lab: OpenAI, tier `open`)
- Tier families, never merge into one per-provider entry:
  - Anthropic: `claude-fable`, `claude-opus`, `claude-sonnet`, `claude-haiku`.
  - OpenAI: `openai-astra`, `openai-sol` (also holds legacy GPT-3.5..5.5 and o-series), `openai-terra`, `openai-luna`,
    `openai-oss`.
  - A release spanning several tiers → one `releases` entry per tier family, same date.
  - Never add/remove tier families based on ranking.

## Steps

1. Verify `git remote -v` shows a clone. No throwaway verification pushes.
2. Read `data.js` on `main`.
3. Query the Data API (7d), derive top 20 families.
4. Add: family in top 20 or pinned, but missing → new entry with backfilled `releases` (oldest-first, ISO dates,
   one-line `note`; match existing style). Sources: official announcements / reliable press. Never guess dates.
5. Remove: family not in top 20, not pinned, and not from an important provider.
6. For each remaining family, web search for confirmed releases after its last date up to today. Skip rumors and
   low-quality sources. Append confirmed releases only.
7. `node --check data.js`.
8. If nothing was added, removed, or released: do not open a PR; report "no updates" and stop.
9. Otherwise: new branch off `main` (`claude/model-releases-<short-id>`, never reuse), commit (list adds/removes with
   reason, new releases), push, open PR to `main` (use PR template if present, include summary), then
   `subscribe_pr_activity`.

## Failure handling

- Network/DNS/connection error to openrouter.ai: network policy blocks it. Report exact error and stop. No workarounds
  (no HTML scraping).
- Auth error: report `OPENROUTER_API_KEY` missing/invalid.
- Push authorization error: skip cleanup, report that the repo must be added as a source on the Routine (claude.ai/code
  UI) with the exact error, and still report the diff.

Each run is independent; rely only on what is committed in the repo.
