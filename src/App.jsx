import { useEffect, useMemo, useState, useRef } from "react";
import { getSupabaseClient } from "./supabase";


// ═══════════════════════════════════════════════════════════════════════════════
// APP THEME - REFINED & MODERN
// ═══════════════════════════════════════════════════════════════════════════════
const T = {
  bg: "#FAFBFC",
  surface: "#FFFFFF",
  surfaceHover: "#F8FAFC",
  border: "#E5E9F0",
  borderFocus: "#4F7AFF",
  primary: "#4F7AFF",
  primaryDark: "#3461E8",
  primaryLight: "#EFF4FF",
  primaryMid: "#C7D8FA",
  text: "#0F1419",
  textSub: "#536471",
  textMute: "#8899A6",
  green: "#00BA88",
  greenBg: "#ECFDF5",
  greenBorder: "#A7F3D0",
  amber: "#F59E0B",
  amberBg: "#FFFBEB",
  amberBorder: "#FDE68A",
  red: "#EF4444",
  redBg: "#FEF2F2",
  redBorder: "#FECACA",
  teal: "#06B6D4",
  tealBg: "#ECFEFF",
  tealBorder: "#A5F3FC",
  violet: "#8B5CF6",
  violetBg: "#F5F3FF",
  violetBorder: "#DDD6FE",
  indigo: "#6366F1",
  indigoBg: "#EEF2FF",
  indigoBorder: "#C7D2FE",
  shadow: "0 1px 3px rgba(15, 20, 25, 0.08), 0 1px 2px rgba(15, 20, 25, 0.06)",
  shadowLg: "0 10px 15px -3px rgba(15, 20, 25, 0.08), 0 4px 6px -2px rgba(15, 20, 25, 0.04)",
  shadowXl: "0 20px 25px -5px rgba(15, 20, 25, 0.08), 0 10px 10px -5px rgba(15, 20, 25, 0.03)",
};

const STATUS_META = {
  saved:     { color: T.primary, bg: T.primaryLight, border: T.primaryMid, label: "Saved" },
  tailored:  { color: T.violet, bg: T.violetBg, border: T.violetBorder, label: "Tailored" },
  applied:   { color: T.teal, bg: T.tealBg, border: T.tealBorder, label: "Applied" },
  interview: { color: T.amber, bg: T.amberBg, border: T.amberBorder, label: "Interview" },
  offer:     { color: T.green, bg: T.greenBg, border: T.greenBorder, label: "Offer" },
  rejected:  { color: T.red, bg: T.redBg, border: T.redBorder, label: "Rejected" },
};
const STATUS_OPTIONS = ["saved","tailored","applied","interview","offer","rejected"];
const FEEDBACK_EMAIL = "feedback@jobassistant.app";
const WEEKLY_TAILOR_LIMIT = 7;
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

// ═══════════════════════════════════════════════════════════════════════════════
// JOB SEARCH - FIXED JWT AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════
async function searchJobsByKeyword(query) {
  const requestBody = { query, page: 1, numPages: 1, country: "us,ca", datePosted: "all" };
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase URL or anon key.");
  }

  // FIX: Get the user's access token instead of using anon key
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("No active session. Please log in again.");
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/job-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`, // Use user's access token
    },
    body: JSON.stringify(requestBody),
  });
  
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Job search function failed (${res.status}).`);
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
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size,
      height: size,
      border: `2px solid ${T.border}`,
      borderTop: `2px solid ${T.primary}`,
      borderRadius: "50%",
      animation: "spin 0.6s linear infinite"
    }} />
  );
}

function Badge({ children, color, bg, border }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      color: color || T.text,
      background: bg || T.primaryLight,
      border: `1px solid ${border || T.primaryMid}`,
    }}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
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
              full_name: name,
            },
          },
        });
  
        if (error) throw error;
  
        onLogin(name || email.split("@")[0], data.user?.id || "");
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: `linear-gradient(135deg, ${T.primaryLight} 0%, ${T.bg} 50%, ${T.violetBg} 100%)`,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}>
        <div style={{
          width: "100%",
          maxWidth: 440,
          background: T.surface,
          borderRadius: 20,
          padding: 48,
          boxShadow: T.shadowXl,
        }}>
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <h1 style={{
              fontSize: 32,
              fontWeight: 700,
              color: T.text,
              marginBottom: 8,
            }}>
              {isLogin ? "Welcome back" : "Get started"}
            </h1>
            <p style={{ fontSize: 15, color: T.textSub }}>
              {isLogin ? "Sign in to your account" : "Create your account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {!isLogin && (
              <div>
                <label style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.text,
                  marginBottom: 8,
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    fontSize: 15,
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = T.borderFocus}
                  onBlur={(e) => e.target.style.borderColor = T.border}
                />
              </div>
            )}

            <div>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                marginBottom: 8,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  fontSize: 15,
                  transition: "all 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = T.borderFocus}
                onBlur={(e) => e.target.style.borderColor = T.border}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                marginBottom: 8,
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  fontSize: 15,
                  transition: "all 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = T.borderFocus}
                onBlur={(e) => e.target.style.borderColor = T.border}
              />
            </div>

            {error && (
              <div style={{
                padding: 12,
                borderRadius: 8,
                background: T.redBg,
                border: `1px solid ${T.redBorder}`,
                color: T.red,
                fontSize: 14,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 10,
                border: "none",
                background: loading ? T.textMute : T.primary,
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <Spinner size={16} />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign in" : "Create account"
              )}
            </button>
          </form>

          <div style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 14,
            color: T.textSub,
          }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: T.primary,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE STORE
// ═══════════════════════════════════════════════════════════════════════════════
const store = {
  async getDocs() {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id);
    if (error) throw error;
    return data || [];
  },

  async setDocs(docs) {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("documents")
      .upsert(
        docs.map((doc) => ({
          ...doc,
          user_id: user.id,
        })),
        { onConflict: "id" }
      )
      .select();

    if (error) throw error;
    return data;
  },

  async getJobs() {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("saved_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async setJobs(jobs) {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("saved_jobs")
      .upsert(
        jobs.map((job) => ({
          ...job,
          user_id: user.id,
        })),
        { onConflict: "id" }
      )
      .select();

    if (error) throw error;
    return data;
  },

  async getProfile() {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async setProfile(profile) {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          ...profile,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING FLOW
// ═══════════════════════════════════════════════════════════════════════════════
function needsOnboarding(profile) {
  return !profile?.name || !profile?.occupation;
}

function OnboardingFlow({ profile, onSave, onSkip }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    occupation: profile?.occupation || "",
    location: profile?.location || "",
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    onSave(formData);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(135deg, ${T.primaryLight} 0%, ${T.bg} 100%)`,
      padding: 20,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 600,
        background: T.surface,
        borderRadius: 20,
        padding: 48,
        boxShadow: T.shadowXl,
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
          }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: s <= step ? T.primary : T.border,
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>

          <h2 style={{
            fontSize: 28,
            fontWeight: 700,
            color: T.text,
            marginBottom: 8,
          }}>
            {step === 1 && "Welcome! Let's get started"}
            {step === 2 && "What do you do?"}
            {step === 3 && "Where are you based?"}
          </h2>
          <p style={{
            fontSize: 15,
            color: T.textSub,
          }}>
            {step === 1 && "Help us personalize your experience"}
            {step === 2 && "This helps us find relevant opportunities"}
            {step === 3 && "We'll show you jobs in your area"}
          </p>
        </div>

        <div style={{ marginBottom: 32 }}>
          {step === 1 && (
            <div>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                marginBottom: 8,
              }}>
                Your Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  fontSize: 15,
                }}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                marginBottom: 8,
              }}>
                Occupation
              </label>
              <select
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  fontSize: 15,
                  background: T.surface,
                }}
              >
                <option value="">Select your role</option>
                {OCCUPATION_OPTIONS.map((occ) => (
                  <option key={occ} value={occ}>
                    {occ}
                  </option>
                ))}
              </select>
            </div>
          )}

          {step === 3 && (
            <div>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                marginBottom: 8,
              }}>
                Preferred Location
              </label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  fontSize: 15,
                  background: T.surface,
                }}
              >
                <option value="">Select location</option>
                {LOCATION_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
        }}>
          <button
            onClick={onSkip}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: "transparent",
              color: T.textSub,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Skip
          </button>

          <div style={{ display: "flex", gap: 12 }}>
            {step > 1 && (
              <button
                onClick={handleBack}
                style={{
                  padding: "12px 24px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  background: "transparent",
                  color: T.text,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            )}

            <button
              onClick={step === 3 ? handleFinish : handleNext}
              style={{
                padding: "12px 32px",
                borderRadius: 10,
                border: "none",
                background: T.primary,
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {step === 3 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOB SEARCH VIEW - IMPROVED UI/UX
// ═══════════════════════════════════════════════════════════════════════════════
function JobSearchView({ jobs, setJobs }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const searchResults = await searchJobsByKeyword(query);
      setResults(searchResults);
      if (searchResults.length === 0) {
        setError("No jobs found. Try a different search term.");
      }
    } catch (err) {
      setError(err.message || "Failed to search jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async (job) => {
    const newJob = {
      id: crypto.randomUUID(),
      ...job,
      status: "saved",
      notes: "",
      created_at: new Date().toISOString(),
    };

    const updatedJobs = [newJob, ...jobs];
    setJobs(updatedJobs);
    await store.setJobs(updatedJobs);

    setResults(results.filter((r) => r !== job));
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: "32px 40px",
      overflow: "auto",
    }}>
      <div style={{ maxWidth: 1000, width: "100%", margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: T.text,
            marginBottom: 8,
          }}>
            Find Your Next Role
          </h1>
          <p style={{
            fontSize: 15,
            color: T.textSub,
          }}>
            Search thousands of job listings and save the ones you like
          </p>
        </div>

        <form onSubmit={handleSearch} style={{ marginBottom: 32 }}>
          <div style={{
            display: "flex",
            gap: 12,
            padding: 16,
            background: T.surface,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            boxShadow: T.shadow,
          }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20, color: T.textMute }}>🔍</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, company, or keywords..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 15,
                  color: T.text,
                  background: "transparent",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                padding: "12px 28px",
                borderRadius: 10,
                border: "none",
                background: loading || !query.trim() ? T.textMute : T.primary,
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              {loading ? (
                <>
                  <Spinner size={16} />
                  Searching...
                </>
              ) : (
                "Search Jobs"
              )}
            </button>
          </div>
        </form>

        {error && (
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: T.redBg,
            border: `1px solid ${T.redBorder}`,
            color: T.red,
            fontSize: 14,
            marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}>
              <h2 style={{
                fontSize: 20,
                fontWeight: 600,
                color: T.text,
              }}>
                {results.length} Results Found
              </h2>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {results.map((job, idx) => (
                <div
                  key={idx}
                  style={{
                    background: T.surface,
                    borderRadius: 14,
                    padding: 24,
                    border: `1px solid ${T.border}`,
                    boxShadow: T.shadow,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = T.shadowLg;
                    e.currentTarget.style.borderColor = T.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = T.shadow;
                    e.currentTarget.style.borderColor = T.border;
                  }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: T.text,
                      marginBottom: 6,
                    }}>
                      {job.title}
                    </h3>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      fontSize: 14,
                      color: T.textSub,
                    }}>
                      <span style={{ fontWeight: 600 }}>{job.company}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                    </div>
                  </div>

                  {job.description && (
                    <p style={{
                      fontSize: 14,
                      color: T.textSub,
                      lineHeight: 1.6,
                      marginBottom: 16,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {job.description}
                    </p>
                  )}

                  <div style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                  }}>
                    <button
                      onClick={() => handleSaveJob(job)}
                      style={{
                        padding: "10px 20px",
                        borderRadius: 8,
                        border: "none",
                        background: T.primary,
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      💾 Save Job
                    </button>
                    {job.apply_url && (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "10px 20px",
                          borderRadius: 8,
                          border: `1px solid ${T.border}`,
                          background: "transparent",
                          color: T.text,
                          fontSize: 14,
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                      >
                        🔗 View Job
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div style={{
            textAlign: "center",
            padding: "80px 20px",
            color: T.textMute,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Start your job search
            </p>
            <p style={{ fontSize: 14 }}>
              Enter keywords, job titles, or company names above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAVED JOBS VIEW - IMPROVED UI/UX
// ═══════════════════════════════════════════════════════════════════════════════
function SavedJobsView({ jobs, setJobs }) {
  const [filter, setFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);

  const filteredJobs = useMemo(() => {
    if (filter === "all") return jobs;
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  const statusCounts = useMemo(() => {
    const counts = { all: jobs.length };
    STATUS_OPTIONS.forEach((status) => {
      counts[status] = jobs.filter((j) => j.status === status).length;
    });
    return counts;
  }, [jobs]);

  const handleStatusChange = async (jobId, newStatus) => {
    const updatedJobs = jobs.map((j) =>
      j.id === jobId ? { ...j, status: newStatus } : j
    );
    setJobs(updatedJobs);
    await store.setJobs(updatedJobs);
    if (selectedJob?.id === jobId) {
      setSelectedJob({ ...selectedJob, status: newStatus });
    }
  };

  const handleUpdateNotes = async (jobId, notes) => {
    const updatedJobs = jobs.map((j) =>
      j.id === jobId ? { ...j, notes } : j
    );
    setJobs(updatedJobs);
    await store.setJobs(updatedJobs);
  };

  const handleDeleteJob = async (jobId) => {
    const updatedJobs = jobs.filter((j) => j.id !== jobId);
    setJobs(updatedJobs);
    await store.setJobs(updatedJobs);
    if (selectedJob?.id === jobId) {
      setSelectedJob(null);
    }
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      overflow: "hidden",
    }}>
      {/* Left Sidebar - Filters */}
      <div style={{
        width: 280,
        borderRight: `1px solid ${T.border}`,
        background: T.surface,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}>
        <div style={{ padding: "24px 20px" }}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 700,
            color: T.text,
            marginBottom: 16,
          }}>
            Filter by Status
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={() => setFilter("all")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: filter === "all" ? T.primaryLight : "transparent",
                color: filter === "all" ? T.primary : T.text,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span>All Jobs</span>
              <Badge color={T.textMute} bg={T.bg} border={T.border}>
                {statusCounts.all}
              </Badge>
            </button>

            {STATUS_OPTIONS.map((status) => {
              const meta = STATUS_META[status];
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: filter === status ? meta.bg : "transparent",
                    color: filter === status ? meta.color : T.text,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>{meta.label}</span>
                  <Badge color={meta.color} bg={meta.bg} border={meta.border}>
                    {statusCounts[status] || 0}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle - Job List */}
      <div style={{
        width: 400,
        borderRight: `1px solid ${T.border}`,
        background: T.bg,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}>
        <div style={{
          padding: "20px",
          borderBottom: `1px solid ${T.border}`,
          background: T.surface,
        }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            color: T.text,
          }}>
            {filter === "all" ? "All Jobs" : STATUS_META[filter]?.label}
            <span style={{
              marginLeft: 8,
              fontSize: 16,
              color: T.textMute,
              fontWeight: 500,
            }}>
              ({filteredJobs.length})
            </span>
          </h2>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {filteredJobs.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: "center",
              color: T.textMute,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 14 }}>No jobs found</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredJobs.map((job) => {
                const meta = STATUS_META[job.status];
                const isSelected = selectedJob?.id === job.id;

                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    style={{
                      padding: 20,
                      border: "none",
                      borderBottom: `1px solid ${T.border}`,
                      background: isSelected ? T.surface : "transparent",
                      borderLeft: isSelected ? `3px solid ${meta.color}` : "3px solid transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = T.surface;
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}>
                      <h3 style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: T.text,
                        flex: 1,
                      }}>
                        {job.title}
                      </h3>
                      <Badge color={meta.color} bg={meta.bg} border={meta.border}>
                        {meta.label}
                      </Badge>
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: T.textSub,
                      marginBottom: 4,
                    }}>
                      {job.company}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: T.textMute,
                    }}>
                      {job.location}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right - Job Detail */}
      <div style={{
        flex: 1,
        background: T.surface,
        overflow: "auto",
      }}>
        {selectedJob ? (
          <div style={{ padding: 32 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: T.text,
                    marginBottom: 8,
                  }}>
                    {selectedJob.title}
                  </h1>
                  <div style={{
                    fontSize: 16,
                    color: T.textSub,
                    marginBottom: 4,
                  }}>
                    <strong>{selectedJob.company}</strong>
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: T.textMute,
                  }}>
                    📍 {selectedJob.location}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteJob(selectedJob.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${T.redBorder}`,
                    background: T.redBg,
                    color: T.red,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🗑️ Delete
                </button>
              </div>

              {selectedJob.apply_url && (
                <a
                  href={selectedJob.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 20px",
                    borderRadius: 8,
                    background: T.primary,
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  🔗 View Original Posting
                </a>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                marginBottom: 8,
              }}>
                Status
              </label>
              <select
                value={selectedJob.status}
                onChange={(e) => handleStatusChange(selectedJob.id, e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  fontSize: 14,
                  background: T.surface,
                }}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </div>

            {selectedJob.description && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: T.text,
                  marginBottom: 12,
                }}>
                  Description
                </h3>
                <div style={{
                  padding: 16,
                  borderRadius: 8,
                  background: T.bg,
                  fontSize: 14,
                  color: T.textSub,
                  lineHeight: 1.6,
                  maxHeight: 300,
                  overflow: "auto",
                }}>
                  {selectedJob.description}
                </div>
              </div>
            )}

            <div>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                marginBottom: 8,
              }}>
                Notes
              </label>
              <textarea
                value={selectedJob.notes || ""}
                onChange={(e) => handleUpdateNotes(selectedJob.id, e.target.value)}
                placeholder="Add your notes, interview prep, or follow-up tasks..."
                style={{
                  width: "100%",
                  minHeight: 120,
                  padding: "12px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  fontSize: 14,
                  color: T.text,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.textMute,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>👈</div>
              <p style={{ fontSize: 16 }}>Select a job to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function AppShell({ docs, setDocs, jobs, setJobs, userName, onLogout, profile, setProfileState }) {
  const [active, setActive] = useState("search");

  const views = {
    search: <JobSearchView jobs={jobs} setJobs={setJobs} />,
    saved: <SavedJobsView jobs={jobs} setJobs={setJobs} />,
  };

  const navItems = [
    { id: "search", label: "Search Jobs", icon: "🔍", disabled: false },
    { id: "saved", label: "Saved Jobs", icon: "💼", disabled: false },
  ];

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: T.bg,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 260,
        background: T.surface,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        padding: 20,
      }}>
        <div style={{
          marginBottom: 32,
          paddingBottom: 20,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: T.text,
          }}>
            Job Assistant
          </h1>
          <p style={{
            fontSize: 13,
            color: T.textMute,
            marginTop: 4,
          }}>
            Manage your job search
          </p>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.disabled && setActive(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                border: "none",
                cursor: n.disabled ? "not-allowed" : "pointer",
                width: "100%",
                background: active === n.id ? T.primaryLight : "transparent",
                color: n.disabled ? T.textMute : (active === n.id ? T.primary : T.textSub),
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: active === n.id ? 600 : 500,
                transition: "all 0.2s",
                textAlign: "left",
              }}
              disabled={n.disabled}
              onMouseEnter={(e) => {
                if (!n.disabled && active !== n.id) {
                  e.currentTarget.style.background = T.surfaceHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!n.disabled && active !== n.id) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span style={{ fontSize: 18 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.disabled && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: T.textMute,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: T.bg,
                }}>
                  Soon
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{
          borderTop: `1px solid ${T.border}`,
          paddingTop: 16,
        }}>
          <div style={{
            fontSize: 13,
            color: T.textSub,
            padding: "8px 12px",
            fontWeight: 600,
            marginBottom: 8,
          }}>
            {userName}
          </div>
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              width: "100%",
              background: "transparent",
              color: T.textMute,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.redBg;
              e.currentTarget.style.color = T.red;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = T.textMute;
            }}
          >
            <span style={{ fontSize: 16 }}>→</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {views[active]}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [bootstrappingAuth, setBootstrappingAuth] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [docs, setDocs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [profile, setProfileState] = useState({ name: "" });
  const [showOnboarding, setShowOnboarding] = useState(false);

  async function loadData() {
    try {
      const [d, j, p] = await Promise.all([
        store.getDocs(),
        store.getJobs(),
        store.getProfile(),
      ]);
      setDocs(d || []);
      setJobs(j || []);
      setProfileState((prev) => ({
        ...prev,
        ...(p || {}),
      }));
    } catch (e) {
      console.error("Error loading data:", e);
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
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: T.bg,
        color: T.textSub,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 15,
          fontWeight: 600,
        }}>
          <Spinner />
          Loading your workspace...
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
          input::placeholder { color: ${T.textMute}; }
        `}</style>
        <LandingPage
          onLogin={async (name, id) => {
            setUserName(name);
            setUserId(id || "");
            setProfileState((prev) => ({ ...prev, name: name || prev.name || "" }));
            setLoggedIn(true);
            await loadData();
          }}
        />
      </>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow profile={profile} onSave={handleFinishOnboarding} onSkip={handleSkipOnboarding} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; color: ${T.text}; font-family: 'Inter', system-ui, sans-serif; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.textMute}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: ${T.surface}; color: ${T.text}; }
        button, input, textarea, select { font-family: 'Inter', system-ui, sans-serif; }
        a { color: ${T.primary}; }
        button:not(:disabled):active { transform: translateY(0); }
      `}</style>
      <AppShell
        docs={docs}
        setDocs={setDocs}
        jobs={jobs}
        setJobs={setJobs}
        userName={userName}
        onLogout={handleLogout}
        profile={profile}
        setProfileState={setProfileState}
      />
    </>
  );
}
