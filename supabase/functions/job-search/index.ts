// Supabase Edge Function: supabase/functions/job-search/index.ts
// This should be deployed to your Supabase project

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Initialize Supabase client to verify the JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user's JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Parse the request body
    const { query, page = 1, numPages = 1, country = 'us,ca', datePosted = 'all' } = await req.json()

    if (!query) {
      throw new Error('Query parameter is required')
    }

    // Get RapidAPI key from environment variables
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')
    if (!rapidApiKey) {
      throw new Error('RAPIDAPI_KEY not configured in environment variables')
    }

    // Build query parameters
    const params = new URLSearchParams({
      query: query,
      page: page.toString(),
      num_pages: numPages.toString(),
      date_posted: datePosted,
    })

    // Only add country if it's not empty
    if (country && country.trim()) {
      params.append('country', country)
    }

    // Call RapidAPI JSearch endpoint
    const rapidApiUrl = `https://jsearch.p.rapidapi.com/search?${params.toString()}`
    
    console.log('Calling RapidAPI with URL:', rapidApiUrl)

    const response = await fetch(rapidApiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('RapidAPI error:', errorText)
      throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Return the job results
    return new Response(
      JSON.stringify(data.data || []),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in job-search function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})