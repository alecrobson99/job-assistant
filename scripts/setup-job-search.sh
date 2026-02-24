#!/bin/bash

set -euo pipefail

echo "Setting up Job Search Edge Function..."
echo

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found."
  echo
  echo "Install options:"
  echo "  macOS/Linux: brew install supabase/tap/supabase"
  echo "  npm: npm install -g supabase"
  exit 1
fi

echo "Supabase CLI found"

mkdir -p supabase/functions/job-search

if [ ! -f supabase/functions/job-search/index.ts ]; then
  echo "Creating supabase/functions/job-search/index.ts ..."
  cat > supabase/functions/job-search/index.ts <<'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    const { query, page = 1, numPages = 1, country = 'us,ca', datePosted = 'all' } = await req.json()

    if (!query) {
      throw new Error('Query parameter is required')
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')
    if (!rapidApiKey) {
      throw new Error('RAPIDAPI_KEY not configured in environment variables')
    }

    const params = new URLSearchParams({
      query: query,
      page: page.toString(),
      num_pages: numPages.toString(),
      date_posted: datePosted,
    })

    if (country && country.trim()) {
      params.append('country', country)
    }

    const rapidApiUrl = `https://jsearch.p.rapidapi.com/search?${params.toString()}`
    const response = await fetch(rapidApiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText} ${errorText}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify(data.data || []),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
EOF
else
  echo "Edge function already exists at supabase/functions/job-search/index.ts (left unchanged)."
fi

if [ -z "${RAPIDAPI_KEY:-}" ]; then
  echo
  echo "Missing RAPIDAPI_KEY environment variable."
  echo "Run like:"
  echo "  RAPIDAPI_KEY=your_key_here ./scripts/setup-job-search.sh"
  exit 1
fi

echo
echo "Setting RAPIDAPI_KEY secret..."
supabase secrets set RAPIDAPI_KEY="$RAPIDAPI_KEY"

echo
echo "Deploying job-search edge function..."
supabase functions deploy job-search

echo
echo "Success. job-search deployed."
