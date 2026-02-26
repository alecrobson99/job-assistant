import { useEffect, useMemo, useState, useRef } from "react";
import { getSupabaseClient } from "./supabase";


// ═══════════════════════════════════════════════════════════════════════════════
// APP THEME
// ═══════════════════════════════════════════════════════════════════════════════
const T = {
  bg: "var(--bg)", surface: "var(--surface)",
  border: "var(--border)", borderFocus: "var(--accent)",
  primary: "var(--accent)", primaryDark: "var(--accent-hover)",
  primaryLight: "#EEF3FD", primaryMid: "#C7D8FA",
  text: "var(--text-primary)", textSub: "var(--text-secondary)", textMute: "var(--text-tertiary)",
  green: "#16A34A", greenBg: "#F0FDF4", greenBorder: "#BBF7D0",
  amber: "#B45309", amberBg: "#FFFBEB", amberBorder: "#FDE68A",
  red: "#DC2626", redBg: "#FEF2F2", redBorder: "#FECACA",
  teal: "#0D7490", tealBg: "#F0FDFF", tealBorder: "#A5F3FC",
  violet: "#7C3AED", violetBg: "#F5F3FF", violetBorder: "#DDD6FE",
};

const STATUS_META = {
  saved:     { color: T.primary, bg: T.primaryLight, border: T.primaryMid,    label: "Saved"     },
  tailored:  { color: T.violet,  bg: T.violetBg,     border: T.violetBorder,  label: "Tailored" },
  applied:   { color: T.teal,    bg: T.tealBg,       border: T.tealBorder,    label: "Applied"   },
  interview: { color: T.amber,   bg: T.amberBg,      border: T.amberBorder,   label: "Interview" },
  offer:     { color: T.green,   bg: T.greenBg,      border: T.greenBorder,   label: "Offer"     },
  rejected:  { color: T.red,     bg: T.redBg,        border: T.redBorder,     label: "Rejected"  },
};
const STATUS_OPTIONS = ["saved","tailored","applied","interview","offer","rejected"];
const FEEDBACK_EMAIL = "feedback@jobassistant.app";
const WEEKLY_TAILOR_LIMIT = 7;
const LOCATION_OPTIONS = [
  "Remote",
  "Hybrid",
  "On-site",
  "Toronto, ON, Canada",
  "Vancouver, BC, Canada",
  "Montreal, QC, Canada",
  "Calgary, AB, Canada",
  "New York, NY",
  "San Francisco, CA",
  "Chicago, IL",
  "Austin, TX",
  "Seattle, WA",
  "Los Angeles, CA",
  "Boston, MA",
  "Atlanta, GA",
];
const TITLE_OPTIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Engineering Manager",
  "Product Manager",
  "Data Analyst",
  "Data Scientist",
  "Customer Success Manager",
  "Sales Manager",
  "Marketing Manager",
];
const LOCATION_CATALOG = [
  { country: "United States", city: "New York", region: "NY" },
  { country: "United States", city: "San Francisco", region: "CA" },
  { country: "United States", city: "Los Angeles", region: "CA" },
  { country: "United States", city: "San Diego", region: "CA" },
  { country: "United States", city: "Seattle", region: "WA" },
  { country: "United States", city: "Austin", region: "TX" },
  { country: "United States", city: "Dallas", region: "TX" },
  { country: "United States", city: "Chicago", region: "IL" },
  { country: "United States", city: "Boston", region: "MA" },
  { country: "United States", city: "Atlanta", region: "GA" },
  { country: "United States", city: "Miami", region: "FL" },
  { country: "United States", city: "Denver", region: "CO" },
  { country: "United States", city: "Washington", region: "DC" },
  { country: "Canada", city: "Toronto", region: "ON" },
  { country: "Canada", city: "Vancouver", region: "BC" },
  { country: "Canada", city: "Montreal", region: "QC" },
  { country: "Canada", city: "Calgary", region: "AB" },
  { country: "United Kingdom", city: "London", region: "" },
  { country: "Germany", city: "Berlin", region: "" },
  { country: "France", city: "Paris", region: "" },
  { country: "Netherlands", city: "Amsterdam", region: "" },
  { country: "Ireland", city: "Dublin", region: "" },
  { country: "Australia", city: "Sydney", region: "" },
  { country: "Australia", city: "Melbourne", region: "" },
  { country: "India", city: "Bengaluru", region: "" },
  { country: "India", city: "Hyderabad", region: "" },
  { country: "India", city: "Mumbai", region: "" },
  { country: "Singapore", city: "Singapore", region: "" },
  { country: "United Arab Emirates", city: "Dubai", region: "" },
];
const OCCUPATION_OPTIONS = Array.from(new Set([
  ...TITLE_OPTIONS,
  "Customer Success Specialist",
  "Operations Manager",
  "HR Specialist",
  "Graphic Designer",
  "UX/UI Designer",
  "Business Analyst",
  "Recruiter",
]));

function isPremiumSubscription(subscription) {
  if (!subscription) return false;
  if (subscription.has_premium === true) return true;
  const status = String(subscription.status || "").toLowerCase();
  return status === "active" || status === "trialing";
}

function inferCountryParam(locationText) {
  const v = String(locationText || "").toLowerCase();
  if (!v) return "us,ca";
  if (v.includes("canada") || /\b(on|bc|qc|ab|mb|sk|ns|nb|nl|pe|yt|nt|nu)\b/.test(v)) return "ca";
  if (v.includes("united kingdom") || v.includes(" uk") || v.includes("london")) return "gb";
  if (v.includes("australia") || v.includes("sydney") || v.includes("melbourne")) return "au";
  if (v.includes("india") || v.includes("bengaluru") || v.includes("mumbai") || v.includes("hyderabad")) return "in";
  if (v.includes("singapore")) return "sg";
  if (v.includes("remote")) return "us,ca";
  return "us";
}

async function searchJobsByKeyword(query, options = {}) {
  const {
    page = 1,
    numPages = 1,
    country = "us,ca",
    datePosted = "all",
  } = options;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("job-search", {
    body: { query, page, numPages, country, datePosted },
  });

  if (error) {
    throw new Error(`Job search function failed: ${error.message}`);
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  const rawJobs = Array.isArray(data) ? data : (data?.data || data?.jobs || data?.results || []);

  return rawJobs.map((job) => {
    const city = job.job_city || "";
    const state = job.job_state || "";
    const country = job.job_country || "";
    const location = [city, state || country].filter(Boolean).join(", ") || job.location || "Not specified";

    return {
      title: job.job_title || job.title || job.position || "Untitled Role",
      company: job.employer_name || job.company || job.company_name || "Unknown Company",
      location,
      description: job.job_description || job.description || job.summary || "",
      apply_url: job.job_apply_link || job.job_google_link || job.apply_url || job.url || job.applyUrl || "",
      source: job.job_publisher || job.source || job.board || "jsearch",
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO ADD REAL AUTH — SUPABASE (free, 10 min setup)
// ─────────────────────────────────────────────────────────────────────────────
// 1. Go to https://supabase.com → New Project
// 2. npm install @supabase/supabase-js
// 3. Create src/supabase.js:
//      import { createClient } from '@supabase/supabase-js'
//      export const supabase = createClient('https://YOUR.supabase.co', 'YOUR_ANON_KEY')
// 4. In this file, import it: import { supabase } from './supabase'
// 5. Replace the two TODO blocks below with the real Supabase calls shown
// 6. Supabase dashboard → Authentication → disable "Confirm email" for dev
//
// USER DATABASE:
// Supabase gives you a Postgres DB at supabase.com → Table Editor
// Create these tables to persist data per user instead of localStorage:
//   profiles  (id uuid refs auth.users, name text, preferences jsonb)
//   documents (id uuid, user_id uuid, type text, tag text, content text)
//   saved_jobs(id uuid, user_id uuid, title text, company text, status text, notes text, ...)
// Then swap store.getDocs/setDocs etc. with supabase.from('table').select/insert/update/delete
// ─────────────────────────────────────────────────────────────────────────────

function LandingPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [currency, setCurrency] = useState("USD");
  const [infoMsg, setInfoMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
  
    try {
      const supabase = getSupabaseClient();

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
  
        if (error) throw error;
  
        onLogin(
          data.user.user_metadata?.full_name ||
          email.split("@")[0],
          data.user.id
        );
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              full_name: name,
            },
          },
        });
  
        if (error) throw error;

        // Some Supabase projects require email confirmation and won't return a session on sign-up.
        if (!data?.session || !data?.user) {
          setIsLogin(true);
          setError("Account created. Confirm your email, then sign in.");
          return;
        }

        onLogin(
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          name ||
          email.split("@")[0],
          data.user.id
        );
      }
    } catch (err) {
      if (err?.message?.includes("Database error saving new user")) {
        setError("Signup failed in Supabase DB trigger/policy. Check your `profiles` table and auth trigger SQL.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  const inputStyle = {
    width: "100%",
    background: "#FFFFFF",
    border: "1px solid #D0D7E2",
    borderRadius: 8,
    padding: "11px 12px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
    transition: "border-color 0.15s",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const pricing = {
    USD: {
      monthly: [
        { name: "Free", price: 0, sub: "For individual job seekers getting started." },
        { name: "Pro", price: 19.99, sub: "For active applicants who tailor at scale." },
      ],
      yearly: [
        { name: "Free", price: 0, sub: "For individual job seekers getting started." },
        { name: "Pro", price: 89.99, sub: "Billed annually. Save with higher usage." },
      ],
    },
    CAD: {
      monthly: [
        { name: "Free", price: 0, sub: "For individual job seekers getting started." },
        { name: "Pro", price: 19.99, sub: "For active applicants who tailor at scale." },
      ],
      yearly: [
        { name: "Free", price: 0, sub: "For individual job seekers getting started." },
        { name: "Pro", price: 89.99, sub: "Billed annually. Save with higher usage." },
      ],
    },
  };
  
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", padding:"20px 16px 44px" }}>
      <main style={{ maxWidth:1160, margin:"0 auto", display:"grid", gap:20 }}>
        <header style={{ background:"#fff", border:"1px solid var(--border-light)", borderRadius:16, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", boxShadow:"var(--shadow-sm)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg, var(--accent), #818CF8)", color:"#fff", display:"grid", placeItems:"center", fontFamily:"Sora, DM Sans, sans-serif", fontSize:16, fontWeight:700 }}>
              A
            </div>
            <div style={{ fontFamily:"Sora, DM Sans, sans-serif", fontSize:20, fontWeight:700, color:"var(--text-primary)" }}>Applyify</div>
          </div>
          <nav style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <a href="#product" style={{ textDecoration:"none", color:"var(--text-secondary)", fontSize:13, fontWeight:650, padding:"7px 11px", border:"1px solid var(--border)", borderRadius:9 }}>Product</a>
            <a href="#pricing" style={{ textDecoration:"none", color:"var(--text-secondary)", fontSize:13, fontWeight:650, padding:"7px 11px", border:"1px solid var(--border)", borderRadius:9 }}>Pricing</a>
            <a href="#faq" style={{ textDecoration:"none", color:"var(--text-secondary)", fontSize:13, fontWeight:650, padding:"7px 11px", border:"1px solid var(--border)", borderRadius:9 }}>FAQ</a>
            <button onClick={()=>setIsLogin(true)} style={{ background:"var(--accent)", color:"#fff", border:"none", borderRadius:9, padding:"8px 13px", fontWeight:700, cursor:"pointer", fontSize:13 }}>Sign in</button>
          </nav>
        </header>

        <section id="product" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:18 }}>
          <div style={{ background:"#fff", border:"1px solid var(--border-light)", borderRadius:16, padding:28, boxShadow:"var(--shadow-sm)" }}>
            <div style={{ fontSize:12, fontWeight:800, color:"var(--text-secondary)", marginBottom:10, letterSpacing:"0.06em" }}>JOB SEARCH CRM + TAILORING</div>
            <h1 style={{ fontFamily:"Sora, DM Sans, sans-serif", fontSize:52, lineHeight:1.04, margin:"0 0 12px", color:"var(--text-primary)", letterSpacing:"-0.05em" }}>
              Find, track, and tailor applications in one workspace.
            </h1>
            <p style={{ fontSize:15, lineHeight:1.65, color:"var(--text-secondary)", margin:"0 0 16px", maxWidth:700 }}>
              Replace scattered notes and repetitive edits with one pipeline: search jobs, track status, and generate tailored resume and cover content from your own documents.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10, marginBottom:18 }}>
              {[
                "Unified application tracker",
                "Tailored content generation",
                "Document management",
                "Built-in weekly usage controls",
              ].map((item) => (
                <div key={item} style={{ border:"1px solid var(--border)", borderRadius:10, padding:"10px 12px", background:"var(--bg)", fontSize:13, color:"var(--text-secondary)", fontWeight:600 }}>
                  {item}
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button onClick={()=>setIsLogin(false)} style={{ background:"var(--accent)", color:"#fff", border:"none", borderRadius:10, padding:"10px 14px", fontWeight:700, cursor:"pointer" }}>
                Create free account
              </button>
              <a href="#pricing" style={{ display:"inline-flex", alignItems:"center", padding:"10px 14px", border:"1px solid var(--border)", borderRadius:10, color:"var(--text-secondary)", textDecoration:"none", fontWeight:700 }}>
                See pricing
              </a>
            </div>
          </div>

          <section id="auth" style={{ background:"#fff", border:"1px solid var(--border-light)", borderRadius:16, padding:24, boxShadow:"var(--shadow-sm)" }}>
            <h2 style={{ fontSize:34, margin:"0 0 6px", color:"var(--text-primary)", letterSpacing:"-0.03em", fontFamily:"Sora, DM Sans, sans-serif" }}>
              {isLogin ? "Sign in" : "Create account"}
            </h2>
            <p style={{ fontSize:13, color:"var(--text-secondary)", margin:"0 0 16px" }}>
              {isLogin ? "Continue where you left off." : "Start on Free, upgrade only when needed."}
            </p>

            {infoMsg && (
              <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:8,
                padding:"10px 12px", marginBottom:14, fontSize:13, color:"#1D4ED8" }} role="status" aria-live="polite">
                {infoMsg}
              </div>
            )}

            {error && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8,
                padding:"10px 12px", marginBottom:14, fontSize:13, color:"#DC2626" }} role="alert" aria-live="assertive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div style={{ marginBottom:12 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--text-secondary)", marginBottom:6 }}>Full Name</label>
                  <input id="auth-name" type="text" value={name} onChange={e=>setName(e.target.value)}
                    placeholder="Jane Smith" required style={inputStyle}/>
                </div>
              )}

              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--text-secondary)", marginBottom:6 }}>Email</label>
                <input id="auth-email" type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" required style={inputStyle} aria-invalid={!!error}/>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--text-secondary)", marginBottom:6 }}>Password</label>
                <input id="auth-password" type="password" value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="At least 6 characters" required minLength={6} style={inputStyle} aria-describedby="auth-password-help" aria-invalid={!!error}/>
                <div id="auth-password-help" style={{marginTop:6,fontSize:11,color:"var(--text-secondary)"}}>Use at least 6 characters.</div>
              </div>

              <button type="submit" disabled={loading} style={{
                width:"100%", background:loading?"#94A3B8":"var(--accent)", color:"#fff", border:"none", borderRadius:10,
                padding:"10px 12px", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit"
              }}>
                {loading ? "Please wait..." : (isLogin ? "Try the tool" : "Create account")}
              </button>
            </form>

            <div style={{ marginTop:12, fontSize:12, color:"var(--text-secondary)" }}>
              {isLogin ? "No account yet? " : "Already have an account? "}
              <button onClick={()=>{setIsLogin(!isLogin);setError("");}} style={{
                background:"none", border:"none", color:"var(--accent)", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit", padding:0
              }}>
                {isLogin ? "Create account" : "Sign in"}
              </button>
            </div>
          </section>
        </section>

        <section id="pricing" style={{ background:"#fff", border:"1px solid var(--border-light)", borderRadius:16, padding:24, boxShadow:"var(--shadow-sm)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, flexWrap:"wrap", marginBottom:14 }}>
            <div>
              <h2 style={{ fontSize:30, margin:"0 0 6px", color:"#0F172A", letterSpacing:"-0.02em" }}>Simple pricing that scales with your search</h2>
              <p style={{ fontSize:14, color:"#64748B", margin:0 }}>Start free. Upgrade when you need higher throughput and premium workflows.</p>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <div style={{ display:"inline-flex", border:"1px solid #D0D7E2", borderRadius:999, overflow:"hidden" }}>
                <button onClick={()=>setBillingCycle("monthly")} style={{ border:"none", padding:"8px 12px", fontSize:12, fontWeight:700, background:billingCycle==="monthly"?"#2457D6":"#fff", color:billingCycle==="monthly"?"#fff":"#334155", cursor:"pointer" }}>Monthly</button>
                <button onClick={()=>setBillingCycle("yearly")} style={{ border:"none", padding:"8px 12px", fontSize:12, fontWeight:700, background:billingCycle==="yearly"?"#2457D6":"#fff", color:billingCycle==="yearly"?"#fff":"#334155", cursor:"pointer" }}>Yearly</button>
              </div>
              <div style={{ display:"inline-flex", border:"1px solid #D0D7E2", borderRadius:999, overflow:"hidden" }}>
                <button onClick={()=>setCurrency("USD")} style={{ border:"none", padding:"8px 12px", fontSize:12, fontWeight:700, background:currency==="USD"?"#2457D6":"#fff", color:currency==="USD"?"#fff":"#334155", cursor:"pointer" }}>USD</button>
                <button onClick={()=>setCurrency("CAD")} style={{ border:"none", padding:"8px 12px", fontSize:12, fontWeight:700, background:currency==="CAD"?"#2457D6":"#fff", color:currency==="CAD"?"#fff":"#334155", cursor:"pointer" }}>CAD</button>
              </div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:12 }}>
            {pricing[currency][billingCycle].map((plan) => (
              <div key={plan.name} style={{ border:"1px solid #DCE4F2", borderRadius:12, padding:16, background:plan.name==="Pro"?"#F4F8FF":"#fff" }}>
                <div style={{ fontSize:12, fontWeight:800, color:"#5C6B8A", letterSpacing:"0.05em", marginBottom:8 }}>{plan.name.toUpperCase()}</div>
                <div style={{ fontSize:34, fontWeight:800, color:"#0F172A", lineHeight:1 }}>
                  {plan.price === 0 ? "Free" : `${currency === "USD" ? "$" : "C$"}${plan.price}`}
                </div>
                <div style={{ fontSize:12, color:"#64748B", marginTop:6, minHeight:34 }}>
                  {plan.price === 0 ? "No credit card required" : `${currency}/${billingCycle === "monthly" ? "mo" : "mo billed yearly"}`}
                </div>
                <p style={{ fontSize:13, color:"#475569", lineHeight:1.55, margin:"8px 0 12px" }}>{plan.sub}</p>
                <ul style={{ margin:"0 0 12px 16px", padding:0, color:"#334155", lineHeight:1.6, fontSize:12 }}>
                  <li>Job search and tracker workflow</li>
                  <li>Document upload and management</li>
                  <li>{plan.name === "Free" ? "Weekly tailoring limits" : "Higher or unlimited tailoring usage"}</li>
                </ul>
                <button
                  onClick={() => {
                    const isFree = plan.name === "Free";
                    setIsLogin(!isFree);
                    setInfoMsg(isFree ? "" : "Sign in to upgrade to Premium from the dashboard Settings tab.");
                    document.getElementById("auth")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  style={{ width:"100%", background:plan.name==="Pro"?"var(--accent)":"#fff", color:plan.name==="Pro"?"#fff":"var(--accent)", border:plan.name==="Pro"?"none":"1px solid #BCD0FA", borderRadius:10, padding:"9px 11px", fontWeight:700, cursor:"pointer" }}
                >
                  {plan.name === "Free" ? "Start free" : "Sign in to upgrade"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" style={{ background:"#fff", border:"1px solid var(--border-light)", borderRadius:16, padding:24, boxShadow:"var(--shadow-sm)" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:24, color:"#0F172A" }}>You&apos;ve got questions. We&apos;ve got answers.</h3>
          <div style={{ display:"grid", gap:10 }}>
            {[
              ["Do I have to pay to use the app?", "No. You can use core job search, tracking, and document features on the Free plan."],
              ["When should I upgrade?", "Upgrade when you hit free tailoring limits or need more throughput for active application cycles."],
              ["Can I manage my subscription in-app?", "Yes. Premium users can manage billing from the dashboard subscription controls."],
            ].map(([q,a]) => (
              <div key={q} style={{ border:"1px solid #E2E8F0", borderRadius:10, padding:"10px 12px", background:"#FCFDFF" }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#1E293B", marginBottom:4 }}>{q}</div>
                <div style={{ fontSize:13, color:"#475569", lineHeight:1.55 }}>{a}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, fontSize:13, color:"#64748B" }}>
            Need help now? <a href={`mailto:${FEEDBACK_EMAIL}`} style={{ color:"var(--accent)", fontWeight:700 }}>Contact support</a>
          </div>
        </section>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
async function callClaude(system, userMsg, maxTokens=1500) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("anthropic-proxy", {
    body: {
      system,
      userMsg,
      maxTokens,
      model: "claude-sonnet-4-20250514",
    },
  });
  if (error) throw error;
  if(data.error) throw new Error(data.error.message);
  return data.content.map(b=>b.text||"").join("");
}

const toISO = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const formatDate = (value) => {
  const iso = toISO(value);
  return iso ? iso.slice(0, 10) : "—";
};

const normalizeDoc = (doc) => ({
  ...doc,
  createdAt: doc.createdAt || doc.created_at || null,
});

const normalizeJob = (job) => ({
  ...job,
  savedAt: job.savedAt || job.saved_at || job.created_at || null,
  keywords: Array.isArray(job.keywords) ? job.keywords : [],
});
const isMissingRpcError = (error) => {
  const msg = (error?.message || "").toLowerCase();
  return (
    error?.code === "42883" ||
    error?.code === "PGRST202" ||
    error?.status === 404 ||
    msg.includes("could not find the function") ||
    msg.includes("schema cache")
  );
};
const isSessionError = (error) => {
  const msg = String(error?.message || "").toLowerCase();
  return (
    msg.includes("invalid jwt") ||
    msg.includes("invalid login credentials") ||
    msg.includes("jwt expired") ||
    msg.includes("refresh token") ||
    msg.includes("session")
  );
};

async function getAuthContext() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    await supabase.auth.signOut();
    throw new Error("Your session expired. Please sign in again.");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isSessionError(error)) {
      await supabase.auth.signOut();
      throw new Error("Your session expired. Please sign in again.");
    }
    throw error;
  }

  if (!data.user) {
    await supabase.auth.signOut();
    throw new Error("Your session expired. Please sign in again.");
  }

  return { supabase, user: data.user };
}

const store = {
  // DOCUMENTS
  getDocs: async () => {
    const { supabase, user } = await getAuthContext();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(normalizeDoc);
  },

  setDocs: async () => {
    // no-op: use insertDoc / updateDoc / deleteDoc directly
  },

  insertDoc: async (doc) => {
    const { supabase, user } = await getAuthContext();
  
    const { data, error } = await supabase
      .from("documents")
      .insert({
        ...doc,
        user_id: user.id,
      })
      .select()
      .single();
  
    if (error) throw error;
    return normalizeDoc(data);
  },

  updateDoc: async (id, updates) => {
    const { supabase, user } = await getAuthContext();
    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return normalizeDoc(data);
  },

  deleteDoc: async (id) => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },

  // JOBS
  getJobs: async () => {
    const { supabase, user } = await getAuthContext();
    const { data, error } = await supabase
      .from("saved_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(normalizeJob);
  },

  insertJob: async (job) => {
    const { supabase, user } = await getAuthContext();
    const { data, error } = await supabase
      .from("saved_jobs")
      .insert({
        ...job,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return normalizeJob(data);
  },

  updateJob: async (id, updates) => {
    const { supabase, user } = await getAuthContext();
    const { data, error } = await supabase
      .from("saved_jobs")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return normalizeJob(data);
  },

  deleteJob: async (id) => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },

  // PROFILE
  getProfile: async () => {
    const { supabase, user } = await getAuthContext();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  setProfile: async (updates) => {
    const { supabase, user } = await getAuthContext();
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          ...updates,
          id: user.id,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // BILLING
  getSubscription: async () => {
    const { supabase, user } = await getAuthContext();
    const { data, error } = await supabase
      .from("billing_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Keep app usable before billing.sql is applied.
    if (error?.code === "42P01" || (error?.message || "").includes("billing_subscriptions")) return null;
    if (error) throw error;
    const { data: entitlements, error: entErr } = await supabase
      .from("user_entitlements")
      .select("has_premium,tier")
      .eq("user_id", user.id)
      .maybeSingle();

    if (entErr && entErr.code !== "PGRST116" && entErr.code !== "42P01") throw entErr;

    return {
      ...(data || {}),
      has_premium: entitlements?.has_premium ?? data?.has_premium ?? false,
      tier: entitlements?.tier ?? data?.tier ?? null,
    };
  },

  getTailoringQuota: async () => {
    const { supabase } = await getAuthContext();
    const { data, error } = await supabase.rpc("get_tailoring_quota");
    if (isMissingRpcError(error)) {
      return { weekly_limit: WEEKLY_TAILOR_LIMIT, used: 0, remaining: WEEKLY_TAILOR_LIMIT, resets_at: null, misconfigured: true };
    }
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row || { weekly_limit: WEEKLY_TAILOR_LIMIT, used: 0, remaining: WEEKLY_TAILOR_LIMIT, resets_at: null };
  },

  consumeTailoringUse: async (jobId) => {
    const { supabase } = await getAuthContext();
    const { data, error } = await supabase.rpc("consume_tailoring_use", { p_job_id: jobId || null });
    if (isMissingRpcError(error)) {
      return { weekly_limit: WEEKLY_TAILOR_LIMIT, used: 0, remaining: WEEKLY_TAILOR_LIMIT, resets_at: null, misconfigured: true };
    }
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row;
  },
};

function exportCSV(jobs,docs) {
  const hdrs=["Job Title","Company","Location","URL","Date Saved","Status","Notes","Resume Used","Cover Letter Used"];
  const rows=jobs.map(j=>{
    const res=docs.find(d=>d.id===j.resumeDocId); const cl=docs.find(d=>d.id===j.coverDocId);
    return [j.title,j.company,j.location,j.url,formatDate(j.savedAt || j.created_at),j.status,j.notes||"",res?.tag||"",cl?.tag||""]
      .map(v=>`"${(v||"").replace(/"/g,'""')}"`).join(",");
  });
  const csv=[hdrs.join(","),...rows].join("\n");
  const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="applications.csv"; a.click(); URL.revokeObjectURL(url);
}

function sanitizeFilenamePart(v) {
  return (v || "file").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "file";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toUint8(value) {
  return new TextEncoder().encode(value);
}

function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((Math.floor(now.getSeconds() / 2)) & 0x1f);
  const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);

  for (const entry of entries) {
    const nameBytes = toUint8(entry.name);
    const dataBytes = typeof entry.data === "string" ? toUint8(entry.data) : entry.data;
    const crc = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length + dataBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 filenames
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(dataBytes, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); // UTF-8 filenames
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralOffset = offset;
  let centralSize = 0;
  for (const c of centrals) centralSize += c.length;

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralOffset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...locals, ...centrals, end], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function createDocxBlob(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const paragraphs = lines.map((line) => {
    const safe = xmlEscape(line);
    return `<w:p><w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
  }).join("");

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const coreProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Tailored Application</dc:title>
  <dc:creator>Applyify</dc:creator>
  <cp:lastModifiedBy>Applyify</cp:lastModifiedBy>
</cp:coreProperties>`;

  const appProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Applyify</Application>
</Properties>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  return makeZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "docProps/core.xml", data: coreProps },
    { name: "docProps/app.xml", data: appProps },
    { name: "word/_rels/document.xml.rels", data: docRels },
    { name: "word/styles.xml", data: stylesXml },
    { name: "word/document.xml", data: documentXml },
  ]);
}

function createPdfBlob(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const wrapped = [];
  for (const line of lines) {
    if (!line) {
      wrapped.push("");
      continue;
    }
    const words = line.split(/\s+/);
    let current = "";
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      if (next.length > 95) {
        wrapped.push(current);
        current = w;
      } else {
        current = next;
      }
    }
    wrapped.push(current);
  }

  const maxLines = 48;
  const pageLines = wrapped.slice(0, maxLines);
  const escaped = pageLines.map((l) => l.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"));
  const streamLines = ["BT", "/F1 11 Tf", "50 760 Td", "14 TL"];
  escaped.forEach((l, i) => {
    if (i > 0) streamLines.push("T*");
    streamLines.push(`(${l}) Tj`);
  });
  streamLines.push("ET");
  const stream = streamLines.join("\n");
  const streamBytes = toUint8(stream);

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  const headerBytes = toUint8("%PDF-1.4\n");
  const objectBytes = objects.map((obj) => toUint8(obj));
  const offsets = [0];
  let cursor = headerBytes.length;
  for (const bytes of objectBytes) {
    offsets.push(cursor);
    cursor += bytes.length;
  }

  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const xrefBytes = toUint8(xref);
  const trailerBytes = toUint8(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF`);

  return new Blob([headerBytes, ...objectBytes, xrefBytes, trailerBytes], { type: "application/pdf" });
}

function buildTailoredText(job, type) {
  const heading = type === "resume" ? "Tailored Resume" : "Tailored Cover Letter";
  const bodyRaw = type === "resume" ? (job.tailoredResume || "") : (job.tailoredCover || "");
  const body = String(bodyRaw).replace(/\r\n/g, "\n").trim();
  return `${heading}\n\nJob: ${job.title || "Unknown Role"}\nCompany: ${job.company || "Unknown Company"}\nLocation: ${job.location || "Unknown"}\n\n${body}`.trim();
}

function downloadTailoredArtifact(job, type, format) {
  const text = buildTailoredText(job, type);
  const base = `${sanitizeFilenamePart(job.company)}-${sanitizeFilenamePart(job.title)}-${type}`;
  if (!text) throw new Error("No tailored content available yet.");

  if (format === "txt") {
    return downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
  }

  if (format === "pdf") {
    return downloadBlob(createPdfBlob(text), `${base}.pdf`);
  }

  return downloadBlob(createDocxBlob(text), `${base}.docx`);
}

// ─── Design primitives ────────────────────────────────────────────────────────
function FL({children}){return <div style={{fontSize:11,fontWeight:700,color:T.textMute,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:6}}>{children}</div>;}
function SH({icon,title}){return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><span style={{fontSize:16}}>{icon}</span><span style={{fontSize:14,fontWeight:750,color:T.text}}>{title}</span></div>;}
function PH({title,subtitle,action}){
  return <div style={{padding:"30px 32px 8px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",flexShrink:0}}>
    <div>
      <h1 style={{margin:0,fontSize:23,fontWeight:850,color:T.text,letterSpacing:"-0.35px",lineHeight:1.15}}>{title}</h1>
      {subtitle&&<p style={{margin:"7px 0 0",fontSize:13,color:T.textSub,lineHeight:1.55,maxWidth:520}}>{subtitle}</p>}
    </div>
    {action}
  </div>;
}
function Card({children,style:s}){return <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:20,boxShadow:"0 8px 28px rgba(15,23,42,0.04)",...s}}>{children}</div>;}
function Chip({label,color}){return <span style={{fontSize:12,fontWeight:600,color,background:color+"18",border:`1px solid ${color}30`,borderRadius:20,padding:"3px 11px"}}>{label}</span>;}
function Spinner({color=T.primary}){return <span style={{display:"inline-block",width:13,height:13,border:`2px solid ${color}30`,borderTopColor:color,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>;}

function Btn({onClick,children,variant="primary",small,full,disabled,style:s}){
  const base={cursor:disabled?"not-allowed":"pointer",borderRadius:10,fontWeight:650,transition:"opacity 0.15s, transform 0.15s",display:"inline-flex",alignItems:"center",gap:6,opacity:disabled?0.5:1,border:"none",fontFamily:"inherit",letterSpacing:"0.01em"};
  const v={
    primary:{background:`linear-gradient(180deg,${T.primary} 0%,${T.primaryDark} 100%)`,color:"#fff",padding:small?"6px 14px":"10px 20px",fontSize:small?12:13,boxShadow:"0 8px 20px rgba(59,111,232,0.26)"},
    secondary:{background:T.primaryLight,color:T.primary,padding:small?"6px 14px":"10px 20px",fontSize:small?12:13,border:`1px solid ${T.primaryMid}`},
    ghost:{background:"transparent",color:T.textSub,padding:small?"6px 12px":"9px 16px",fontSize:small?12:13,border:`1px solid ${T.border}`},
    danger:{background:T.redBg,color:T.red,padding:small?"6px 14px":"10px 20px",fontSize:small?12:13,border:`1px solid ${T.redBorder}`},
    success:{background:T.greenBg,color:T.green,padding:small?"6px 14px":"10px 20px",fontSize:small?12:13,border:`1px solid ${T.greenBorder}`},
    violet:{background:T.violetBg,color:T.violet,padding:small?"6px 14px":"10px 20px",fontSize:small?12:13,border:`1px solid ${T.violetBorder}`},
  };
  return <button onClick={disabled?undefined:onClick} style={{...base,...v[variant],...(full?{width:"100%",justifyContent:"center"}:{}),...s}}>{children}</button>;
}

function AppInput({value,onChange,placeholder,type="text",style:s,...rest}){
  const [f,setF]=useState(false);
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)}
    {...rest}
    style={{width:"100%",background:T.surface,border:`1.5px solid ${f?T.borderFocus:T.border}`,borderRadius:10,color:T.text,padding:"10px 13px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color 0.15s, box-shadow 0.15s",boxShadow:f?`0 0 0 3px ${T.primaryLight}`:"none",...s}}/>;
}

function TA({value,onChange,placeholder,rows=6,style:s}){
  const [f,setF]=useState(false);
  return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)}
    style={{width:"100%",background:T.surface,border:`1.5px solid ${f?T.borderFocus:T.border}`,borderRadius:10,color:T.text,padding:"11px 13px",fontSize:13,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.65,transition:"border-color 0.15s, box-shadow 0.15s",boxShadow:f?`0 0 0 3px ${T.primaryLight}`:"none",...s}}/>;
}

function Sel({value,onChange,options,style:s}){
  return <select value={value} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:10,color:value?T.text:T.textMute,padding:"10px 13px",fontSize:13,fontFamily:"inherit",outline:"none",cursor:"pointer",...s}}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

function LocationAutocomplete({ value, onChange, placeholder = "City, state, or country", compact = false }) {
  const [open, setOpen] = useState(false);
  const [remoteMatches, setRemoteMatches] = useState([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const wrapRef = useRef(null);
  const input = value || "";
  const q = input.trim().toLowerCase();

  useEffect(() => {
    function onClickOutside(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (q.length < 2 || q === "remote" || q === "hybrid" || q === "on-site") {
      setRemoteMatches([]);
      setLoadingRemote(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoadingRemote(true);
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&addressdetails=1&q=${encodeURIComponent(input.trim())}`;
        const res = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Accept-Language": "en",
          },
        });
        if (!res.ok) throw new Error("Location search unavailable");
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map((row) => {
          const city =
            row?.address?.city ||
            row?.address?.town ||
            row?.address?.village ||
            row?.address?.hamlet ||
            row?.name ||
            "";
          const state = row?.address?.state || row?.address?.province || "";
          const country = row?.address?.country || "";
          const label = [city, state, country].filter(Boolean).join(", ") || row?.display_name || "";
          return {
            label,
            value: label,
          };
        }).filter((x) => x.value);
        setRemoteMatches(mapped);
      } catch {
        setRemoteMatches([]);
      } finally {
        setLoadingRemote(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, input]);

  const matches = useMemo(() => {
    const pinned = [
      { label: "Remote", value: "Remote" },
      { label: "Hybrid", value: "Hybrid" },
      { label: "On-site", value: "On-site" },
      { label: "Toronto, ON, Canada", value: "Toronto, ON, Canada" },
      { label: "Vancouver, BC, Canada", value: "Vancouver, BC, Canada" },
    ];
    const base = [
      ...pinned,
      ...LOCATION_CATALOG.map((loc) => {
        const region = loc.region ? `, ${loc.region}` : "";
        return {
          label: `${loc.city}${region}, ${loc.country}`,
          value: `${loc.city}${region}, ${loc.country}`,
        };
      }),
    ];
    const merged = [
      ...base,
      ...remoteMatches,
    ];
    const unique = Array.from(new Map(merged.map((x) => [x.value, x])).values());
    const filtered = !q ? unique.slice(0, 8) : unique.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 12);
    const custom = q && !filtered.some((x) => x.value.toLowerCase() === q)
      ? [{ label: `Use "${input.trim()}"`, value: input.trim() }]
      : [];
    return [...custom, ...filtered];
  }, [q, input, remoteMatches]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <AppInput
        value={input}
        onChange={(v) => { onChange(v); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (input.trim()) onChange(input.trim());
          setTimeout(() => setOpen(false), 80);
        }}
        placeholder={placeholder}
        style={compact ? { height: 40, padding: "9px 12px" } : undefined}
      />
      {open && (
        <div style={{
          position: "absolute",
          top: compact ? 42 : 46,
          left: 0,
          right: 0,
          zIndex: 20,
          background: "#fff",
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          boxShadow: "0 14px 30px rgba(15,23,42,0.12)",
          maxHeight: 220,
          overflowY: "auto",
        }}>
          {loadingRemote ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: T.textMute }}>
              Searching locations…
            </div>
          ) : matches.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: T.textMute }}>
              No matches. Press Enter to keep custom location.
            </div>
          ) : matches.map((m) => (
            <button
              key={m.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(m.value); setOpen(false); }}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: m.value === value ? T.primaryLight : "#fff",
                color: T.text,
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
      {!open && value && (
        <div style={{ marginTop: 6, fontSize: 11, color: T.textMute }}>
          Selected: {value}
        </div>
      )}
    </div>
  );
}

function TitleAutocomplete({ value, onChange, placeholder = "Search job title", compact = false }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const input = value || "";
  const q = input.trim().toLowerCase();

  useEffect(() => {
    function onClickOutside(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const matches = useMemo(() => {
    const options = Array.from(new Set([...OCCUPATION_OPTIONS, ...TITLE_OPTIONS]));
    const filtered = !q ? options.slice(0, 10) : options.filter((x) => x.toLowerCase().includes(q)).slice(0, 12);
    const custom = q && !filtered.some((x) => x.toLowerCase() === q)
      ? [`Use "${input.trim()}"`]
      : [];
    return [...custom, ...filtered];
  }, [q, input]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <AppInput
        value={input}
        onChange={(v) => { onChange(v); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (input.trim()) onChange(input.trim());
          setTimeout(() => setOpen(false), 80);
        }}
        placeholder={placeholder}
        style={compact ? { height: 40, padding: "9px 12px" } : undefined}
      />
      {open && (
        <div style={{
          position: "absolute",
          top: compact ? 42 : 46,
          left: 0,
          right: 0,
          zIndex: 20,
          background: "#fff",
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          boxShadow: "0 14px 30px rgba(15,23,42,0.12)",
          maxHeight: 220,
          overflowY: "auto",
        }}>
          {matches.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: T.textMute }}>
              No matches. Press Enter to keep custom title.
            </div>
          ) : matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const v = m.startsWith('Use "') && m.endsWith('"') ? input.trim() : m;
                onChange(v);
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: m === value ? T.primaryLight : "#fff",
                color: T.text,
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OnboardingFlow({ profile, onSave, onSkip }) {
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState(profile.location || "");
  const [occupationQuery, setOccupationQuery] = useState(profile.targetTitle || "");
  const [occupation, setOccupation] = useState(profile.targetTitle || "");
  const [distance, setDistance] = useState(profile.searchRadiusKm || "50");
  const [saving, setSaving] = useState(false);
  const occMatches = useMemo(() => {
    const q = occupationQuery.trim().toLowerCase();
    if (!q) return OCCUPATION_OPTIONS.slice(0, 8);
    return OCCUPATION_OPTIONS.filter((o) => o.toLowerCase().includes(q)).slice(0, 10);
  }, [occupationQuery]);

  async function complete() {
    setSaving(true);
    await onSave({
      location,
      targetLocation: location,
      targetTitle: occupation || occupationQuery,
      searchRadiusKm: distance,
      onboardingCompletedAt: new Date().toISOString(),
    });
    setSaving(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#EEEDF8", padding: "26px 18px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 18, boxShadow: "0 18px 34px rgba(15,23,42,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>Quick Setup</div>
            <div style={{ fontSize: 12, color: T.textSub }}>{step + 1}/3</div>
          </div>
          <div style={{ height: 4, background: "#EEF2FF", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((step + 1) / 3) * 100}%`, background: T.primary }} />
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {step === 0 && (
            <>
              <div style={{ fontSize: 20, fontWeight: 750, color: T.text, marginBottom: 6 }}>Your location</div>
              <div style={{ fontSize: 13, color: T.textSub, marginBottom: 12 }}>Pick where you want to work. Type to search like Maps.</div>
              <LocationAutocomplete value={location} onChange={setLocation} placeholder="Search city, state, country" />
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ fontSize: 20, fontWeight: 750, color: T.text, marginBottom: 6 }}>Your occupation</div>
              <div style={{ fontSize: 13, color: T.textSub, marginBottom: 12 }}>Start typing and select a matching role.</div>
              <AppInput value={occupationQuery} onChange={setOccupationQuery} placeholder="Search occupation" />
              <div style={{ marginTop: 10, border: `1px solid ${T.border}`, borderRadius: 10, maxHeight: 200, overflowY: "auto" }}>
                {occMatches.map((o) => (
                  <button key={o} type="button" onClick={() => { setOccupation(o); setOccupationQuery(o); }} style={{ width: "100%", textAlign: "left", border: "none", borderBottom: `1px solid ${T.border}`, background: occupation === o ? T.primaryLight : "#fff", padding: "10px 12px", cursor: "pointer", color: T.text, fontSize: 13 }}>
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ fontSize: 20, fontWeight: 750, color: T.text, marginBottom: 6 }}>Match distance</div>
              <div style={{ fontSize: 13, color: T.textSub, marginBottom: 12 }}>How far should potential matches be?</div>
              <div style={{ display: "grid", gap: 8 }}>
                {["30", "50", "100", "200", "any"].map((km) => (
                  <button key={km} type="button" onClick={() => setDistance(km)} style={{ textAlign: "left", border: `1px solid ${distance === km ? T.primaryMid : T.border}`, borderRadius: 10, background: distance === km ? T.primaryLight : "#fff", padding: "10px 12px", cursor: "pointer", fontSize: 13, color: T.text }}>
                    {km === "any" ? "Doesn't matter" : `${km} km`}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: 20, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <Btn variant="ghost" onClick={onSkip}>Skip</Btn>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && <Btn variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Btn>}
            {step < 2 ? (
              <Btn onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !location}>
                Continue
              </Btn>
            ) : (
              <Btn onClick={complete} disabled={saving || !location || !(occupation || occupationQuery)}>
                {saving ? <><Spinner color="#fff" /> Saving…</> : "Finish setup"}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({checked,onChange,label}){
  return <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none"}}>
    <div onClick={()=>onChange(!checked)} style={{width:36,height:20,borderRadius:10,background:checked?T.primary:T.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:checked?18:3,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
    </div>
    <span style={{fontSize:13,color:T.textSub,fontWeight:500}}>{label}</span>
  </label>;
}

function FileUpBtn({onText,label="Upload .txt/.pdf"}){
  const ref=useRef(); const [loading,setLoading]=useState(false);
  async function handle(e){
    const file=e.target.files[0]; if(!file)return; setLoading(true);
    try{
      if(file.type==="application/pdf"){
        const supabase = getSupabaseClient();
        const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
        const { data: d, error } = await supabase.functions.invoke("anthropic-proxy", {
          body: {
            usageType: "extract",
            model: "claude-sonnet-4-20250514",
            maxTokens: 3000,
            messages: [{
              role: "user",
              content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
                { type: "text", text: "Extract and return only the full plain text. No commentary." },
              ],
            }],
          },
        });
        if (error) throw error;
        if (d?.error) throw new Error(d.error);
        onText(d.content?.map(b=>b.text||"").join("")||"",file.name);
      }else{onText(await file.text(),file.name);}
    }catch(err){alert(err?.message || "Could not read file.");}
    setLoading(false); e.target.value="";
  }
  return <><input ref={ref} type="file" accept=".txt,.pdf" onChange={handle} style={{display:"none"}}/>
    <Btn onClick={()=>ref.current?.click()} variant="ghost" small disabled={loading}>
      {loading?<><Spinner/> Reading…</>:<>📎 {label}</>}
    </Btn></>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function ProfileView({docs,setDocs,profile,setProfileState}){
  const [savedMsg,setSavedMsg]=useState("");
  const [profileError,setProfileError]=useState("");
  const [savingProfile,setSavingProfile]=useState(false);
  const [savingDoc,setSavingDoc]=useState(false);
  const [docError,setDocError]=useState("");
  const [showDocForm,setShowDocForm]=useState(false);
  const [docType,setDocType]=useState("resume");
  const [docTag,setDocTag]=useState("");
  const [docContent,setDocContent]=useState("");
  const [editDocId,setEditDocId]=useState(null);

  function up(k,v){setProfileState((p)=>({...p,[k]:v}));}
  async function save(){
    setSavingProfile(true);
    setProfileError("");
    try {
      const savedProfile = await store.setProfile(profile);
      if (savedProfile) {
        setProfileState((prev) => ({ ...prev, ...savedProfile }));
      }
      setSavedMsg("Saved!");
      setTimeout(()=>setSavedMsg(""),2000);
    } catch(e){
      setProfileError(`Error saving profile: ${e.message}`);
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveDoc(){
    if(!docContent.trim()||!docTag.trim())return;
    setSavingDoc(true);
    setDocError("");
    try {
      if(editDocId){
        const updated = await store.updateDoc(editDocId,{tag:docTag,content:docContent,type:docType});
        setDocs(prev=>prev.map(d=>d.id===editDocId?updated:d));
      } else {
        const newDoc = await store.insertDoc({type:docType,tag:docTag,content:docContent});
        setDocs(prev=>[newDoc,...prev]);
      }
      setShowDocForm(false);setEditDocId(null);setDocTag("");setDocContent("");setDocType("resume");
    } catch(e){
      setDocError(`Error saving document: ${e.message}`);
    } finally {
      setSavingDoc(false);
    }
  }
  function startEdit(doc){setEditDocId(doc.id);setDocType(doc.type);setDocTag(doc.tag);setDocContent(doc.content);setShowDocForm(true);}
  async function delDoc(id){
    setDocError("");
    try {
      await store.deleteDoc(id);
      setDocs(prev=>prev.filter(d=>d.id!==id));
    } catch(e){
      setDocError(`Error deleting document: ${e.message}`);
    }
  }
  function cancelDoc(){setShowDocForm(false);setEditDocId(null);setDocTag("");setDocContent("");setDocError("");}
  const renderField=(lbl,k,ph,type="text")=>(
    <div style={{marginBottom:14}}>
      <FL>{lbl}</FL>
      <AppInput value={profile[k]||""} onChange={v=>up(k,v)} placeholder={ph} type={type}/>
    </div>
  );
  const resumes=docs.filter(d=>d.type==="resume"); const covers=docs.filter(d=>d.type==="cover_letter");

  return(
    <div style={{flex:1,height:"100%",overflowY:"auto",overflowX:"hidden",background:T.bg,minHeight:0}}>
      <PH title="Profile" subtitle="Personal info, job preferences, and documents."/>
      <div style={{padding:"12px 28px 28px",maxWidth:1040,margin:"0 auto"}}>

        {profileError&&<div style={{fontSize:13,color:T.red,background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:14}}>{profileError}</div>}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14,marginBottom:14}}>
          <Card>
            <SH icon="👤" title="Personal Info"/>
            {renderField("Full Name","name","Jane Smith")}
            {renderField("Email","email","jane@example.com","email")}
            {renderField("LinkedIn URL","linkedin","https://linkedin.com/in/jane")}
            <div style={{marginBottom:14}}>
              <FL>Location</FL>
              <LocationAutocomplete
                value={profile.location || ""}
                onChange={(v)=>up("location",v)}
                placeholder="Search location"
              />
            </div>
            {renderField("Phone","phone","+1 (555) 000-0000","tel")}
          </Card>
          <Card>
            <SH icon="🎯" title="Job Preferences"/>
            <div style={{marginBottom:14}}>
              <FL>Target Job Title</FL>
              <TitleAutocomplete
                value={profile.targetTitle || ""}
                onChange={(v)=>up("targetTitle",v)}
                placeholder="Search or type any title"
              />
            </div>
            <div style={{marginBottom:14}}>
              <FL>Preferred Location(s)</FL>
              <LocationAutocomplete
                value={profile.targetLocation || ""}
                onChange={(v)=>up("targetLocation",v)}
                placeholder="Search city, state, country"
              />
            </div>
            <div style={{marginBottom:14}}>
              <FL>Work Mode</FL>
              <Sel
                value={profile.workMode || "all"}
                onChange={(v)=>up("workMode",v)}
                options={[
                  { value: "all", label: "Any" },
                  { value: "remote", label: "Remote" },
                  { value: "hybrid", label: "Hybrid" },
                  { value: "on-site", label: "On-site" },
                ]}
              />
            </div>
            <div style={{marginBottom:14}}>
              <FL>Seniority Level</FL>
              <Sel
                value={profile.seniority || ""}
                onChange={(v)=>up("seniority",v)}
                options={[
                  { value: "", label: "Select seniority" },
                  { value: "Internship", label: "Internship" },
                  { value: "Entry-level", label: "Entry-level" },
                  { value: "Associate", label: "Associate" },
                  { value: "Mid-level", label: "Mid-level" },
                  { value: "Senior", label: "Senior" },
                  { value: "Lead", label: "Lead" },
                  { value: "Staff", label: "Staff" },
                  { value: "Principal", label: "Principal" },
                  { value: "Manager", label: "Manager" },
                  { value: "Director", label: "Director" },
                  { value: "VP", label: "VP" },
                  { value: "C-level", label: "C-level" },
                ]}
              />
            </div>
            {renderField("Industries","industry","SaaS, Fintech, Healthcare")}
            <div style={{marginBottom:14}}><FL>Keywords to Highlight</FL>
              <TA value={profile.keywords||""} onChange={v=>up("keywords",v)} placeholder="agile, roadmap, SQL..." rows={2}/>
            </div>
          </Card>
        </div>

        <Card style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <SH icon="🏢" title="Company & Culture Preferences"/>
            <Toggle checked={!!profile.useCompanyPrefs} onChange={v=>up("useCompanyPrefs",v)}
              label={profile.useCompanyPrefs?"Applied to search":"Off"}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
            <div><FL>Target Companies</FL>
              <TA value={profile.targetCompanies||""} onChange={v=>up("targetCompanies",v)}
                placeholder="e.g. Stripe, Notion, Series B startups..." rows={3}/>
            </div>
            <div><FL>Lifestyle & Culture Vibe</FL>
              <TA value={profile.lifestyleVibe||""} onChange={v=>up("lifestyleVibe",v)}
                placeholder="e.g. async-first, flat hierarchy, mission-driven..." rows={3}/>
            </div>
          </div>
          {!profile.useCompanyPrefs&&<div style={{marginTop:10,fontSize:12,color:T.textMute,background:T.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${T.border}`}}>💡 Toggle on to include these preferences in searches and suggestions.</div>}
        </Card>

        <div style={{marginBottom:18}}>
          <Btn onClick={save} variant={savedMsg?"success":"primary"} disabled={savingProfile}>
            {savingProfile ? <><Spinner color="#fff"/> Saving…</> : savedMsg ? `✓ ${savedMsg}` : "Save Profile Defaults"}
          </Btn>
        </div>

        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <SH icon="📄" title="My Documents"/>
            <Btn onClick={()=>{setShowDocForm(v=>!v);if(showDocForm)cancelDoc();}} variant="secondary" small>{showDocForm?"Cancel":"+ Add Document"}</Btn>
          </div>

          {docError&&<div style={{fontSize:12,color:T.red,background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:8,padding:"8px 12px",marginBottom:12}}>{docError}</div>}

          {showDocForm&&(
            <div style={{background:T.primaryLight,border:`1px solid ${T.primaryMid}`,borderRadius:10,padding:16,marginBottom:16}}>
              <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"flex-end"}}>
                <div style={{minWidth:170}}><FL>Type</FL>
                  <Sel value={docType} onChange={setDocType} options={[{value:"resume",label:"Resume / CV"},{value:"cover_letter",label:"Cover Letter"}]} style={{width:"100%"}}/>
                </div>
                <div style={{flex:1,minWidth:180}}><FL>Label</FL><AppInput value={docTag} onChange={setDocTag} placeholder="e.g. Tech Resume"/></div>
                <FileUpBtn onText={(text,fn)=>{setDocContent(text);if(!docTag)setDocTag(fn.replace(/\.[^.]+$/,""));}}/>
              </div>
              <FL>Document Text</FL>
              <TA value={docContent} onChange={setDocContent} placeholder="Paste text here..." rows={8}/>
              <div style={{marginTop:12,display:"flex",gap:8}}>
                <Btn onClick={saveDoc} disabled={savingDoc}>
                  {savingDoc ? <><Spinner color="#fff"/> Saving…</> : editDocId?"Update":"Save Document"}
                </Btn>
                <Btn onClick={cancelDoc} variant="ghost" disabled={savingDoc}>Cancel</Btn>
              </div>
            </div>
          )}

          {[{list:resumes,icon:"📋",label:"Resumes & CVs"},{list:covers,icon:"✉️",label:"Cover Letters"}].map(({list,icon,label})=>(
            <div key={label} style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:T.textSub,marginBottom:8}}>{icon} {label} <span style={{fontWeight:400,color:T.textMute}}>({list.length})</span></div>
              {list.length===0?<div style={{fontSize:13,color:T.textMute}}>None yet.</div>
                :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
                  {list.map(doc=>(
                    <div key={doc.id} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div style={{fontSize:13,fontWeight:700,color:T.text}}>{doc.tag}</div>
                        <div style={{display:"flex",gap:4}}><Btn onClick={()=>startEdit(doc)} variant="ghost" small>Edit</Btn><Btn onClick={()=>delDoc(doc.id)} variant="danger" small>✕</Btn></div>
                      </div>
                      <div style={{fontSize:11,color:T.textMute,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{doc.content.slice(0,120)}…</div>
                      <div style={{fontSize:10,color:T.textMute,marginTop:6}}>{formatDate(doc.createdAt || doc.created_at)}</div>
                    </div>
                  ))}
                </div>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTED ROLES VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function SuggestedView(){
  return(
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <PH title="Suggested Jobs" subtitle="Coming soon"/>
      <div style={{padding:"18px 32px 30px",maxWidth:980,margin:"0 auto"}}>
        <Card style={{opacity:0.6, borderStyle:"dashed"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:16,fontWeight:750,color:T.text}}>Suggested Jobs</div>
            <span style={{fontSize:11,fontWeight:700,padding:"4px 8px",borderRadius:999,border:`1px solid ${T.border}`,color:T.textSub}}>Coming Soon</span>
          </div>
          <div style={{fontSize:13,color:T.textSub,lineHeight:1.7}}>
            This section is intentionally disabled while we stabilize job board search and tailoring quality.
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOB SEARCH VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function SearchView({jobs,setJobs,profile,onNavigate}){
  const [query,setQuery]=useState("");
  const [searchLocation,setSearchLocation]=useState(profile?.targetLocation || profile?.location || "");
  const [queryTouched,setQueryTouched]=useState(false);
  const [locationTouched,setLocationTouched]=useState(false);
  const [workMode,setWorkMode]=useState(profile?.workMode || "all");
  const [datePosted,setDatePosted]=useState("all");
  const [results,setResults]=useState([]);
  const [selectedJobIdx,setSelectedJobIdx]=useState(0);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [savingJobKey,setSavingJobKey]=useState("");
  const profileTitle = (profile?.targetTitle || "").trim();
  const profileSeniority = (profile?.seniority || "").trim();
  const profileIndustry = (profile?.industry || "").trim();
  const profileKeywords = (profile?.keywords || "").trim();
  const profileCompanies = (profile?.targetCompanies || "").trim();
  const profileCulture = (profile?.lifestyleVibe || "").trim();
  const savedJobKeys = useMemo(
    () => new Set(jobs.map((j) => `${j.title || ""}::${j.company || ""}`)),
    [jobs]
  );
  const selectedJob = results[selectedJobIdx] || null;

  useEffect(() => {
    if (!queryTouched && !query && profileTitle) {
      setQuery(profileTitle);
    }
  }, [query, profileTitle, queryTouched]);

  useEffect(() => {
    const profileLocation = profile?.targetLocation || profile?.location || "";
    if (!locationTouched && !searchLocation && profileLocation) {
      setSearchLocation(profileLocation);
    }
  }, [profile, searchLocation, locationTouched]);

  async function search(){
    const baseQuery = queryTouched ? query.trim() : (query.trim() || profileTitle);
    if(!baseQuery){
      setError("Enter a keyword or set a target title in Profile.");
      return;
    }
    const parts = [baseQuery];
    const locationValue = locationTouched
      ? (searchLocation?.trim() || "")
      : (searchLocation?.trim() || profile?.targetLocation?.trim() || profile?.location?.trim() || "");
    if (locationValue) parts.push(locationValue);
    if (workMode !== "all") parts.push(workMode);
    if (datePosted !== "all") parts.push(`posted ${datePosted}`);
    if (profileSeniority) parts.push(profileSeniority);
    if (profileIndustry) parts.push(profileIndustry);
    if (profileKeywords) parts.push(profileKeywords);
    if (profile?.useCompanyPrefs && profileCompanies) parts.push(`target companies: ${profileCompanies}`);
    if (profile?.useCompanyPrefs && profileCulture) parts.push(`culture: ${profileCulture}`);
    const finalQuery = parts.join(", ");
    const country = inferCountryParam(locationValue);

    setLoading(true);setError("");setResults([]);
    try{
      let jobsFromApi = await searchJobsByKeyword(finalQuery, {
        page: 1,
        numPages: 2,
        country,
        datePosted,
      });

      // Fallback: if profile-enriched query is too restrictive, retry with simpler terms.
      if ((!jobsFromApi || jobsFromApi.length === 0) && finalQuery !== baseQuery) {
        const relaxedQuery = locationValue ? `${baseQuery}, ${locationValue}` : baseQuery;
        jobsFromApi = await searchJobsByKeyword(relaxedQuery, {
          page: 1,
          numPages: 2,
          country,
          datePosted,
        });
      }

      // Final fallback: remove country restriction for global search text.
      if (!jobsFromApi || jobsFromApi.length === 0) {
        jobsFromApi = await searchJobsByKeyword(baseQuery, {
          page: 1,
          numPages: 2,
          country: "",
          datePosted,
        });
      }

      setResults(jobsFromApi);
      setSelectedJobIdx(0);
      if (!jobsFromApi || jobsFromApi.length === 0) {
        setError("No results found. Try broader keywords (e.g., remove seniority/industry terms).");
      }
    }catch(e){setError(e?.message || "Search failed. Check job board API setup.");}
    setLoading(false);
  }

  async function saveJob(job){
    if(savedJobKeys.has(`${job.title || ""}::${job.company || ""}`))return;
    const jobKey = `${job.title}::${job.company}`;
    setSavingJobKey(jobKey);
    try{
      const saved=await store.insertJob({
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        url: job.apply_url,
        status:"saved",
        notes:"",
      });
      setJobs(prev=>[saved,...prev]);
    }catch(e){setError(`Error saving job: ${e.message}`);}
    finally{setSavingJobKey("");}
  }

  return(
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <PH title="Job Search" subtitle="Search roles, apply filters, preview details, then save to Tracker."/>
      <div style={{padding:"12px 28px 28px",maxWidth:1240,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr auto",gap:10,marginBottom:10}}>
          <TitleAutocomplete value={query} onChange={(v)=>{ setQuery(v); setQueryTouched(true); }} placeholder='e.g. customer success, account manager, frontend engineer' compact
            onKeyDown={(e)=>{ if(e.key==="Enter" && !loading){ search(); } }}/>
          <LocationAutocomplete value={searchLocation} onChange={(v)=>{ setSearchLocation(v); setLocationTouched(true); }} placeholder="Location" compact />
          <Btn onClick={search} disabled={loading} style={{height:40,padding:"0 20px"}}>
            {loading?<><Spinner color="#fff"/> Searching…</>:"Search"}
          </Btn>
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
          <Sel value={workMode} onChange={setWorkMode} options={[
            { value: "all", label: "Work mode: Any" },
            { value: "remote", label: "Remote" },
            { value: "hybrid", label: "Hybrid" },
            { value: "on-site", label: "On-site" },
          ]} style={{width:180,padding:"8px 12px",fontSize:13}} />
          <Sel value={datePosted} onChange={setDatePosted} options={[
            { value: "all", label: "Date posted: Any time" },
            { value: "past 24 hours", label: "Past 24 hours" },
            { value: "past week", label: "Past week" },
            { value: "past month", label: "Past month" },
          ]} style={{width:220,padding:"8px 12px",fontSize:13}} />
          {(profileTitle || profile?.location) && (
            <span style={{fontSize:12,color:T.textSub}}>Using profile defaults: {profileTitle || "title not set"}{profile?.location ? ` · ${profile.location}` : ""}</span>
          )}
        </div>

        {error&&(
          <div style={{fontSize:13,color:T.red,background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <span>{error}</span>
            <Btn small variant="ghost" onClick={search}>Retry</Btn>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:12,minHeight:560}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:"linear-gradient(135deg, var(--accent), #818CF8)",color:"#fff"}}>
              <div style={{fontSize:14,fontWeight:700}}>{query || profileTitle || "Search"} in {searchLocation || "Any location"}</div>
              <div style={{fontSize:12,opacity:0.9}}>{results.length} result{results.length===1?"":"s"}</div>
            </div>
            <div style={{maxHeight:560,overflowY:"auto"}}>
              {results.length===0 && (
                <div style={{padding:20,fontSize:13,color:T.textSub,display:"grid",gap:10}}>
                  <span>Run a search to see job matches.</span>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <Btn small variant="secondary" onClick={search}>Search with defaults</Btn>
                    {jobs.length > 0 ? <Btn small variant="ghost" onClick={()=>onNavigate?.("tracker")}>Go to Tracker</Btn> : null}
                  </div>
                </div>
              )}
              {results.map((job,i)=>{
                const active = i === selectedJobIdx;
                return (
                  <button key={`${job.title || "job"}-${job.company || "company"}-${job.apply_url || i}`} type="button" onClick={()=>setSelectedJobIdx(i)} style={{
                    display:"block",width:"100%",textAlign:"left",border:"none",borderBottom:`1px solid ${T.border}`,padding:"12px 14px",
                    background:active ? "#EEF4FF" : "#fff",cursor:"pointer"
                  }}>
                    <div style={{fontSize:16,fontWeight:750,color:active?T.primary:T.text,marginBottom:3}}>{job.title}</div>
                    <div style={{fontSize:13,color:T.text,fontWeight:650}}>{job.company}</div>
                    <div style={{fontSize:12,color:T.textSub,marginTop:2}}>{job.location}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card style={{padding:18}}>
            {!selectedJob && (
              <div style={{fontSize:14,color:T.textSub}}>Select a job to preview details.</div>
            )}
            {selectedJob && (() => {
              const isSaved = savedJobKeys.has(`${selectedJob.title || ""}::${selectedJob.company || ""}`);
              const jobKey = `${selectedJob.title}::${selectedJob.company}`;
              const saving = savingJobKey === jobKey;
              return (
                <>
                  <div style={{fontSize:13,color:T.textSub,marginBottom:8}}>Company</div>
                  <div style={{fontSize:22,fontWeight:800,lineHeight:1.2,color:T.text,letterSpacing:"-0.3px",marginBottom:4}}>{selectedJob.title}</div>
                  <div style={{fontSize:15,color:T.text,fontWeight:700,marginBottom:4}}>{selectedJob.company}</div>
                  <div style={{fontSize:16,color:T.textSub,marginBottom:12}}>{selectedJob.location}</div>
                  <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                    <Chip label={workMode === "all" ? "Any work mode" : workMode} color={T.teal} />
                    <Chip label={datePosted === "all" ? "Any date" : datePosted} color={T.amber} />
                    <Chip label={selectedJob.source || "jsearch"} color={T.violet} />
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:14}}>
                    <Btn onClick={()=>saveJob(selectedJob)} disabled={isSaved || saving} variant={isSaved ? "success" : "secondary"}>
                      {saving ? <><Spinner/> Saving…</> : isSaved ? "✓ Saved" : "Save"}
                    </Btn>
                    {selectedJob.apply_url && (
                      <a href={selectedJob.apply_url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"10px 16px",border:`1px solid ${T.border}`,borderRadius:10,color:T.text,textDecoration:"none",fontSize:13,fontWeight:650}}>
                        View Listing
                      </a>
                    )}
                  </div>
                  <div style={{fontSize:13,color:T.textSub,lineHeight:1.7,maxHeight:300,overflowY:"auto",paddingRight:4}}>
                    {selectedJob.description || "No description provided by source."}
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKER VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function TrackerView({jobs,setJobs,docs,subscription,onNavigate}){
  const [filterStatus,setFilterStatus]=useState("all");
  const [sortBy,setSortBy]=useState("date");
  const [trackerMsg,setTrackerMsg]=useState("");
  const [trackerErr,setTrackerErr]=useState("");
  const [tailorModalJobId,setTailorModalJobId]=useState(null);
  const [tailorInputs,setTailorInputs]=useState({
    excitement: "",
    emphasis: "",
    avoid: "",
    resumeId: "",
    coverId: "",
  });
  const [tailorLoading,setTailorLoading]=useState(false);
  const [quota,setQuota]=useState({ weekly_limit: WEEKLY_TAILOR_LIMIT, used: 0, remaining: WEEKLY_TAILOR_LIMIT, resets_at: null });
  const [downloadFormatByJob,setDownloadFormatByJob]=useState({});
  const [showAddJobModal,setShowAddJobModal]=useState(false);
  const [addingJob,setAddingJob]=useState(false);
  const [newJobUrl,setNewJobUrl]=useState("");
  const [newJobTitle,setNewJobTitle]=useState("");
  const [newJobCompany,setNewJobCompany]=useState("");
  const [newJobLocation,setNewJobLocation]=useState("");
  const [newJobDescription,setNewJobDescription]=useState("");
  const [selectedTrackerId,setSelectedTrackerId]=useState("");
  const [expandedSections,setExpandedSections]=useState({
    description: false,
    resume: false,
    cover: false,
  });
  const premiumActive = isPremiumSubscription(subscription);

  async function updateStatus(id,status){
    setTrackerErr("");
    const prev = jobs;
    const u=jobs.map(j=>j.id===id?{...j,status}:j);
    setJobs(u);
    try{
      await store.updateJob(id,{status});
    }catch(e){
      setJobs(prev);
      setTrackerErr(`Could not update status: ${e.message}`);
    }
  }
  async function saveNotes(id, notesValue){
    setTrackerErr("");
    const prev = jobs;
    const u=jobs.map(j=>j.id===id?{...j,notes:notesValue}:j);
    setJobs(u);
    try{
      await store.updateJob(id,{notes:notesValue});
      setTrackerMsg("Notes saved.");
      setTimeout(()=>setTrackerMsg(""),1500);
    }catch(e){
      setJobs(prev);
      setTrackerErr(`Could not save notes: ${e.message}`);
    }
  }
  async function saveDescription(id, descriptionValue){
    setTrackerErr("");
    const prev = jobs;
    const u=jobs.map(j=>j.id===id?{...j,description:descriptionValue}:j);
    setJobs(u);
    try{
      await store.updateJob(id,{description:descriptionValue});
      setTrackerMsg("Description saved.");
      setTimeout(()=>setTrackerMsg(""),1500);
    }catch(e){
      setJobs(prev);
      setTrackerErr(`Could not save description: ${e.message}`);
    }
  }
  async function deleteJob(id){
    setTrackerErr("");
    const prev = jobs;
    const u=jobs.filter(j=>j.id!==id);
    setJobs(u);
    try{
      await store.deleteJob(id);
    }catch(e){
      setJobs(prev);
      setTrackerErr(`Could not delete job: ${e.message}`);
    }
  }

  function setDownloadFormat(jobId, format) {
    setDownloadFormatByJob((prev) => ({ ...prev, [jobId]: format }));
  }

  function downloadArtifact(job, type) {
    try {
      const format = downloadFormatByJob[job.id] || "txt";
      downloadTailoredArtifact(job, type, format);
    } catch (e) {
      setTrackerErr(`Download failed: ${e.message || e}`);
    }
  }

  function toTitleCase(value) {
    return String(value || "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function inferJobFromUrl(raw) {
    try {
      const parsed = new URL(raw.trim());
      const host = parsed.hostname.replace(/^www\./i, "");
      const companyBase = host.split(".")[0].replace(/[-_]+/g, " ");
      const company = toTitleCase(companyBase) || "Unknown Company";

      const segments = parsed.pathname.split("/").filter(Boolean);
      const last = segments[segments.length - 1] || "";
      const title = toTitleCase(decodeURIComponent(last).replace(/[-_]+/g, " ")) || "Untitled Role";
      return { title, company };
    } catch {
      return { title: "", company: "" };
    }
  }

  async function addJobFromUrl() {
    setTrackerErr("");
    const trimmedUrl = newJobUrl.trim();
    if (!trimmedUrl) {
      setTrackerErr("Job URL is required.");
      return;
    }

    let validUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = `https://${validUrl}`;
    }

    try {
      new URL(validUrl);
    } catch {
      setTrackerErr("Please enter a valid job URL.");
      return;
    }

    setAddingJob(true);
    try {
      const inferred = inferJobFromUrl(validUrl);
      let scraped = null;
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.functions.invoke("scrape-job-url", {
          body: { url: validUrl },
        });
        if (!error && data && !data.error) {
          scraped = data;
        }
      } catch {
        // fall back to inferred fields only
      }
      const saved = await store.insertJob({
        title: newJobTitle.trim() || scraped?.title || inferred.title || "Untitled Role",
        company: newJobCompany.trim() || scraped?.company || inferred.company || "Unknown Company",
        location: newJobLocation.trim() || scraped?.location || "Not specified",
        description: newJobDescription.trim() || scraped?.description || "",
        url: validUrl,
        status: "saved",
        notes: "",
      });
      setJobs((prev) => [saved, ...prev]);
      setShowAddJobModal(false);
      setNewJobUrl("");
      setNewJobTitle("");
      setNewJobCompany("");
      setNewJobLocation("");
      setNewJobDescription("");
      setTrackerMsg("Job added to tracker.");
      setTimeout(()=>setTrackerMsg(""),1500);
    } catch (e) {
      setTrackerErr(`Could not add job: ${e.message || e}`);
    } finally {
      setAddingJob(false);
    }
  }

  useEffect(() => {
    store.getTailoringQuota()
      .then((q) => setQuota(q))
      .catch(() => setTrackerErr("Tailoring limit configuration is missing. Run supabase/tailoring_limits.sql."));
  }, []);

  const filtered=jobs.filter(j=>filterStatus==="all"||j.status===filterStatus).sort((a,b)=>{
    if(sortBy==="date"){
      const bDate = toISO(b.savedAt || b.created_at) || "";
      const aDate = toISO(a.savedAt || a.created_at) || "";
      return bDate.localeCompare(aDate);
    }
    if(sortBy==="company")return(a.company||"").localeCompare(b.company||"");
    return(a.title||"").localeCompare(b.title||"");
  });
  const counts=STATUS_OPTIONS.reduce((acc,s)=>({...acc,[s]:jobs.filter(j=>j.status===s).length}),{});
  const resumes = docs.filter((d) => d.type === "resume");
  const covers = docs.filter((d) => d.type === "cover_letter");
  const selectedTailorJob = jobs.find((j) => j.id === tailorModalJobId) || null;
  const selectedTrackerJob = filtered.find((j) => j.id === selectedTrackerId) || filtered[0] || null;

  useEffect(() => {
    if (!filtered.length) {
      setSelectedTrackerId("");
      return;
    }
    if (!selectedTrackerId || !filtered.some((j) => j.id === selectedTrackerId)) {
      setSelectedTrackerId(filtered[0].id);
    }
  }, [filtered, selectedTrackerId]);

  useEffect(() => {
    setExpandedSections({
      description: false,
      resume: false,
      cover: false,
    });
  }, [selectedTrackerId]);

  function toggleSection(key) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function openTailorModal(job) {
    setTailorModalJobId(job.id);
    setTailorInputs({
      excitement: "",
      emphasis: "",
      avoid: "",
      resumeId: job.resumeDocId || resumes[0]?.id || "",
      coverId: job.coverDocId || covers[0]?.id || "",
    });
    setTrackerErr("");
  }

  async function generateTailoredApplication() {
    if (!selectedTailorJob) return;
    const resume = docs.find((d) => d.id === tailorInputs.resumeId);
    const cover = docs.find((d) => d.id === tailorInputs.coverId);
    if (!resume && !cover) {
      setTrackerErr("Select at least one document.");
      return;
    }
    if (!selectedTailorJob.description?.trim()) {
      setTrackerErr("This job has no description. Add/paste a description in the card first, then tailor.");
      return;
    }
    if (!premiumActive && quota.remaining <= 0) {
      setTrackerErr("Weekly tailoring limit reached. Please wait for reset.");
      return;
    }

    setTailorLoading(true);
    setTrackerErr("");
    try {
      const raw = await callClaude(
        "You are an expert resume writer. Preserve formatting fidelity. Keep section headers and bullet structure. Never collapse into one paragraph. Return only valid JSON with keys: tailored_resume_summary, tailored_cover_letter, keyword_alignment (array), skills_match_summary, match_score.",
        `Job Description:\n${selectedTailorJob.description}\n\nResume (source of truth for structure):\n${resume?.content || "(not provided)"}\n\nCover Letter:\n${cover?.content || "(not provided)"}\n\nCandidate notes:\n- Excitement: ${tailorInputs.excitement}\n- Emphasize: ${tailorInputs.emphasis}\n- De-emphasize: ${tailorInputs.avoid || "None"}\n\nFormatting requirements for tailored_resume_summary:\n1) Keep clear section blocks with line breaks between sections.\n2) Keep bullet lists as one bullet per line, prefixed with '- '.\n3) Keep role entries on separate lines (Company | Title | Dates).\n4) Do not use markdown code fences.\n5) Output plain text with preserved newlines inside JSON string.\n\nFormatting requirements for tailored_cover_letter:\n1) Keep greeting, 2-4 body paragraphs, and sign-off on separate lines.\n2) Preserve paragraph breaks with blank lines.\n3) Do not return markdown.`
      );
      let data;
      try {
        data = JSON.parse(raw.replace(/```json|```/g,"").trim());
      } catch {
        throw new Error("AI response format error. Please try again.");
      }
      const updates = {
        tailoredResume: String(data.tailored_resume_summary || "").replace(/\r\n/g, "\n").trim(),
        tailoredCover: String(data.tailored_cover_letter || "").replace(/\r\n/g, "\n").trim(),
        keywords: Array.isArray(data.keyword_alignment) ? data.keyword_alignment : [],
        matchScore: Number.isFinite(data.match_score) ? data.match_score : null,
        resumeDocId: resume?.id || null,
        coverDocId: cover?.id || null,
        status: "tailored",
      };
      const dbRow = await store.updateJob(selectedTailorJob.id, updates);
      setJobs((prev) => prev.map((j) => (j.id === selectedTailorJob.id ? { ...j, ...dbRow } : j)));
      if (!premiumActive) {
        const refreshedQuota = await store.getTailoringQuota();
        setQuota(refreshedQuota);
      }
      setTrackerMsg("Tailored application generated.");
      setTimeout(()=>setTrackerMsg(""),2000);
      setTailorModalJobId(null);
    } catch (e) {
      if ((e?.message || "").includes("WEEKLY_LIMIT_REACHED")) {
        setTrackerErr("You have reached 7 tailored applications for this week.");
      } else {
        setTrackerErr(`Tailoring failed: ${e.message || e}`);
      }
    } finally {
      setTailorLoading(false);
    }
  }

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.bg}}>
      <PH title="Application Tracker" subtitle={`${jobs.length} job${jobs.length!==1?"s":""} tracked`}
        action={
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn onClick={()=>setShowAddJobModal(true)} variant="secondary">+ Add Job</Btn>
            <Btn onClick={()=>exportCSV(jobs,docs)} variant="ghost">↓ Export CSV</Btn>
          </div>
        }/>

      <div style={{padding:"8px 28px 0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",flexShrink:0,maxWidth:1180,margin:"0 auto",width:"100%"}}>
        {[["all",`All (${jobs.length})`],...STATUS_OPTIONS.map(s=>[s,`${STATUS_META[s].label} (${counts[s]||0})`])].map(([val,lbl])=>(
          <button key={val} onClick={()=>setFilterStatus(val)} style={{
            padding:"5px 14px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all 0.12s",
            border:`1px solid ${filterStatus===val?(val==="all"?T.primary:STATUS_META[val]?.color||T.primary):T.border}`,
            background:filterStatus===val?(val==="all"?T.primaryLight:STATUS_META[val]?.bg||T.primaryLight):"transparent",
            color:filterStatus===val?(val==="all"?T.primary:STATUS_META[val]?.color||T.primary):T.textSub,
          }}>{lbl}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:T.textMute}}>Sort:</span>
          <Sel value={sortBy} onChange={setSortBy}
            options={[{value:"date",label:"Date added"},{value:"company",label:"Company"},{value:"title",label:"Title"}]}
            style={{width:140,padding:"5px 10px",fontSize:12}}/>
        </div>
      </div>

      {(trackerErr || trackerMsg) && (
        <div style={{padding:"10px 28px 0",maxWidth:1180,margin:"0 auto",width:"100%"}}>
          <div style={{
            fontSize:12,
            borderRadius:8,
            padding:"8px 12px",
            border:`1px solid ${trackerErr ? T.redBorder : T.greenBorder}`,
            background:trackerErr ? T.redBg : T.greenBg,
            color:trackerErr ? T.red : T.green,
          }}>
            {trackerErr || trackerMsg}
          </div>
        </div>
      )}

      <div style={{padding:"10px 28px 0",maxWidth:1180,margin:"0 auto",width:"100%"}}>
        <div style={{fontSize:12,color:T.textSub}}>
          Weekly Limit: <strong style={{color:T.text}}>
            {premiumActive ? "Unlimited" : (quota.remaining ?? 0)}
          </strong>
          {premiumActive ? null : <> / {quota.weekly_limit || WEEKLY_TAILOR_LIMIT}</>}
          {!premiumActive && quota.resets_at ? <> · Resets {new Date(quota.resets_at).toLocaleString()}</> : null}
        </div>
      </div>

      <div style={{flex:1,overflow:"auto",padding:"12px 28px 24px",maxWidth:1180,margin:"0 auto",width:"100%"}}>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"60px 0",color:T.textMute}}>
            <div style={{fontSize:36,marginBottom:10}}>📭</div>
            <div style={{fontSize:14,color:T.textSub,fontWeight:600,marginBottom:4}}>No applications here</div>
            <div style={{fontSize:13,marginBottom:12}}>Save jobs from Job Search to start tracking.</div>
            <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
              <Btn small variant="secondary" onClick={()=>onNavigate?.("search")}>Go to Job Search</Btn>
              <Btn small variant="ghost" onClick={()=>setShowAddJobModal(true)}>+ Add Job by URL</Btn>
            </div>
          </div>
        )}
        {filtered.length>0&& selectedTrackerJob &&(
          <div style={{display:"grid",gridTemplateColumns:"1.05fr 1fr",gap:12,minHeight:540}}>
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,fontSize:12,fontWeight:700,color:T.textSub,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                Jobs Inbox ({filtered.length})
              </div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1.3fr 1fr 1fr",padding:"8px 12px",fontSize:11,fontWeight:700,color:T.textMute,borderBottom:`1px solid ${T.border}`,background:T.bg}}>
                <div>Role</div><div>Company</div><div>Location</div><div>Status</div><div>Saved</div>
              </div>
              <div style={{maxHeight:560,overflowY:"auto"}}>
                {filtered.map((job)=>{
                  const m=STATUS_META[job.status]||STATUS_META.saved;
                  const active = job.id === selectedTrackerJob.id;
                  return (
                    <button key={job.id} onClick={()=>setSelectedTrackerId(job.id)} style={{
                      display:"grid",gridTemplateColumns:"2fr 1.2fr 1.3fr 1fr 1fr",width:"100%",
                      border:"none",borderBottom:`1px solid ${T.border}`,padding:"10px 12px",textAlign:"left",
                      background:active?T.primaryLight:"#fff",cursor:"pointer",alignItems:"center"
                    }}>
                      <div style={{fontSize:13,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.title||"—"}</div>
                      <div style={{fontSize:12,color:T.primary,fontWeight:650,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.company||"—"}</div>
                      <div style={{fontSize:12,color:T.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.location||"—"}</div>
                      <div><span style={{fontSize:11,color:m.color,background:m.bg,border:`1px solid ${m.border}`,borderRadius:999,padding:"3px 8px",fontWeight:700}}>{STATUS_META[job.status]?.label||job.status}</span></div>
                      <div style={{fontSize:12,color:T.textMute}}>{formatDate(job.savedAt || job.created_at)}</div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card style={{maxHeight:"70vh",overflowY:"auto"}}>
              {(() => {
                const job = selectedTrackerJob;
                return (
                  <>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
                      <div>
                        <div style={{fontSize:17,fontWeight:800,color:T.text}}>{job.title||"—"}</div>
                        <div style={{fontSize:13,color:T.primary,fontWeight:650,marginTop:2}}>{job.company||"—"}</div>
                        <div style={{fontSize:12,color:T.textMute,marginTop:2}}>{job.location||"—"}</div>
                      </div>
                      <Sel value={job.status} onChange={v=>updateStatus(job.id,v)}
                        options={STATUS_OPTIONS.map(s=>({value:s,label:STATUS_META[s].label}))}
                        style={{padding:"4px 8px",fontSize:12,borderRadius:20,minWidth:130}}/>
                    </div>

                    <div style={{marginBottom:8}}>
                      <FL>Notes</FL>
                      <TA value={job.notes || ""} onChange={(v)=>setJobs(prev=>prev.map(j=>j.id===job.id?{...j,notes:v}:j))} rows={2}/>
                      <div style={{marginTop:6}}>
                        <Btn small variant="ghost" onClick={()=>saveNotes(job.id, jobs.find(j=>j.id===job.id)?.notes || "")}>Save Notes</Btn>
                      </div>
                    </div>

                    <div style={{marginBottom:8,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
                      <button
                        type="button"
                        onClick={()=>toggleSection("description")}
                        style={{
                          width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                          border:"none",background:"#fff",padding:"10px 12px",cursor:"pointer",textAlign:"left",
                        }}
                      >
                        <span style={{fontSize:12,fontWeight:700,color:T.textSub,letterSpacing:"0.06em",textTransform:"uppercase"}}>Job Description</span>
                        <span style={{fontSize:14,color:T.textMute}}>{expandedSections.description ? "▾" : "▸"}</span>
                      </button>
                      {expandedSections.description ? (
                        <div style={{padding:"0 10px 10px",background:"#fff"}}>
                          <TA
                            value={job.description || ""}
                            onChange={(v)=>setJobs(prev=>prev.map(j=>j.id===job.id?{...j,description:v}:j))}
                            rows={4}
                            placeholder="Paste job description here if auto-scrape misses it..."
                          />
                          <div style={{marginTop:6}}>
                            <Btn small variant="ghost" onClick={()=>saveDescription(job.id, jobs.find(j=>j.id===job.id)?.description || "")}>
                              Save Description
                            </Btn>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div style={{marginBottom:8,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
                      <button
                        type="button"
                        onClick={()=>toggleSection("resume")}
                        style={{
                          width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                          border:"none",background:"#fff",padding:"10px 12px",cursor:"pointer",textAlign:"left",
                        }}
                      >
                        <span style={{fontSize:12,fontWeight:700,color:T.textSub,letterSpacing:"0.06em",textTransform:"uppercase"}}>Tailored Resume</span>
                        <span style={{fontSize:14,color:T.textMute}}>{expandedSections.resume ? "▾" : "▸"}</span>
                      </button>
                      {expandedSections.resume ? (
                        <div style={{padding:"0 10px 10px",background:"#fff"}}>
                          <div style={{fontSize:12,color:job.tailoredResume?T.textSub:T.textMute,background:T.bg,borderRadius:8,padding:"9px 10px",border:`1px solid ${T.border}`,minHeight:52,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                            {job.tailoredResume||<em>Not tailored yet.</em>}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div style={{marginBottom:10,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
                      <button
                        type="button"
                        onClick={()=>toggleSection("cover")}
                        style={{
                          width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                          border:"none",background:"#fff",padding:"10px 12px",cursor:"pointer",textAlign:"left",
                        }}
                      >
                        <span style={{fontSize:12,fontWeight:700,color:T.textSub,letterSpacing:"0.06em",textTransform:"uppercase"}}>Tailored Cover Letter</span>
                        <span style={{fontSize:14,color:T.textMute}}>{expandedSections.cover ? "▾" : "▸"}</span>
                      </button>
                      {expandedSections.cover ? (
                        <div style={{padding:"0 10px 10px",background:"#fff"}}>
                          <div style={{fontSize:12,color:job.tailoredCover?T.textSub:T.textMute,background:T.bg,borderRadius:8,padding:"9px 10px",border:`1px solid ${T.border}`,minHeight:52,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                            {job.tailoredCover||<em>Not tailored yet.</em>}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {(job.tailoredResume || job.tailoredCover) ? (
                      <div style={{marginBottom:10,display:"grid",gap:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:11,color:T.textMute,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>Export format</span>
                          <Sel
                            value={downloadFormatByJob[job.id] || "txt"}
                            onChange={(v)=>setDownloadFormat(job.id, v)}
                            options={[
                              { value: "txt", label: ".txt" },
                              { value: "docx", label: ".docx" },
                              { value: "pdf", label: ".pdf" },
                            ]}
                            style={{width:120,padding:"5px 8px",fontSize:12}}
                          />
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <Btn small variant="ghost" disabled={!job.tailoredResume} onClick={()=>downloadArtifact(job, "resume")}>
                            Download Resume
                          </Btn>
                          <Btn small variant="ghost" disabled={!job.tailoredCover} onClick={()=>downloadArtifact(job, "cover")}>
                            Download Cover
                          </Btn>
                        </div>
                      </div>
                    ) : null}

                    {job.url&&<div style={{marginBottom:10}}><a href={job.url} target="_blank" rel="noreferrer" style={{fontSize:12,fontWeight:600}}>↗ View Listing</a></div>}

                    <div style={{display:"flex",gap:8}}>
                      <Btn onClick={()=>openTailorModal(job)} disabled={!premiumActive && quota.remaining <= 0} variant="secondary" small>
                        Tailor Application
                      </Btn>
                      <Btn onClick={()=>deleteJob(job.id)} variant="danger" small>Delete</Btn>
                    </div>
                  </>
                );
              })()}
            </Card>
          </div>
        )}
      </div>

      {selectedTailorJob && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.45)",display:"grid",placeItems:"center",zIndex:50,padding:20}}>
          <div style={{width:"100%",maxWidth:680,background:"#fff",borderRadius:12,border:`1px solid ${T.border}`,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:T.text}}>Tailor Application</div>
                <div style={{fontSize:12,color:T.textSub}}>{selectedTailorJob.title} · {selectedTailorJob.company}</div>
              </div>
              <button onClick={()=>setTailorModalJobId(null)} style={{border:"none",background:"transparent",fontSize:20,cursor:"pointer",color:T.textMute}}>×</button>
            </div>

            <div style={{fontSize:12,color:T.textSub,marginBottom:12}}>
              Remaining this week: <strong style={{color:T.text}}>{premiumActive ? "Unlimited" : quota.remaining}</strong>
              {premiumActive ? null : <> / {quota.weekly_limit}</>}
              {!premiumActive && quota.resets_at ? <> · Resets {new Date(quota.resets_at).toLocaleString()}</> : null}
            </div>

            <div style={{display:"grid",gap:10}}>
              <div><FL>What excites you about this role?</FL><TA value={tailorInputs.excitement} onChange={(v)=>setTailorInputs(p=>({...p,excitement:v}))} rows={3}/></div>
              <div><FL>Relevant experience to emphasize</FL><TA value={tailorInputs.emphasis} onChange={(v)=>setTailorInputs(p=>({...p,emphasis:v}))} rows={3}/></div>
              <div><FL>Anything to avoid or de-emphasize? (optional)</FL><TA value={tailorInputs.avoid} onChange={(v)=>setTailorInputs(p=>({...p,avoid:v}))} rows={2}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><FL>Resume</FL><Sel value={tailorInputs.resumeId} onChange={(v)=>setTailorInputs(p=>({...p,resumeId:v}))} options={[{value:"",label:"Select resume"},...resumes.map(d=>({value:d.id,label:d.tag}))]}/></div>
                <div><FL>Cover letter</FL><Sel value={tailorInputs.coverId} onChange={(v)=>setTailorInputs(p=>({...p,coverId:v}))} options={[{value:"",label:"Select cover letter"},...covers.map(d=>({value:d.id,label:d.tag}))]}/></div>
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
              <Btn variant="ghost" onClick={()=>setTailorModalJobId(null)} disabled={tailorLoading}>Cancel</Btn>
              <Btn onClick={generateTailoredApplication} disabled={tailorLoading || (!premiumActive && quota.remaining <= 0)}>
                {tailorLoading ? <><Spinner color="#fff"/> Generating…</> : "Generate tailored application"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {showAddJobModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.45)",display:"grid",placeItems:"center",zIndex:50,padding:20}}>
          <div style={{width:"100%",maxWidth:620,background:"#fff",borderRadius:12,border:`1px solid ${T.border}`,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:T.text}}>Add Job by URL</div>
                <div style={{fontSize:12,color:T.textSub}}>Paste a job listing URL to create a tracker tile.</div>
              </div>
              <button onClick={()=>setShowAddJobModal(false)} style={{border:"none",background:"transparent",fontSize:20,cursor:"pointer",color:T.textMute}}>×</button>
            </div>

            <div style={{display:"grid",gap:10}}>
              <div>
                <FL>Job URL</FL>
                <AppInput
                  value={newJobUrl}
                  onChange={(v)=>setNewJobUrl(v)}
                  onBlur={() => {
                    const inferred = inferJobFromUrl(newJobUrl);
                    if (!newJobTitle && inferred.title) setNewJobTitle(inferred.title);
                    if (!newJobCompany && inferred.company) setNewJobCompany(inferred.company);
                  }}
                  placeholder="https://example.com/jobs/role"
                />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <FL>Job Title (optional)</FL>
                  <AppInput value={newJobTitle} onChange={(v)=>setNewJobTitle(v)} placeholder="e.g. Account Executive" />
                </div>
                <div>
                  <FL>Company (optional)</FL>
                  <AppInput value={newJobCompany} onChange={(v)=>setNewJobCompany(v)} placeholder="e.g. Stripe" />
                </div>
              </div>
              <div>
                <FL>Location (optional)</FL>
                <LocationAutocomplete value={newJobLocation} onChange={(v)=>setNewJobLocation(v)} placeholder="Search city, state, country" />
              </div>
              <div>
                <FL>Job Description (optional but needed for tailoring)</FL>
                <TA
                  value={newJobDescription}
                  onChange={(v)=>setNewJobDescription(v)}
                  rows={5}
                  placeholder="Paste the job description here to ensure tailoring works even if URL scrape misses it."
                />
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
              <Btn variant="ghost" onClick={()=>setShowAddJobModal(false)} disabled={addingJob}>Cancel</Btn>
              <Btn onClick={addJobFromUrl} disabled={addingJob}>
                {addingJob ? <><Spinner color="#fff"/> Adding…</> : "Add Job"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ subscription, onUpgrade, onManageBilling, billingBusy, billingError, userName }) {
  const premiumActive = isPremiumSubscription(subscription);
  const [billingCycle, setBillingCycle] = useState("monthly");
  return (
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <PH title="Settings & Billing" subtitle="Manage your account profile and subscription."/>
      <div style={{padding:"12px 28px 28px",maxWidth:980,margin:"0 auto",display:"grid",gap:12}}>
        <Card>
          <SH icon="👤" title="Account"/>
          <div style={{fontSize:13,color:T.textSub}}>Signed in as <strong style={{color:T.text}}>{userName}</strong></div>
        </Card>
        <Card>
          <SH icon="💳" title="Subscription"/>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:800,color:T.textSub,letterSpacing:"0.05em",textTransform:"uppercase"}}>Current Plan</span>
            <span style={{
              fontSize:12,fontWeight:700,padding:"4px 10px",borderRadius:999,
              background:premiumActive ? T.greenBg : T.primaryLight,
              border:`1px solid ${premiumActive ? T.greenBorder : T.primaryMid}`,
              color:premiumActive ? T.green : T.primary
            }}>
              {premiumActive ? "Premium" : "Free"}
            </span>
          </div>
          {!premiumActive ? (
            <div style={{display:"inline-flex",border:`1px solid ${T.border}`,borderRadius:999,overflow:"hidden",marginBottom:10}}>
              <button
                type="button"
                onClick={()=>setBillingCycle("monthly")}
                style={{
                  border:"none",
                  padding:"7px 12px",
                  fontSize:12,
                  fontWeight:700,
                  fontFamily:"inherit",
                  cursor:"pointer",
                  background:billingCycle==="monthly" ? T.primary : "#fff",
                  color:billingCycle==="monthly" ? "#fff" : T.textSub,
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={()=>setBillingCycle("annual")}
                style={{
                  border:"none",
                  padding:"7px 12px",
                  fontSize:12,
                  fontWeight:700,
                  fontFamily:"inherit",
                  cursor:"pointer",
                  background:billingCycle==="annual" ? T.primary : "#fff",
                  color:billingCycle==="annual" ? "#fff" : T.textSub,
                }}
              >
                Annually
              </button>
            </div>
          ) : null}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {premiumActive ? (
              <Btn onClick={onManageBilling} disabled={billingBusy}>{billingBusy ? "Working..." : "Manage billing"}</Btn>
            ) : (
              <Btn onClick={()=>onUpgrade(billingCycle)} disabled={billingBusy}>
                {billingBusy ? "Working..." : `Upgrade to Premium (${billingCycle === "annual" ? "Annually" : "Monthly"})`}
              </Btn>
            )}
          </div>
          {billingError ? <div style={{marginTop:8,fontSize:12,color:T.red}}>{billingError}</div> : null}
        </Card>
        <Card>
          <SH icon="🛟" title="Support"/>
          <div style={{fontSize:13,color:T.textSub,marginBottom:10}}>Need help with billing or account access?</div>
          <a href={`mailto:${FEEDBACK_EMAIL}`} style={{fontSize:13,fontWeight:700,color:T.primary}}>Contact support</a>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR + APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function AppShell({
  docs,setDocs,jobs,setJobs,userName,onLogout,profile,setProfileState,
  subscription,onUpgrade,onManageBilling,billingBusy,billingError,
}){
  const [active,setActive]=useState("profile");
  const nav=[
    {id:"profile",   icon:"👤", label:"Profile"},
    {id:"suggested", icon:"🧭", label:"Suggested Jobs", disabled:true},
    {id:"search",    icon:"🔍", label:"Job Search"},
    {id:"tracker",   icon:"📊", label:"Tracker"},
    {id:"settings",  icon:"⚙️", label:"Settings"},
  ];

  const views={
    profile:   <ProfileView   docs={docs} setDocs={setDocs} profile={profile} setProfileState={setProfileState}/>,
    suggested: <SuggestedView />,
    search:    <SearchView    jobs={jobs} setJobs={setJobs} profile={profile} onNavigate={setActive}/>,
    tracker:   <TrackerView   jobs={jobs} setJobs={setJobs} docs={docs} subscription={subscription} onNavigate={setActive}/>,
    settings:  <SettingsView  subscription={subscription} onUpgrade={onUpgrade} onManageBilling={onManageBilling} billingBusy={billingBusy} billingError={billingError} userName={userName} />,
  };
  const activeMeta = nav.find((n)=>n.id===active) || nav[0];

  return(
    <div style={{display:"flex",minHeight:"100vh",background:"var(--bg)"}}>
      <aside style={{width:280,background:T.surface,borderRight:"1px solid var(--border-light)",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"28px 24px 20px",borderBottom:"1px solid var(--border-light)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:11,background:"linear-gradient(135deg, var(--accent), #818CF8)",display:"grid",placeItems:"center",fontFamily:"Sora, DM Sans, sans-serif",fontSize:18,fontWeight:700,color:"#fff",boxShadow:"0 4px 12px -2px rgba(99, 102, 241, 0.25)"}}>
              J
            </div>
            <div style={{fontFamily:"Sora, DM Sans, sans-serif",fontSize:17,fontWeight:600,color:T.text}}>Applyify</div>
          </div>
        </div>
        <nav style={{display:"flex",flexDirection:"column",gap:6,padding:"22px 14px",flex:1,overflowY:"auto"}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>{ if(!n.disabled) setActive(n.id); }} title={n.disabled ? "Coming soon" : n.label} style={{
              display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,border:"none",
              cursor:n.disabled?"not-allowed":"pointer",width:"100%",background:active===n.id?"linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(129, 140, 248, 0.06))":"transparent",
              color:n.disabled?T.textMute:(active===n.id?T.primary:T.textSub),fontFamily:"inherit",fontSize:14,
              fontWeight:active===n.id?650:540,transition:"all 0.15s",textAlign:"left",position:"relative"
            }} disabled={n.disabled}>
              {active===n.id ? <span style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:T.primary,borderRadius:"0 2px 2px 0"}}/> : null}
              <span style={{fontSize:16,opacity:active===n.id?1:0.75}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.disabled && <span style={{fontSize:10,fontWeight:700,color:T.textMute,background:"#F8FAFC",border:`1px solid ${T.border}`,padding:"2px 7px",borderRadius:8}}>Soon</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:"16px 20px 20px",borderTop:"1px solid var(--border-light)"}}>
          <div style={{background:"linear-gradient(135deg, var(--primary), var(--primary-light))",padding:16,borderRadius:12,color:"#fff",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,opacity:0.75,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:5}}>Plan</div>
            <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>{isPremiumSubscription(subscription) ? "Premium Active" : "Free Plan"}</div>
            <button
              onClick={isPremiumSubscription(subscription) ? ()=>onManageBilling() : ()=>setActive("settings")}
              disabled={billingBusy}
              style={{
                width:"100%",padding:"9px 10px",background:"rgba(255,255,255,0.16)",border:"1px solid rgba(255,255,255,0.24)",
                color:"#fff",borderRadius:8,fontSize:12,fontWeight:600,cursor:billingBusy?"not-allowed":"pointer",fontFamily:"inherit"
              }}
            >
              {billingBusy ? "Working..." : isPremiumSubscription(subscription) ? "Manage Subscription" : "Choose Premium Plan"}
            </button>
          </div>
          {billingError ? (
            <div style={{fontSize:11,color:T.red,padding:"0 6px 8px",lineHeight:1.4}}>{billingError}</div>
          ) : null}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 6px 0"}}>
            <div style={{fontSize:12,color:T.textMute,fontWeight:600,maxWidth:170,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userName}</div>
            <button onClick={onLogout} style={{border:"none",background:"transparent",color:T.textMute,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,height:"100vh"}}>
        <header style={{background:T.surface,borderBottom:"1px solid var(--border-light)",padding:"16px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:40}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,fontFamily:"Sora, DM Sans, sans-serif"}}>{activeMeta.label}</div>
            <div style={{fontSize:12,color:T.textSub}}>All core setup complete</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.textMute,border:`1px solid ${T.border}`,borderRadius:999,padding:"4px 10px"}}>
              {isPremiumSubscription(subscription) ? "Premium" : "Free"}
            </span>
          </div>
        </header>
        <div style={{flex:1,overflow:"hidden",background:"radial-gradient(circle at 0% 0%, #FFFFFF 0%, var(--bg) 55%)"}}>
          {views[active]}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [loggedIn,setLoggedIn]=useState(false);
  const [bootstrappingAuth,setBootstrappingAuth]=useState(true);
  const [userName,setUserName]=useState("");
  const [userId,setUserId]=useState("");
  const [docs,setDocs]=useState([]);
  const [jobs,setJobs]=useState([]);
  const [profile,setProfileState]=useState({ name: "" });
  const [subscription,setSubscription]=useState(null);
  const [billingBusy,setBillingBusy]=useState(false);
  const [billingError,setBillingError]=useState("");

  // Load data from Supabase after login
  async function loadData(){
    try{
      const [d,j,p,s]=await Promise.all([
        store.getDocs(),
        store.getJobs(),
        store.getProfile(),
        store.getSubscription(),
      ]);
      setDocs(d||[]);
      setJobs(j||[]);
      setProfileState((prev) => ({
        ...prev,
        ...(p || {}),
      }));
      setSubscription(s || null);
    }catch(e){console.error("Error loading data:",e);}
  }

  async function handleUpgradeCheckout(billingCycle = "monthly") {
    setBillingBusy(true);
    setBillingError("");
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Your session expired. Please sign in again.");
      }
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { billingCycle },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Checkout URL was not returned.");
      window.location.assign(data.url);
    } catch (e) {
      setBillingError(e?.message || "Could not start checkout.");
      setBillingBusy(false);
    }
  }

  async function handleManageBilling() {
    setBillingBusy(true);
    setBillingError("");
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Your session expired. Please sign in again.");
      }
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Billing portal URL was not returned.");
      window.location.assign(data.url);
    } catch (e) {
      setBillingError(e?.message || "Could not open billing portal.");
      setBillingBusy(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (mounted && data.user) {
          const displayName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email?.split("@")[0] ||
            "";

          setUserName(displayName);
          setUserId(data.user.id);
          setProfileState((prev) => ({ ...prev, name: prev.name || displayName || "" }));
          setLoggedIn(true);
          await loadData();
        }
      } catch (e) {
        console.error("Error restoring auth session:", e);
      } finally {
        if (mounted) setBootstrappingAuth(false);
      }
    }

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error signing out:", e);
    } finally {
      setDocs([]);
      setJobs([]);
      setProfileState({ name: "" });
      setSubscription(null);
      setUserId("");
      setUserName("");
      setLoggedIn(false);
      setBootstrappingAuth(false);
    }
  }

  if (bootstrappingAuth) {
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:T.bg,color:T.textSub,fontFamily:"DM Sans, system-ui, sans-serif"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,fontSize:14,fontWeight:600}}>
          <Spinner /> Loading your workspace...
        </div>
      </div>
    );
  }

  if(!loggedIn){
    return(
      <>
        <LandingPage onLogin={async (name, id)=>{
          setUserName(name);
          setUserId(id || "");
          setProfileState((prev) => ({ ...prev, name: name || prev.name || "" }));
          setLoggedIn(true);
          await loadData();
        }}/>
      </>
    );
  }

  return(
    <>
      <AppShell docs={docs} setDocs={setDocs} jobs={jobs} setJobs={setJobs}
        userName={userName}
        onLogout={handleLogout}
        profile={profile}
        setProfileState={setProfileState}
        subscription={subscription}
        onUpgrade={handleUpgradeCheckout}
        onManageBilling={handleManageBilling}
        billingBusy={billingBusy}
        billingError={billingError}
      />
    </>
  );
}
