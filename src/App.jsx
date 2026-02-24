import { useEffect, useMemo, useState, useRef } from "react";
import { Document as DocxDocument, Packer as DocxPacker, Paragraph as DocxParagraph, TextRun as DocxTextRun } from "docx";
import { jsPDF } from "jspdf";
import { getSupabaseClient } from "./supabase";


// ═══════════════════════════════════════════════════════════════════════════════
// APP THEME
// ═══════════════════════════════════════════════════════════════════════════════
const T = {
  bg: "#F7F9FC", surface: "#FFFFFF",
  border: "#E2E8F0", borderFocus: "#3B6FE8",
  primary: "#3B6FE8", primaryDark: "#2854C5",
  primaryLight: "#EEF3FD", primaryMid: "#C7D8FA",
  text: "#1A1F2E", textSub: "#5A6480", textMute: "#9AA3BA",
  green: "#16A34A", greenBg: "#F0FDF4", greenBorder: "#BBF7D0",
  amber: "#B45309", amberBg: "#FFFBEB", amberBorder: "#FDE68A",
  red: "#DC2626", redBg: "#FEF2F2", redBorder: "#FECACA",
  teal: "#0D7490", tealBg: "#F0FDFF", teasamelBorder: "#A5F3FC",
  violet: "#7C3AED", violetBg: "#F5F3FF", violetBorder: "#DDD6FE",
};

const STATUS_META = {
  saved:     { color: T.primary, bg: T.primaryLight, border: T.primaryMid,    label: "Saved"     },
  tailored:  { color: T.violet,  bg: T.violetBg,     border: T.violetBorder,  label: "Tailored Jobs" },
  applied:   { color: T.teal,    bg: T.tealBg,       border: T.tealBorder,    label: "Applied"   },
  interview: { color: T.amber,   bg: T.amberBg,      border: T.amberBorder,   label: "Interview" },
  offer:     { color: T.green,   bg: T.greenBg,      border: T.greenBorder,   label: "Offer"     },
  rejected:  { color: T.red,     bg: T.redBg,        border: T.redBorder,     label: "Rejected"  },
};
const STATUS_OPTIONS = ["saved","tailored","applied","interview","offer","rejected"];
const FEEDBACK_EMAIL = "feedback@jobassistant.app";
const WEEKLY_TAILOR_LIMIT = 7;
const TAILORED_FILE_FORMATS = [
  { value: "txt", label: ".txt" },
  { value: "docx", label: ".docx" },
  { value: "pdf", label: ".pdf" },
];
const LOCATION_OPTIONS = [
  "Remote",
  "Hybrid",
  "On-site",
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

async function searchJobsByKeyword(query) {
  const requestBody = { query, page: 1, numPages: 1, country: "us,ca", datePosted: "all" };
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!anonKey) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY.");
  }

  if (!session?.access_token) {
    throw new Error("No active session. Please log in again.");
  }

  // Send explicit headers so the gateway always sees both credentials.
  const { data, error } = await supabase.functions.invoke("job-search", {
    body: requestBody,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw new Error(error.message || "Job search function failed.");

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
  
  return (
    <div style={{ minHeight:"100vh", background:"#F5F7FB", padding:"32px 20px" }}>
      <main style={{ maxWidth:980, margin:"0 auto", display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:24 }}>
        <section style={{ background:"#fff", border:"1px solid #DDE3EE", borderRadius:12, padding:28 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#5C6B8A", marginBottom:12 }}>EARLY TOOL · MVP</div>
          <h1 style={{ fontSize:34, lineHeight:1.2, margin:"0 0 10px", color:"#0F172A" }}>
            Track jobs and tailor applications faster.
          </h1>
          <p style={{ fontSize:15, lineHeight:1.6, color:"#475569", margin:"0 0 16px" }}>
            Built for active job seekers who want a simple tracker plus practical AI tailoring in one place.
          </p>
          <ul style={{ margin:"0 0 18px 18px", color:"#334155", lineHeight:1.8, fontSize:14 }}>
            <li>Save jobs from one search flow and keep statuses updated.</li>
            <li>Generate tailored application content from your own documents.</li>
            <li>Weekly limits keep usage predictable while we improve reliability.</li>
          </ul>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <button onClick={()=>setIsLogin(true)} style={{ background:"#2457D6", color:"#fff", border:"none", borderRadius:8, padding:"10px 14px", fontWeight:700, cursor:"pointer" }}>
              Start tracking jobs
            </button>
            <a href={`mailto:${FEEDBACK_EMAIL}`} style={{ display:"inline-flex", alignItems:"center", padding:"10px 14px", border:"1px solid #D0D7E2", borderRadius:8, color:"#334155", textDecoration:"none", fontWeight:600 }}>
              Send feedback
            </a>
          </div>
        </section>

        <section style={{ background:"#fff", border:"1px solid #DDE3EE", borderRadius:12, padding:24 }}>
          <h2 style={{ fontSize:20, margin:"0 0 6px", color:"#0F172A" }}>
            {isLogin ? "Sign in" : "Create account"}
          </h2>
          <p style={{ fontSize:13, color:"#64748B", margin:"0 0 16px" }}>
            {isLogin ? "Continue where you left off." : "Create an account to start tracking."}
          </p>

          {error && (
            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8,
              padding:"10px 12px", marginBottom:14, fontSize:13, color:"#DC2626" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#475569", marginBottom:6 }}>Full Name</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)}
                  placeholder="Jane Smith" required style={inputStyle}/>
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#475569", marginBottom:6 }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle}/>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#475569", marginBottom:6 }}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="At least 6 characters" required minLength={6} style={inputStyle}/>
            </div>

            <button type="submit" disabled={loading} style={{
              width:"100%", background:loading?"#94A3B8":"#2457D6", color:"#fff", border:"none", borderRadius:8,
              padding:"10px 12px", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit"
            }}>
              {loading ? "Please wait..." : (isLogin ? "Try the tool" : "Create account")}
            </button>
          </form>

          <div style={{ marginTop:12, fontSize:12, color:"#64748B" }}>
            {isLogin ? "No account yet? " : "Already have an account? "}
            <button onClick={()=>{setIsLogin(!isLogin);setError("");}} style={{
              background:"none", border:"none", color:"#2457D6", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit", padding:0
            }}>
              {isLogin ? "Create one" : "Sign in"}
            </button>
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

const sanitizeFilePart = (value) =>
  (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "document";

const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const buildTailoredDocuments = (job, payload, selectedFormats) => {
  const createdAt = new Date().toISOString();
  const titlePart = sanitizeFilePart(job.title);
  const companyPart = sanitizeFilePart(job.company);
  const docs = [];

  const sources = [
    { type: "resume", label: "Resume", content: payload.tailored_resume_text || payload.tailored_resume_summary || "" },
    { type: "cover_letter", label: "Cover Letter", content: payload.tailored_cover_letter || "" },
  ];

  sources.forEach((source) => {
    const content = source.content.trim();
    if (!content) return;
    selectedFormats.forEach((format) => {
      docs.push({
        id: crypto.randomUUID(),
        type: source.type,
        format,
        fileName: `${titlePart}-${companyPart}-${source.type}.${format}`,
        content,
        createdAt,
      });
    });
  });

  return docs;
};

const downloadTailoredDocument = async (doc) => {
  if (!doc?.content || !doc?.fileName) return;
  const text = doc.content;

  if (doc.format === "txt") {
    triggerBlobDownload(new Blob([text], { type: "text/plain;charset=utf-8" }), doc.fileName);
    return;
  }

  if (doc.format === "docx") {
    const document = new DocxDocument({
      sections: [
        {
          children: text.split(/\n+/).map((line) => new DocxParagraph({
            children: [new DocxTextRun(line)],
          })),
        },
      ],
    });
    const blob = await DocxPacker.toBlob(document);
    triggerBlobDownload(blob, doc.fileName);
    return;
  }

  if (doc.format === "pdf") {
    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 48;
    const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const lines = pdf.splitTextToSize(text, maxWidth);
    const lineHeight = 16;
    let y = margin;

    lines.forEach((line) => {
      if (y > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    });

    triggerBlobDownload(pdf.output("blob"), doc.fileName);
  }
};

const normalizeDoc = (doc) => ({
  ...doc,
  createdAt: doc.createdAt || doc.created_at || null,
});

const normalizeJob = (job) => ({
  ...job,
  savedAt: job.savedAt || job.saved_at || job.created_at || null,
  keywords: Array.isArray(job.keywords) ? job.keywords : [],
  tailoredDocuments: Array.isArray(job.tailoredDocuments) ? job.tailoredDocuments : [],
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
const needsOnboarding = (profile) => !((profile?.location || "").trim() && (profile?.targetTitle || "").trim());

async function getAuthContext() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("You are not logged in");
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
    return data;
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
    const base = [
      { label: "Remote", value: "Remote" },
      { label: "Hybrid", value: "Hybrid" },
      { label: "On-site", value: "On-site" },
      ...LOCATION_CATALOG.map((loc) => {
        const region = loc.region ? `, ${loc.region}` : "";
        return {
          label: `${loc.city}${region}, ${loc.country}`,
          value: `${loc.city}${region}, ${loc.country}`,
        };
      }),
    ];
    const unique = Array.from(new Map(base.map((x) => [x.value, x])).values());
    if (!q) return unique.slice(0, 8);
    return unique.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 10);
  }, [q]);

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
  const titleOptions = TITLE_OPTIONS.includes(profile.targetTitle)
    ? TITLE_OPTIONS
    : profile.targetTitle
      ? [profile.targetTitle, ...TITLE_OPTIONS]
      : TITLE_OPTIONS;

  const renderField=(lbl,k,ph,type="text")=>(
    <div style={{marginBottom:14}}>
      <FL>{lbl}</FL>
      <AppInput value={profile[k]||""} onChange={v=>up(k,v)} placeholder={ph} type={type}/>
    </div>
  );
  const resumes=docs.filter(d=>d.type==="resume"); const covers=docs.filter(d=>d.type==="cover_letter");

  return(
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <div style={{padding:"28px 32px",maxWidth:920,margin:"0 auto"}}>
        <div style={{marginBottom:22}}>
          <h1 style={{margin:0,fontSize:21,fontWeight:800,color:T.text,letterSpacing:"-0.3px"}}>Profile</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:T.textSub}}>Personal info, job preferences, and documents</p>
        </div>

        {profileError&&<div style={{fontSize:13,color:T.red,background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:14}}>{profileError}</div>}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18,marginBottom:18}}>
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
              <Sel
                value={profile.targetTitle || ""}
                onChange={(v)=>up("targetTitle",v)}
                options={[
                  { value: "", label: "Select target title" },
                  ...titleOptions.map((opt)=>({ value: opt, label: opt })),
                ]}
              />
            </div>
            {renderField("Preferred Location(s)","targetLocation","Remote, NYC, London")}
            {renderField("Seniority Level","seniority","Senior, Mid-level, Entry")}
            {renderField("Industries","industry","SaaS, Fintech, Healthcare")}
            <div style={{marginBottom:14}}><FL>Keywords to Highlight</FL>
              <TA value={profile.keywords||""} onChange={v=>up("keywords",v)} placeholder="agile, roadmap, SQL..." rows={2}/>
            </div>
          </Card>
        </div>

        <Card style={{marginBottom:18}}>
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

        <div style={{marginBottom:24}}>
          <Btn onClick={save} variant={savedMsg?"success":"primary"} disabled={savingProfile}>
            {savingProfile ? <><Spinner color="#fff"/> Saving…</> : savedMsg ? `✓ ${savedMsg}` : "Save All Preferences"}
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
function SearchView({jobs,setJobs,profile}){
  const [query,setQuery]=useState("");
  const [searchLocation,setSearchLocation]=useState(profile?.targetLocation || profile?.location || "");
  const [remoteOnly,setRemoteOnly]=useState(false);
  const [datePosted,setDatePosted]=useState("all");
  const [results,setResults]=useState([]);
  const [selectedJobIdx,setSelectedJobIdx]=useState(0);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [savingJobKey,setSavingJobKey]=useState("");
  const profileTitle = (profile?.targetTitle || "").trim();
  const profileKeywords = (profile?.keywords || "").trim();
  const profileCompanies = (profile?.targetCompanies || "").trim();
  const savedJobKeys = useMemo(
    () => new Set(jobs.map((j) => `${j.title || ""}::${j.company || ""}`)),
    [jobs]
  );
  const selectedJob = results[selectedJobIdx] || null;

  useEffect(() => {
    if (!query && profileTitle) {
      setQuery(profileTitle);
    }
  }, [query, profileTitle]);

  useEffect(() => {
    if (!searchLocation && (profile?.targetLocation || profile?.location)) {
      setSearchLocation(profile.targetLocation || profile.location);
    }
  }, [profile, searchLocation]);

  async function search(){
    const baseQuery = query.trim() || profileTitle;
    if(!baseQuery){
      setError("Enter a keyword or set a target title in Profile.");
      return;
    }
    const parts = [baseQuery];
    if (searchLocation?.trim()) parts.push(searchLocation.trim());
    if (remoteOnly) parts.push("remote");
    if (datePosted !== "all") parts.push(`posted ${datePosted}`);
    if (profileKeywords) parts.push(profileKeywords);
    if (profile?.useCompanyPrefs && profileCompanies) parts.push(profileCompanies);
    const finalQuery = parts.join(", ");

    setLoading(true);setError("");setResults([]);
    try{
      const jobsFromApi = await searchJobsByKeyword(finalQuery);
      setResults(jobsFromApi);
      setSelectedJobIdx(0);
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
        tailoredDocuments: [],
      });
      setJobs(prev=>[saved,...prev]);
    }catch(e){setError(`Error saving job: ${e.message}`);}
    finally{setSavingJobKey("");}
  }

  return(
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <PH title="Job Search" subtitle="LinkedIn-style search flow: search, filter, pick a role, then save."/>
      <div style={{padding:"16px 24px 24px",maxWidth:1240,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr auto",gap:10,marginBottom:10}}>
          <AppInput value={query} onChange={setQuery} placeholder='e.g. customer success, account manager, frontend engineer'
            onKeyDown={(e)=>{ if(e.key==="Enter" && !loading){ search(); } }}/>
          <LocationAutocomplete value={searchLocation} onChange={setSearchLocation} placeholder="Location" compact />
          <Btn onClick={search} disabled={loading} style={{height:40,padding:"0 20px"}}>
            {loading?<><Spinner color="#fff"/> Searching…</>:"Search"}
          </Btn>
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
          <button onClick={()=>setRemoteOnly(v=>!v)} style={{
            border:`1px solid ${remoteOnly ? "#0F766E" : T.border}`,
            background:remoteOnly ? "#0F766E" : "#fff",
            color:remoteOnly ? "#fff" : T.text,
            borderRadius:999,padding:"7px 14px",fontSize:13,fontWeight:700,cursor:"pointer"
          }}>Remote {remoteOnly ? "✓" : ""}</button>
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

        {error&&<div style={{fontSize:13,color:T.red,background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:12}}>{error}</div>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:12,minHeight:520}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:"#1865B7",color:"#fff"}}>
              <div style={{fontSize:14,fontWeight:700}}>{query || profileTitle || "Search"} in {searchLocation || "Any location"}</div>
              <div style={{fontSize:12,opacity:0.9}}>{results.length} result{results.length===1?"":"s"}</div>
            </div>
            <div style={{maxHeight:560,overflowY:"auto"}}>
              {results.length===0 && (
                <div style={{padding:20,fontSize:13,color:T.textSub}}>Run a search to see job matches.</div>
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
                  <div style={{fontSize:14,color:T.textSub,marginBottom:8}}>{selectedJob.company}</div>
                  <h2 style={{margin:"0 0 8px",fontSize:42,lineHeight:1.05,color:T.text,letterSpacing:"-0.7px"}}>{selectedJob.title}</h2>
                  <div style={{fontSize:16,color:T.textSub,marginBottom:12}}>{selectedJob.location}</div>
                  <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                    <Chip label={remoteOnly ? "Remote" : "Open"} color={T.teal} />
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
function TrackerView({jobs,setJobs,docs}){
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
  const [tailorFormats,setTailorFormats]=useState({
    txt: true,
    docx: true,
    pdf: false,
  });
  const [tailorLoading,setTailorLoading]=useState(false);
  const [quota,setQuota]=useState({ weekly_limit: WEEKLY_TAILOR_LIMIT, used: 0, remaining: WEEKLY_TAILOR_LIMIT, resets_at: null });

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

  function toggleTailorFormat(format) {
    setTailorFormats((prev) => ({ ...prev, [format]: !prev[format] }));
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
      setTrackerErr("This job has no description. Add one from Job Search before tailoring.");
      return;
    }
    if (quota.remaining <= 0) {
      setTrackerErr("Weekly tailoring limit reached. Please wait for reset.");
      return;
    }
    const selectedFormats = TAILORED_FILE_FORMATS
      .map((f) => f.value)
      .filter((format) => tailorFormats[format]);
    if (selectedFormats.length === 0) {
      setTrackerErr("Select at least one tailored document format.");
      return;
    }

    setTailorLoading(true);
    setTrackerErr("");
    try {
      const updatedQuota = await store.consumeTailoringUse(selectedTailorJob.id);
      setQuota(updatedQuota);

      const raw = await callClaude(
        "You are an expert resume writer. Return only valid JSON with keys: tailored_resume_text, tailored_cover_letter, keyword_alignment (array), skills_match_summary, match_score. tailored_resume_text must be a full resume draft (not a summary) that preserves the source resume structure and section order as closely as possible, including headings, job entries, and bullet style. Keep output factual and concise. No markdown code fences.",
        `Job Description:\n${selectedTailorJob.description}\n\nSource Resume (preserve structure):\n${resume?.content || "(not provided)"}\n\nSource Cover Letter:\n${cover?.content || "(not provided)"}\n\nCandidate notes:\n- Excitement: ${tailorInputs.excitement}\n- Emphasize: ${tailorInputs.emphasis}\n- De-emphasize: ${tailorInputs.avoid || "None"}`
      );
      let data;
      try {
        data = JSON.parse(raw.replace(/```json|```/g,"").trim());
      } catch {
        throw new Error("AI response format error. Please try again.");
      }
      const updates = {
        tailoredResume: data.tailored_resume_text || data.tailored_resume_summary || "",
        tailoredCover: data.tailored_cover_letter || "",
        keywords: Array.isArray(data.keyword_alignment) ? data.keyword_alignment : [],
        matchScore: Number.isFinite(data.match_score) ? data.match_score : null,
        resumeDocId: resume?.id || null,
        coverDocId: cover?.id || null,
        tailoredDocuments: buildTailoredDocuments(selectedTailorJob, data, selectedFormats),
        status: "tailored",
      };
      const dbRow = await store.updateJob(selectedTailorJob.id, updates);
      setJobs((prev) => prev.map((j) => (j.id === selectedTailorJob.id ? { ...j, ...dbRow } : j)));
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
      <PH title="Application Tracker" subtitle={`${jobs.length} application${jobs.length!==1?"s":""} tracked`}
        action={<Btn onClick={()=>exportCSV(jobs,docs)} variant="ghost">↓ Export CSV</Btn>}/>

      <div style={{padding:"14px 32px 0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",flexShrink:0,maxWidth:1180,margin:"0 auto",width:"100%"}}>
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
        <div style={{padding:"10px 32px 0",maxWidth:1180,margin:"0 auto",width:"100%"}}>
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

      <div style={{padding:"10px 32px 0",maxWidth:1180,margin:"0 auto",width:"100%"}}>
        <div style={{fontSize:12,color:T.textSub}}>
          Tailoring remaining this week: <strong style={{color:T.text}}>{quota.remaining ?? 0}</strong> / {quota.weekly_limit || WEEKLY_TAILOR_LIMIT}
          {quota.resets_at ? <> · Resets {new Date(quota.resets_at).toLocaleString()}</> : null}
        </div>
      </div>

      <div style={{flex:1,overflow:"auto",padding:"12px 32px 24px",maxWidth:1180,margin:"0 auto",width:"100%"}}>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"60px 0",color:T.textMute}}>
            <div style={{fontSize:36,marginBottom:10}}>📭</div>
            <div style={{fontSize:14,color:T.textSub,fontWeight:600,marginBottom:4}}>No applications here</div>
            <div style={{fontSize:13}}>Save jobs from Job Search or Suggested Roles to start tracking.</div>
          </div>
        )}
        {filtered.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
            {filtered.map((job)=>{
              const m=STATUS_META[job.status]||STATUS_META.saved;
              const tailoredDocs = Array.isArray(job.tailoredDocuments) ? job.tailoredDocuments : [];
              return(
                <Card key={job.id}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:750,color:T.text}}>{job.title||"—"}</div>
                      <div style={{fontSize:13,color:T.primary,fontWeight:600,marginTop:2}}>{job.company||"—"}</div>
                      <div style={{fontSize:12,color:T.textMute,marginTop:2}}>{job.location||"—"} · {formatDate(job.savedAt || job.created_at)}</div>
                    </div>
                    <Sel value={job.status} onChange={v=>updateStatus(job.id,v)}
                      options={STATUS_OPTIONS.map(s=>({value:s,label:STATUS_META[s].label}))}
                      style={{padding:"4px 8px",fontSize:12,color:m.color,background:m.bg,border:`1px solid ${m.border}`,borderRadius:20,minWidth:120}}/>
                  </div>

                  <div style={{marginBottom:8}}>
                    <FL>Notes</FL>
                    <TA value={job.notes || ""} onChange={(v)=>setJobs(prev=>prev.map(j=>j.id===job.id?{...j,notes:v}:j))} rows={2}/>
                    <div style={{marginTop:6}}>
                      <Btn small variant="ghost" onClick={()=>saveNotes(job.id, jobs.find(j=>j.id===job.id)?.notes || "")}>Save Notes</Btn>
                    </div>
                  </div>

                  <div style={{marginBottom:10}}>
                    <FL>Tailored Resume</FL>
                    <div style={{fontSize:12,color:job.tailoredResume?T.textSub:T.textMute,background:T.bg,borderRadius:8,padding:"9px 10px",border:`1px solid ${T.border}`,minHeight:52,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                      {job.tailoredResume||<em>Not tailored yet.</em>}
                    </div>
                  </div>

                  <div style={{marginBottom:10}}>
                    <FL>Tailored Documents</FL>
                    {tailoredDocs.length === 0 ? (
                      <div style={{fontSize:12,color:T.textMute,background:T.bg,borderRadius:8,padding:"9px 10px",border:`1px solid ${T.border}`}}>
                        No tailored documents attached yet.
                      </div>
                    ) : (
                      <div style={{display:"grid",gap:6}}>
                        {tailoredDocs.map((doc) => (
                          <div key={doc.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:T.bg,borderRadius:8,padding:"8px 10px",border:`1px solid ${T.border}`}}>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:T.text}}>{doc.fileName}</div>
                              <div style={{fontSize:11,color:T.textMute}}>
                                {(doc.type || "document").replace("_", " ")} · {formatDate(doc.createdAt)}
                              </div>
                            </div>
                            <Btn small variant="ghost" onClick={() => { downloadTailoredDocument(doc).catch(() => setTrackerErr("Could not generate download file.")); }}>
                              Download
                            </Btn>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {job.url&&<div style={{marginBottom:10}}><a href={job.url} target="_blank" rel="noreferrer" style={{fontSize:12,fontWeight:600}}>↗ View Listing</a></div>}

                  <div style={{display:"flex",gap:8}}>
                    <Btn onClick={()=>openTailorModal(job)} disabled={quota.remaining <= 0} variant="secondary" small>
                      Tailor Application
                    </Btn>
                    <Btn onClick={()=>deleteJob(job.id)} variant="danger" small>Delete</Btn>
                  </div>
                </Card>
              );
            })}
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
              Remaining this week: <strong style={{color:T.text}}>{quota.remaining}</strong> / {quota.weekly_limit}
              {quota.resets_at ? <> · Resets {new Date(quota.resets_at).toLocaleString()}</> : null}
            </div>

            <div style={{display:"grid",gap:10}}>
              <div><FL>What excites you about this role?</FL><TA value={tailorInputs.excitement} onChange={(v)=>setTailorInputs(p=>({...p,excitement:v}))} rows={3}/></div>
              <div><FL>Relevant experience to emphasize</FL><TA value={tailorInputs.emphasis} onChange={(v)=>setTailorInputs(p=>({...p,emphasis:v}))} rows={3}/></div>
              <div><FL>Anything to avoid or de-emphasize? (optional)</FL><TA value={tailorInputs.avoid} onChange={(v)=>setTailorInputs(p=>({...p,avoid:v}))} rows={2}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><FL>Resume</FL><Sel value={tailorInputs.resumeId} onChange={(v)=>setTailorInputs(p=>({...p,resumeId:v}))} options={[{value:"",label:"Select resume"},...resumes.map(d=>({value:d.id,label:d.tag}))]}/></div>
                <div><FL>Cover letter</FL><Sel value={tailorInputs.coverId} onChange={(v)=>setTailorInputs(p=>({...p,coverId:v}))} options={[{value:"",label:"Select cover letter"},...covers.map(d=>({value:d.id,label:d.tag}))]}/></div>
              </div>
              <div>
                <FL>Tailored document formats</FL>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {TAILORED_FILE_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => toggleTailorFormat(f.value)}
                      style={{
                        border:`1px solid ${tailorFormats[f.value] ? T.primaryMid : T.border}`,
                        background:tailorFormats[f.value] ? T.primaryLight : "#fff",
                        color:tailorFormats[f.value] ? T.primary : T.textSub,
                        borderRadius:999,
                        padding:"6px 10px",
                        fontSize:12,
                        fontWeight:700,
                        cursor:"pointer",
                      }}
                    >
                      {tailorFormats[f.value] ? "✓ " : ""}{f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
              <Btn variant="ghost" onClick={()=>setTailorModalJobId(null)} disabled={tailorLoading}>Cancel</Btn>
              <Btn onClick={generateTailoredApplication} disabled={tailorLoading || quota.remaining <= 0}>
                {tailorLoading ? <><Spinner color="#fff"/> Generating…</> : "Generate tailored application"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR + APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function AppShell({
  docs,setDocs,jobs,setJobs,userName,onLogout,profile,setProfileState,
}){
  const [active,setActive]=useState("profile");
  const nav=[
    {id:"profile",   icon:"👤", label:"Profile"},
    {id:"suggested", icon:"🧭", label:"Suggested Jobs", disabled:true},
    {id:"search",    icon:"🔍", label:"Job Search"},
    {id:"tracker",   icon:"📊", label:"Tracker"},
  ];

  const views={
    profile:   <ProfileView   docs={docs} setDocs={setDocs} profile={profile} setProfileState={setProfileState}/>,
    suggested: <SuggestedView />,
    search:    <SearchView    jobs={jobs} setJobs={setJobs} profile={profile}/>,
    tracker:   <TrackerView   jobs={jobs} setJobs={setJobs} docs={docs}/>,
  };

  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
      <aside style={{width:224,background:`linear-gradient(180deg,${T.surface} 0%,#F8FAFF 100%)`,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,padding:"18px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 10px 16px",marginBottom:8,borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:32,height:32,borderRadius:10,flexShrink:0,background:`linear-gradient(135deg,${T.primary},#0891b2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",boxShadow:"0 10px 18px rgba(59,111,232,0.28)"}}>J</div>
          <div style={{fontSize:13,fontWeight:800,color:T.text,lineHeight:1.2,letterSpacing:"0.01em"}}>Job<br/>Assistant</div>
        </div>
        <nav style={{display:"flex",flexDirection:"column",gap:4,marginTop:6,flex:1}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>{ if(!n.disabled) setActive(n.id); }} style={{
              display:"flex",alignItems:"center",gap:10,padding:"10px 11px",borderRadius:10,border:"none",
              cursor:n.disabled?"not-allowed":"pointer",width:"100%",background:active===n.id?T.primaryLight:"transparent",
              color:n.disabled?T.textMute:(active===n.id?T.primary:T.textSub),fontFamily:"inherit",fontSize:13,
              fontWeight:active===n.id?700:560,transition:"all 0.12s",textAlign:"left"
            }} disabled={n.disabled}>
              <span style={{fontSize:15,flexShrink:0,width:22,height:22,display:"grid",placeItems:"center",background:active===n.id?"#FFFFFF":"transparent",borderRadius:7,border:active===n.id?`1px solid ${T.primaryMid}`:"1px solid transparent"}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.disabled && <span style={{fontSize:10,fontWeight:700,color:T.textMute}}>Coming Soon</span>}
              {active===n.id&&<div style={{width:6,height:6,borderRadius:"50%",background:T.primary,flexShrink:0}}/>}
            </button>
          ))}
        </nav>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12,marginTop:6}}>
          <div style={{fontSize:12,color:T.textSub,padding:"5px 10px 9px",fontWeight:600}}>
            Signed in as {userName}
          </div>
          <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,border:"none",cursor:"pointer",width:"100%",background:"transparent",color:T.textMute,fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all 0.12s",textAlign:"left"}}
            onMouseEnter={e=>{e.currentTarget.style.background=T.redBg;e.currentTarget.style.color=T.red;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.textMute;}}>
            <span style={{fontSize:14}}>→</span> Sign out
          </button>
        </div>
      </aside>
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:`radial-gradient(circle at 0% 0%,#FFFFFF 0%,${T.bg} 55%)`}}>
        {views[active]}
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
  const [showOnboarding,setShowOnboarding]=useState(false);

  // Load data from Supabase after login
  async function loadData(){
    try{
      const [d,j,p]=await Promise.all([
        store.getDocs(),
        store.getJobs(),
        store.getProfile(),
      ]);
      setDocs(d||[]);
      setJobs(j||[]);
      setProfileState((prev) => ({
        ...prev,
        ...(p || {}),
      }));
    }catch(e){console.error("Error loading data:",e);}
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
      setUserId("");
      setShowOnboarding(false);
      setUserName("");
      setLoggedIn(false);
      setBootstrappingAuth(false);
    }
  }

  useEffect(() => {
    if (!loggedIn || !userId) return;
    const key = `onboarding_done_${userId}`;
    const done = localStorage.getItem(key) === "1";
    setShowOnboarding(!done && needsOnboarding(profile));
  }, [loggedIn, userId, profile]);

  async function handleFinishOnboarding(updates) {
    try {
      const savedProfile = await store.setProfile({ ...profile, ...updates });
      setProfileState((prev) => ({ ...prev, ...(savedProfile || updates) }));
    } catch (e) {
      console.error("Onboarding save failed:", e);
      setProfileState((prev) => ({ ...prev, ...updates }));
    } finally {
      if (userId) localStorage.setItem(`onboarding_done_${userId}`, "1");
      setShowOnboarding(false);
    }
  }

  function handleSkipOnboarding() {
    if (userId) localStorage.setItem(`onboarding_done_${userId}`, "1");
    setShowOnboarding(false);
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
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
          input::placeholder{color:#94A3B8;}
        `}</style>
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

  if (showOnboarding) {
    return <OnboardingFlow profile={profile} onSave={handleFinishOnboarding} onSkip={handleSkipOnboarding} />;
  }

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};color:${T.text};font-family:'DM Sans',system-ui,sans-serif;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${T.bg};}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:99px;}
        @keyframes spin{to{transform:rotate(360deg);}}
        select option{background:${T.surface};color:${T.text};}
        button,input,textarea,select{font-family:'DM Sans',system-ui,sans-serif;}
        a{color:${T.primary};}
        button:not(:disabled):hover{opacity:0.9;transform:translateY(-1px);}
        button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{
          outline:2px solid ${T.primaryMid};
          outline-offset:2px;
        }
      `}</style>
      <AppShell docs={docs} setDocs={setDocs} jobs={jobs} setJobs={setJobs}
        userName={userName}
        onLogout={handleLogout}
        profile={profile}
        setProfileState={setProfileState}
      />
    </>
  );
}
