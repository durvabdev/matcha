# Matcha

A recruiter types a brief. An LLM turns it into filters. Postgres finds the people.

`make setup` installs dependencies, starts local Supabase, applies migrations, and loads candidates. `make dev` serves http://localhost:3000. Sign in as `recruiter@acme.test` or `recruiter@globex.test` with password `rotto-assessment`. Set `OPENAI_API_KEY` and `STRIPE_WEBHOOK_SECRET` in the environment.

## Search

`POST /api/search` with `{ "brief" }` sends the brief to `gpt-4o-mini` (`temperature: 0`, strict JSON schema). The model returns filters plus an `unsupported` list. Zod checks that object again. `create_search` then calls `match_candidates`, stores the ranked ids, and returns the first 20. Later pages read that snapshot, so paging is not a new search and does not call the model.

Ranking is how many requested skills matched, then open-to-work, then years of experience. A requirement the columns cannot represent (language, visa, salary) is `unsupported` and matches nobody. An empty extraction is treated the same way. Filter edits re-run Postgres against an existing search and do not spend another free search.

## Invented filters

The model cannot pick candidates or write SQL. The schema only allows columns that exist: skills, role, seniority, location, years, company, title, school, degree, field. Skills, cities, seniority, company type, and degree are allowlists. Anything else goes in `unsupported`. SQL is a fixed query over `jsonb`; filter text is never concatenated into the statement.

## Model

`gpt-4o-mini` via `OPENAI_API_KEY`. It is cheap, fast enough for the 3 second budget, and supports strict JSON schema, so a bad reply is a 422 instead of a query. A typical brief is about 2,000 input tokens and a few hundred output tokens, roughly **$0.0005 per search** at $0.15 / 1M input and $0.60 / 1M output.

## Tradeoffs

Persisted snapshots make paging fast and stable. Correcting a filter previews a new match set without a second charge, but only if you already own a search. Skill-count ranking is simple and puts exact skill hits first; it is not a learned ranker. `role` is a case-insensitive substring, so "Engineer" is broad on purpose.

## Another week

Add a proper re-ranker for candidates, suggesting candidates that just meet the mark. For example, candidates who aren't in new york but are open to relocating. One more thing is 