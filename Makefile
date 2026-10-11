SHELL := /bin/bash
.SHELLFLAGS := -eo pipefail -c
.PHONY: setup dev

# Needs Docker running. Safe to re-run: db reset wipes auth, then the script recreates it.
setup:
	npm ci
	npx supabase status >/dev/null 2>&1 || npx supabase start
	node scripts/build-candidates-seed.mjs
	npx supabase db reset
	existing_stripe=$$(grep '^STRIPE_WEBHOOK_SECRET=' .env.local 2>/dev/null || true)
	npx supabase status -o env | sed -n \
		-e 's/^API_URL=/SUPABASE_URL=/p' \
		-e 's/^SECRET_KEY=/SUPABASE_SECRET_KEY=/p' \
		-e 's/^PUBLISHABLE_KEY=/SUPABASE_PUBLISHABLE_KEY=/p' > .env.local
	if [ -n "$$existing_stripe" ]; then printf '%s\n' "$$existing_stripe" >> .env.local; \
	else echo 'STRIPE_WEBHOOK_SECRET=whsec_rotto_assessment_sample' >> .env.local; fi
	node --env-file=.env.local scripts/seed-auth.mjs

dev:
	npm run dev
