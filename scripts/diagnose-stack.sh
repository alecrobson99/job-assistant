#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

pass() { printf "PASS: %s\n" "$1"; PASS_COUNT=$((PASS_COUNT+1)); }
warn() { printf "WARN: %s\n" "$1"; WARN_COUNT=$((WARN_COUNT+1)); }
fail() { printf "FAIL: %s\n" "$1"; FAIL_COUNT=$((FAIL_COUNT+1)); }

check_file() {
  local path="$1"
  local msg="$2"
  if [[ -f "$path" ]]; then pass "$msg ($path)"; else fail "$msg ($path missing)"; fi
}

check_absent_file() {
  local path="$1"
  local msg="$2"
  if [[ -f "$path" ]]; then warn "$msg ($path exists)"; else pass "$msg"; fi
}

contains() {
  local path="$1"
  local pattern="$2"
  if rg -q "$pattern" "$path"; then return 0; fi
  return 1
}

printf "== Project Diagnostics ==\n"
printf "Root: %s\n\n" "$ROOT_DIR"

check_file "src/App.jsx" "Primary app shell exists"
check_file "src/main.jsx" "Main entry exists"
check_file "src/supabase.js" "Supabase client module exists"
check_file "supabase/functions/create-checkout-session/index.ts" "Checkout function exists"
check_file "supabase/functions/stripe-webhook/index.ts" "Stripe webhook function exists"
check_file "vercel.json" "Root Vercel rewrite config exists"
check_absent_file "src/vercel.json" "No stray Vercel config in src"

if contains "src/main.jsx" "import App from './App.jsx'"; then
  pass "main.jsx points to App.jsx"
else
  fail "main.jsx is not importing App.jsx"
fi

if contains "src/App.jsx" "functions.invoke\(\"create-checkout-session\""; then
  pass "App calls create-checkout-session"
else
  fail "App does not call create-checkout-session"
fi

if contains "supabase/functions/create-checkout-session/index.ts" "billing/return\?session_id=\{CHECKOUT_SESSION_ID\}"; then
  pass "Checkout success URL routes to /billing/return"
else
  fail "Checkout success URL is not set to /billing/return"
fi

if contains "supabase/functions/create-checkout-session/index.ts" "pricing\?canceled=1"; then
  pass "Checkout cancel URL routes to /pricing?canceled=1"
else
  fail "Checkout cancel URL is not set to /pricing?canceled=1"
fi

if contains "supabase/functions/create-checkout-session/index.ts" "authHeader" \
  && contains "supabase/functions/create-checkout-session/index.ts" "userClient.auth.getUser" \
  && contains "supabase/functions/create-checkout-session/index.ts" "adminClient.auth.getUser"; then
  pass "Checkout auth fallback checks are present"
else
  warn "Checkout auth fallback checks are incomplete"
fi

if [[ -f ".env" ]]; then
  pass "Local .env exists"
  if contains ".env" "^VITE_SUPABASE_URL="; then pass ".env has VITE_SUPABASE_URL"; else warn ".env missing VITE_SUPABASE_URL"; fi
  if contains ".env" "^VITE_SUPABASE_ANON_KEY="; then pass ".env has VITE_SUPABASE_ANON_KEY"; else warn ".env missing VITE_SUPABASE_ANON_KEY"; fi

  if contains ".env" "^VITE_ANTHROPIC_API_KEY="; then
    fail ".env exposes ANTHROPIC key via VITE_ prefix (public leak risk)"
  else
    pass ".env does not expose Anthropic key via VITE_ prefix"
  fi
else
  warn "Local .env missing"
fi

if [[ -f ".env.example" ]]; then
  pass ".env.example exists"
  if contains ".env.example" "YOUR_PROJECT_REF"; then
    pass ".env.example uses template placeholders"
  else
    warn ".env.example appears to include real project values"
  fi
else
  warn ".env.example missing"
fi

if git remote get-url origin >/dev/null 2>&1; then
  pass "Git remote origin configured: $(git remote get-url origin)"
else
  warn "Git remote origin is not configured"
fi

if [[ -z "$(git status --porcelain)" ]]; then
  pass "Git working tree clean"
else
  warn "Git working tree has uncommitted changes"
fi

cat <<'TXT'

== Manual External Checks (run yourself) ==
1) Supabase function secrets
   npx supabase secrets list --project-ref <project_ref>

2) Supabase function deploy version
   npx supabase functions list --project-ref <project_ref>

3) Stripe webhook health
   Stripe Dashboard -> Developers -> Webhooks -> Recent deliveries should be 200

4) Vercel env vars (Production)
   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must match current Supabase project

5) GitHub -> Vercel linkage
   Confirm Vercel deploy is from latest commit on main
TXT

printf "\nSummary: %d pass, %d warn, %d fail\n" "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
