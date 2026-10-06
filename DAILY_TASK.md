# Daily Task: Check Model Releases

This is the task executed by the daily "Daily model-watch release check" routine. The routine's own prompt just says to
execute the task in this file, so edit this file (not the routine) to change the task.

You maintain this repository (a static site tracking LLM release cadences — see `CLAUDE.md` for the full data schema
and conventions).

## Repository access

Before starting research, just check `git remote -v` and that the working directory is already a git clone — this
session type normally starts pre-authorized with push already enabled, so no extra step is needed. Don't do a throwaway
verification push (branch deletion isn't reliably permitted and leaves debris in the repo). Only if the real push at the
end of the run fails with an authorization error should you stop, skip cleanup, and report that the repository needs to
be added as a source on the Routine itself (editable in the claude.ai/code UI), including the exact error text — then
still report the findings/diff so the work isn't lost.

## Task

Rather than relying on the fixed set of model families already listed in the `MODELS` array (`data.js` on the `main`
branch), determine which models are currently popular via the OpenRouter Data API
(https://openrouter.ai/docs/cookbook/administration/data-api), and keep `MODELS` in sync with that ranking — adding
families that are newly popular and removing families that have fallen out of favor, subject to the important-provider
exception below. Then, for every family that stays on the list (existing + newly added), check for and record any new
releases.

### Auth/network

An `OPENROUTER_API_KEY` environment variable is available in this environment — use it as the bearer token for Data API
requests (e.g. `curl -sS -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/...`, exact path
per the Data API docs above).

- If the request fails with a network/DNS/connection error rather than an auth error, the environment's network policy
  is blocking openrouter.ai — don't try to work around it (no scraping the HTML rankings page as a fallback); report the
  exact error and stop, since it means the environment needs `openrouter.ai` (and any API subdomain the docs specify)
  added to its allowed domains.
- If it fails with an auth error, report that `OPENROUTER_API_KEY` is missing or invalid in this environment's settings.

### Ranking window

This routine runs daily, so use a 7-day ranking window when querying the Data API (not a 30-day window) — a week is
enough signal at this cadence and stays more current.

### Important-provider exception

OpenRouter's ranking reflects usage on OpenRouter alone, not the whole market, and is only one signal. Treat OpenAI,
Anthropic, Google, DeepSeek, Qwen, and Z.ai (and any other provider you judge similarly major based on independent
reach/reputation, not just OpenRouter share) as important providers. Never remove a family from `MODELS` solely because
it dropped out of the top 20 in the OpenRouter ranking if it belongs to an important provider — keep it regardless of
rank. This means the list is allowed to exceed 20 entries; the top-20 cutoff only governs whether to ADD a
newly-popular family and whether to REMOVE a family from a non-important provider.

### Family granularity (OpenAI and Anthropic)

These providers are tracked as separate tier families, NOT as one combined entry per provider. Keep the existing split
in `MODELS`:

- Anthropic: `claude-fable`, `claude-opus`, `claude-sonnet` (and a Haiku family if/when it is added).
- OpenAI: `openai-astra`, `openai-sol`, `openai-terra`, `openai-luna`. `openai-sol` also holds the legacy pre-GPT-5.6
  history (GPT-3.5 through GPT-5.5 and the o-series), the same way `claude-sonnet` holds Claude 1/2.

Never merge these back into a single OpenAI or Claude entry, and never create a combined "OpenAI" entry when adding from
the OpenRouter ranking. Record each new release in the entry for its own tier (e.g. GPT-6.1 Sol → `openai-sol`; a
release covering several tiers is split into one `releases` entry per tier family, same date). Apply the same principle
to any new tiered lineup from these providers. Check each tier family separately for new releases in step 4, and do not
add/remove tier families individually based on ranking (they belong to important providers).

## Steps

1. Read the current `data.js` on `main` to see the full `MODELS` array (each family's id, display info, and `releases`
   array with its latest listed release).
2. Call the OpenRouter Data API per the docs above with a 7-day window to get current model rankings, and derive the top
   20 most popular models/model families from the response.
3. Diff the top-20 list against the families currently in `MODELS`:
   - Families in the top 20 but missing from `MODELS`: add a new entry, backfilling its `releases` history
     (oldest-first, ISO `YYYY-MM-DD` dates, one-line `note`) using official announcements / reliable tech press —
     follow the existing schema exactly and keep style consistent with existing entries. Do not fabricate or guess
     release dates.
   - Families currently in `MODELS` but no longer in the top 20: remove their entry UNLESS the family belongs to an
     important provider (see exception above), in which case leave it in place.
   - Families in both, and important-provider families kept despite ranking: leave the entry in place (don't
     reorder/rewrite existing releases) and proceed to step 4 for them.
4. For every family remaining in `MODELS` after the add/remove pass, web search for official announcements / reliable
   tech press to check whether it has shipped a genuinely new release after its last-listed date, up through today. Be
   skeptical of low-quality sources and unconfirmed rumors — do not fabricate or guess releases. Append any confirmed
   new releases to that family's `releases` array following the existing schema.
5. Run `node --check data.js` before committing.
6. Create a new branch off `main` (e.g. `claude/model-releases-<short-id>` — never reuse a previously-merged branch),
   commit with a clear message (mention which families were added/removed and why, plus any new releases recorded),
   push, and open a PR against `main`. Check for a PR template first. Include a summary of what changed.
7. Subscribe to the new PR's activity (`subscribe_pr_activity`) so it gets driven to green per standard PR-driving
   rules.
8. If the tracked family list is unchanged and no family has a new release, do not open a PR — just note that no
   updates were needed this cycle.

This fires daily and independently each time — don't assume anything carries over from a previous run beyond what's
actually committed in the repo.
