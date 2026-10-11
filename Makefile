SHELL := /bin/bash
.SHELLFLAGS := -eo pipefail -c
.PHONY: setup dev

# Needs Docker running. Safe to re-run: db reset wipes auth, then the script recreates it.
# Pass OPENAI_API_KEY=sk-... or type it when prompted. An existing .env.local key is kept.
setup:
	npm ci
	npx supabase status >/dev/null 2>&1 || npx supabase start
	node scripts/build-candidates-seed.mjs
	npx supabase db reset
	existing_stripe=$$(grep '^STRIPE_WEBHOOK_SECRET=' .env.local 2>/dev/null || true)
	existing_openai=$$(grep '^OPENAI_API_KEY=' .env.local 2>/dev/null || true)
	npx supabase status -o env | sed -n \
		-e 's/^API_URL=/SUPABASE_URL=/p' \
		-e 's/^SECRET_KEY=/SUPABASE_SECRET_KEY=/p' \
		-e 's/^PUBLISHABLE_KEY=/SUPABASE_PUBLISHABLE_KEY=/p' > .env.local
	if [ -n "$$existing_stripe" ]; then printf '%s\n' "$$existing_stripe" >> .env.local; \
	else echo 'STRIPE_WEBHOOK_SECRET=whsec_rotto_assessment_sample' >> .env.local; fi
	if [ -n "$$OPENAI_API_KEY" ]; then printf 'OPENAI_API_KEY=%s\n' "$$OPENAI_API_KEY" >> .env.local; \
	elif [ -n "$$existing_openai" ]; then printf '%s\n' "$$existing_openai" >> .env.local; \
	elif [ -t 0 ]; then \
		read -r -p 'OPENAI_API_KEY (needed for search; empty to skip): ' key || true; \
		if [ -n "$$key" ]; then printf 'OPENAI_API_KEY=%s\n' "$$key" >> .env.local; fi; \
	fi
	node --env-file=.env.local scripts/seed-auth.mjs

dev:
	npm run dev
