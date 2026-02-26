import React, { useMemo, useState } from "react";

const C = {
  bg: "#f3f7ff",
  panel: "#ffffff",
  line: "#d7e0ef",
  text: "#0f172a",
  muted: "#5b6985",
  primary: "#1d4ed8",
  primaryDark: "#1e40af",
  soft: "#eaf1ff",
  successBg: "#ecfdf3",
  success: "#027a48",
  warnBg: "#fff7ed",
  warn: "#b54708",
};

const sampleResults = [
  { id: "r1", title: "Data Analyst", company: "Northstar", location: "Seattle, WA", fit: ["Title", "Location", "SaaS"], remote: true },
  { id: "r2", title: "Product Data Analyst", company: "Series A Studio", location: "Seattle, WA", fit: ["Keywords", "Seniority"], remote: false },
];

function Btn({ children, onClick, variant = "primary", disabled, style }) {
  const v =
    variant === "ghost"
      ? { background: "#fff", color: C.text, border: `1px solid ${C.line}` }
      : variant === "soft"
      ? { background: C.soft, color: C.primary, border: `1px solid #bdd0ff` }
      : { background: `linear-gradient(180deg,${C.primary},${C.primaryDark})`, color: "#fff", border: "none" };
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        ...v,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, multiline = false }) {
  const base = {
    width: "100%",
    border: `1px solid ${C.line}`,
    borderRadius: 10,
    fontSize: 14,
    color: C.text,
    padding: "10px 12px",
    fontFamily: "inherit",
    background: "#fff",
  };
  if (multiline) {
    return <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...base, resize: "vertical" }} />;
  }
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={base} />;
}

function Card({ children, title, subtitle, right }) {
  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <div>
            {title ? <h3 style={{ margin: 0, fontSize: 17, color: C.text }}>{title}</h3> : null}
            {subtitle ? <p style={{ margin: "5px 0 0", color: C.muted, fontSize: 13 }}>{subtitle}</p> : null}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

function Pill({ children, tone = "default" }) {
  const style =
    tone === "accent"
      ? { background: C.soft, color: C.primary, border: "1px solid #bcd0ff" }
      : tone === "warn"
      ? { background: C.warnBg, color: C.warn, border: "1px solid #fed7aa" }
      : { background: "#fff", color: C.muted, border: `1px solid ${C.line}` };
  return <span style={{ borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700, ...style }}>{children}</span>;
}

function Header({ step, setStep }) {
  const steps = ["Auth", "Profile", "Search", "Tracker", "Tailor", "Settings"];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
      {steps.map((s, i) => (
        <button
          key={s}
          onClick={() => setStep(i)}
          style={{
            borderRadius: 999,
            border: `1px solid ${i === step ? "#9db9ff" : C.line}`,
            background: i === step ? C.soft : "#fff",
            color: i === step ? C.primary : C.muted,
            padding: "7px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {i + 1}. {s}
        </button>
      ))}
    </div>
  );
}

export default function FlowWireframes() {
  const [step, setStep] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    title: "Data Analyst",
    location: "Seattle",
    seniority: "mid-level",
    industry: "SaaS",
    keywords: "SQL, dashboarding, experimentation",
    companyPrefsOn: true,
    companies: "series A",
    vibe: "async",
  });
  const [query, setQuery] = useState("");
  const [searchRun, setSearchRun] = useState(false);
  const [selectedResult, setSelectedResult] = useState("r1");
  const [tracker, setTracker] = useState([]);
  const [tailorUsed, setTailorUsed] = useState(2);
  const [isPremium, setIsPremium] = useState(false);
  const [generated, setGenerated] = useState(false);

  const remaining = isPremium ? "Unlimited" : Math.max(0, 3 - tailorUsed);
  const canTailor = isPremium || tailorUsed < 3;
  const selected = sampleResults.find((r) => r.id === selectedResult) || sampleResults[0];
  const inTracker = useMemo(() => new Set(tracker.map((t) => t.id)), [tracker]);

  function next() {
    setStep((s) => Math.min(5, s + 1));
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 18px 44px", fontFamily: "DM Sans, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <h1 style={{ margin: 0, color: C.text, fontSize: 26 }}>Flow Prototype</h1>
        <p style={{ margin: "8px 0 14px", color: C.muted, fontSize: 14 }}>
          Interactive wireframe to validate user journey before full implementation.
        </p>

        <Header step={step} setStep={setStep} />

        {step === 0 && (
          <Card title="Landing + Auth" subtitle="User enters free immediately; no upfront paywall.">
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
                <h4 style={{ margin: 0, fontSize: 22, color: C.text }}>Land better roles faster</h4>
                <p style={{ margin: "8px 0 12px", color: C.muted, fontSize: 13 }}>Search, track, tailor, and apply from one workspace.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => { setSignedIn(true); setStep(1); }}>Start Free</Btn>
                  <Btn variant="ghost">View Pricing</Btn>
                </div>
              </div>
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, display: "grid", gap: 8 }}>
                <Input value="you@example.com" onChange={() => {}} placeholder="Email" />
                <Input value="••••••••" onChange={() => {}} placeholder="Password" />
                <Btn onClick={() => { setSignedIn(true); setStep(1); }}>{signedIn ? "Signed in" : "Login / Sign up"}</Btn>
              </div>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card title="Profile Defaults" subtitle="Search is powered by these preferences.">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input value={prefs.title} onChange={(v) => setPrefs((p) => ({ ...p, title: v }))} placeholder="Target title" />
                <Input value={prefs.location} onChange={(v) => setPrefs((p) => ({ ...p, location: v }))} placeholder="Preferred location(s)" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input value={prefs.seniority} onChange={(v) => setPrefs((p) => ({ ...p, seniority: v }))} placeholder="Seniority" />
                <Input value={prefs.industry} onChange={(v) => setPrefs((p) => ({ ...p, industry: v }))} placeholder="Industries" />
              </div>
              <Input multiline value={prefs.keywords} onChange={(v) => setPrefs((p) => ({ ...p, keywords: v }))} placeholder="Keywords to highlight" />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Pill tone="accent">Company prefs: {prefs.companyPrefsOn ? "On" : "Off"}</Pill>
                <Btn variant="soft" onClick={() => setPrefs((p) => ({ ...p, companyPrefsOn: !p.companyPrefsOn }))}>Toggle</Btn>
              </div>
              {prefs.companyPrefsOn ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Input value={prefs.companies} onChange={(v) => setPrefs((p) => ({ ...p, companies: v }))} placeholder="Target companies" />
                  <Input value={prefs.vibe} onChange={(v) => setPrefs((p) => ({ ...p, vibe: v }))} placeholder="Culture vibe" />
                </div>
              ) : null}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Btn
                onClick={() => {
                  setProfileSaved(true);
                  setQuery(prefs.title);
                  next();
                }}
              >
                Save Preferences
              </Btn>
              {profileSaved ? <Pill tone="accent">Saved</Pill> : null}
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card title="Job Search" subtitle="Defaults are pre-applied. Chips show what is influencing results.">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 0.8fr auto", gap: 8 }}>
                <Input value={query} onChange={setQuery} placeholder="Search by title / keywords" />
                <Input value={prefs.location} onChange={(v) => setPrefs((p) => ({ ...p, location: v }))} placeholder="Location" />
                <Btn onClick={() => setSearchRun(true)}>Search</Btn>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill tone="accent">title: {prefs.title}</Pill>
                <Pill tone="accent">location: {prefs.location}</Pill>
                <Pill tone="accent">seniority: {prefs.seniority}</Pill>
                <Pill tone="accent">industry: {prefs.industry}</Pill>
                {prefs.companyPrefsOn ? <Pill tone="accent">companies: {prefs.companies}</Pill> : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: 10, background: C.soft, borderBottom: `1px solid ${C.line}`, fontSize: 13, fontWeight: 700, color: C.primary }}>
                    {searchRun ? "Results" : "Run search"}
                  </div>
                  <div style={{ padding: 10, display: "grid", gap: 8 }}>
                    {!searchRun ? <div style={{ color: C.muted, fontSize: 13 }}>No results yet.</div> : null}
                    {searchRun
                      ? sampleResults.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => setSelectedResult(r.id)}
                            style={{
                              border: `1px solid ${r.id === selectedResult ? "#9bb7ff" : C.line}`,
                              background: r.id === selectedResult ? C.soft : "#fff",
                              borderRadius: 10,
                              padding: 10,
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.title}</div>
                            <div style={{ fontSize: 12, color: C.muted }}>{r.company} · {r.location}</div>
                          </button>
                        ))
                      : null}
                  </div>
                </div>
                <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{selected.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{selected.company} · {selected.location}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {selected.fit.map((f) => <Pill key={f}>{f} matched</Pill>)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn
                      disabled={inTracker.has(selected.id)}
                      onClick={() => setTracker((t) => [{ ...selected, status: "saved", hasDescription: false, notes: "" }, ...t])}
                    >
                      {inTracker.has(selected.id) ? "Saved" : "Save to Tracker"}
                    </Btn>
                    <Btn variant="ghost" onClick={() => setStep(3)}>Go Tracker</Btn>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card
            title="Tracker"
            subtitle="Show blockers before tailor so users know exactly what to fix."
            right={<Pill tone="accent">Free uses left: {remaining}</Pill>}
          >
            {tracker.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 13 }}>No saved jobs yet. Save one from Search first.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {tracker.map((j) => (
                  <div key={j.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{j.title}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{j.company} · {j.location}</div>
                      </div>
                      <Pill>{j.status}</Pill>
                    </div>
                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      <Input multiline value={j.notes} onChange={(v) => setTracker((t) => t.map((x) => (x.id === j.id ? { ...x, notes: v } : x)))} placeholder="Notes" />
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Btn variant="soft" onClick={() => setTracker((t) => t.map((x) => (x.id === j.id ? { ...x, hasDescription: true } : x)))}>
                          {j.hasDescription ? "Description added" : "Add Description"}
                        </Btn>
                        {!j.hasDescription ? <Pill tone="warn">Blocker: Missing description</Pill> : <Pill tone="accent">Ready to tailor</Pill>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Btn onClick={() => setStep(4)} disabled={tracker.length === 0}>Tailor Application</Btn>
              <Btn variant="ghost" onClick={() => setStep(2)}>Back to Search</Btn>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card title="Tailor + Upgrade Gate" subtitle="Paywall only appears at intent when free limit is reached.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>Tailor Inputs</div>
                <Input multiline value={"Excitement + emphasis + avoid prompts"} onChange={() => {}} />
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <Btn
                    disabled={!canTailor}
                    onClick={() => {
                      setGenerated(true);
                      if (!isPremium) setTailorUsed((u) => u + 1);
                    }}
                  >
                    Generate
                  </Btn>
                  <Pill tone="accent">Remaining: {remaining}</Pill>
                </div>
                {generated ? (
                  <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 10, background: C.successBg, color: C.success, fontSize: 12, fontWeight: 700 }}>
                    Tailored resume + cover generated. Export .txt/.docx/.pdf.
                  </div>
                ) : null}
              </div>

              <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Upgrade Modal State</div>
                {canTailor ? (
                  <div style={{ fontSize: 13, color: C.muted }}>No upgrade modal shown yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ padding: "10px 12px", borderRadius: 10, background: C.warnBg, border: "1px solid #fed7aa", color: C.warn, fontSize: 12, fontWeight: 700 }}>
                      Free tailoring limit reached.
                    </div>
                    <Btn onClick={() => setIsPremium(true)}>Upgrade to Premium</Btn>
                    <Btn variant="ghost" onClick={() => setStep(3)}>Not now</Btn>
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn variant="ghost" onClick={() => setStep(5)}>Open Settings & Billing</Btn>
            </div>
          </Card>
        )}

        {step === 5 && (
          <Card title="Settings & Billing" subtitle="Subscription management lives inside dashboard settings.">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Pill>Workspace</Pill>
                <Pill tone="accent">Settings</Pill>
                <Pill>Sign out</Pill>
              </div>
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Current Plan: {isPremium ? "Premium" : "Free"}</div>
                <div style={{ marginTop: 4, color: C.muted, fontSize: 12 }}>
                  {isPremium ? "Status: active · Renews monthly" : "Status: free · Limited tailoring"}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {isPremium ? <Btn>Manage Billing</Btn> : <Btn onClick={() => setIsPremium(true)}>Upgrade</Btn>}
                  <Btn variant="ghost" onClick={() => setStep(2)}>Back to Search</Btn>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
