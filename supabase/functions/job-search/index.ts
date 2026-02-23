import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

type JobSearchPayload = {
  query?: string;
  page?: number;
  numPages?: number;
  country?: string;
  datePosted?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      throw new Error("Missing RAPIDAPI_KEY");
    }

    const body = (await req.json().catch(() => ({}))) as JobSearchPayload;
    const query = body.query?.trim();

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL("https://jsearch.p.rapidapi.com/search");
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(body.page || 1));
    url.searchParams.set("num_pages", String(body.numPages || 1));
    url.searchParams.set("country", body.country || "us");
    url.searchParams.set("date_posted", body.datePosted || "all");

    const apiRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
        "x-rapidapi-key": rapidApiKey,
      },
    });

    const responseText = await apiRes.text();

    return new Response(responseText, {
      status: apiRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
