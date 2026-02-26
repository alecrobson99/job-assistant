import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type ScrapePayload = {
  url?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanText(value: string | null | undefined) {
  if (!value) return "";
  return decodeEntities(value)
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001F]+/g, "")
    .trim();
}

function firstMatch(content: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return "";
}

function parseJsonLd(html: string) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    try {
      const raw = script[1]?.trim();
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const type = String(node?.["@type"] || "").toLowerCase();
        if (!type.includes("jobposting")) continue;

        const title = cleanText(node?.title);
        const description = cleanText(String(node?.description || "").replace(/<[^>]+>/g, " "));
        const hiringOrg = cleanText(node?.hiringOrganization?.name || node?.hiringOrganization);
        let location = "";
        if (Array.isArray(node?.jobLocation) && node.jobLocation[0]?.address) {
          const addr = node.jobLocation[0].address;
          location = cleanText([
            addr.addressLocality,
            addr.addressRegion,
            addr.addressCountry,
          ].filter(Boolean).join(", "));
        }

        return {
          title,
          description,
          company: hiringOrg,
          location,
        };
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return {
    title: "",
    description: "",
    company: "",
    location: "",
  };
}

function inferCompanyFromHost(hostname: string) {
  const base = hostname.replace(/^www\./i, "").split(".")[0] || "";
  return cleanText(base.replace(/[-_]+/g, " ")).replace(/\b\w/g, (m) => m.toUpperCase());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const accessToken = tokenMatch?.[1]?.trim() || null;
    if (!accessToken) return jsonResponse({ error: "Missing Authorization header" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const {
      data: { user },
      error: userErr,
    } = await adminClient.auth.getUser(accessToken);

    if (userErr || !user) return jsonResponse({ error: userErr?.message || "Unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as ScrapePayload;
    const rawUrl = (body?.url || "").trim();
    if (!rawUrl) return jsonResponse({ error: "URL is required" }, 400);

    const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      return jsonResponse({ error: "Invalid URL" }, 400);
    }

    const res = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JobAssistantBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return jsonResponse({ error: `Failed to fetch page (${res.status})` }, 400);
    }

    const html = await res.text();
    const headTitle = firstMatch(html, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
    const ogTitle = firstMatch(html, [/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i]);
    const ogDescription = firstMatch(html, [/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i]);
    const metaDescription = firstMatch(html, [/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i]);
    const siteName = firstMatch(html, [/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["'][^>]*>/i]);

    const jsonLd = parseJsonLd(html);

    const title = jsonLd.title || ogTitle || headTitle || "Untitled Role";
    const company = jsonLd.company || siteName || inferCompanyFromHost(parsedUrl.hostname) || "Unknown Company";
    const location = jsonLd.location || "Not specified";
    const description = jsonLd.description || ogDescription || metaDescription || "";

    return jsonResponse({
      url: parsedUrl.toString(),
      title,
      company,
      location,
      description,
    });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
