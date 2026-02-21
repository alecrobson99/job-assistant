import { useState, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE THEME
// ═══════════════════════════════════════════════════════════════════════════════
const LT = {
  bg: "#0A0E1A", bgLight: "#131824", surface: "#1A1F2E", border: "#2A3142",
  primary: "#4F7CFF", primaryLight: "#6B8FFF", primaryDark: "#3D5FCC",
  accent: "#00D9FF", text: "#F7F9FC", textSub: "#A8B2D1", textMute: "#6B7590",
  purple: "#8B5CF6", green: "#10B981",
};

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
  teal: "#0D7490", tealBg: "#F0FDFF", tealBorder: "#A5F3FC",
  violet: "#7C3AED", violetBg: "#F5F3FF", violetBorder: "#DDD6FE",
};

const STATUS_META = {
  saved:     { color: T.primary, bg: T.primaryLight, border: T.primaryMid,    label: "Saved"     },
  applied:   { color: T.teal,    bg: T.tealBg,       border: T.tealBorder,    label: "Applied"   },
  interview: { color: T.amber,   bg: T.amberBg,      border: T.amberBorder,   label: "Interview" },
  offer:     { color: T.green,   bg: T.greenBg,      border: T.greenBorder,   label: "Offer"     },
  rejected:  { color: T.red,     bg: T.redBg,        border: T.redBorder,     label: "Rejected"  },
};
const STATUS_OPTIONS = ["saved","applied","interview","offer","rejected"];

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
      if (isLogin) {
        // ── TODO: SIGN IN with Supabase ──────────────────────────────────────
        // const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        // if (error) throw error
        // onLogin(data.user.user_metadata?.full_name || email.split("@")[0])
        // ↓ Remove these two lines once Supabase is wired up:
        await new Promise(r => setTimeout(r, 800));
        onLogin(email.split("@")[0] || "User");
      } else {
        // ── TODO: SIGN UP with Supabase ──────────────────────────────────────
        // const { data, error } = await supabase.auth.signUp({
        //   email, password, options: { data: { full_name: name } }
        // })
        // if (error) throw error
        // onLogin(name || email.split("@")[0])
        // ↓ Remove these two lines once Supabase is wired up:
        await new Promise(r => setTimeout(r, 800));
        onLogin(name || email.split("@")[0] || "User");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", background: LT.bgLight, border: `1.5px solid ${LT.border}`,
    borderRadius: 10, padding: "12px 16px", fontSize: 14, color: LT.text,
    outline: "none", transition: "all 0.2s", fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(165deg,${LT.bg} 0%,#0D1628 50%,#161B2E 100%)`,
      position:"relative", overflow:"hidden" }}>

      {/* BG blobs */}
      <div style={{ position:"absolute", inset:0, opacity:0.4,
        backgroundImage:`radial-gradient(circle at 20% 30%,${LT.primary}15 0%,transparent 50%),
          radial-gradient(circle at 80% 70%,${LT.accent}10 0%,transparent 50%),
          radial-gradient(circle at 50% 50%,${LT.purple}08 0%,transparent 60%)` }}/>
      <div style={{ position:"absolute", inset:0,
        backgroundImage:`linear-gradient(${LT.border}40 1px,transparent 1px),linear-gradient(90deg,${LT.border}40 1px,transparent 1px)`,
        backgroundSize:"50px 50px", opacity:0.15,
        maskImage:"radial-gradient(ellipse 80% 50% at 50% 50%,black 0%,transparent 100%)" }}/>
      <div style={{ position:"absolute", top:"10%", right:"15%", width:400, height:400,
        background:`radial-gradient(circle,${LT.primary}30 0%,transparent 70%)`,
        borderRadius:"50%", filter:"blur(80px)", animation:"float 20s ease-in-out infinite" }}/>
      <div style={{ position:"absolute", bottom:"15%", left:"10%", width:300, height:300,
        background:`radial-gradient(circle,${LT.accent}25 0%,transparent 70%)`,
        borderRadius:"50%", filter:"blur(70px)", animation:"float 15s ease-in-out infinite reverse" }}/>

      {/* Nav */}
      <nav style={{ position:"relative", zIndex:10, display:"flex", justifyContent:"space-between",
        alignItems:"center", padding:"24px 48px", maxWidth:1400, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, background:`linear-gradient(135deg,${LT.primary},${LT.accent})`,
            borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, fontWeight:800, color:"#fff", boxShadow:`0 0 30px ${LT.primary}40` }}>J</div>
          <div style={{ fontSize:20, fontWeight:800, color:LT.text, letterSpacing:"-0.02em" }}>JobAssist</div>
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          {["Features","Pricing"].map(l=>(
            <a key={l} href="#" style={{ color:LT.textSub, textDecoration:"none", fontSize:14, fontWeight:500 }}
              onMouseEnter={e=>e.target.style.color=LT.text} onMouseLeave={e=>e.target.style.color=LT.textSub}>{l}</a>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main style={{ position:"relative", zIndex:10, maxWidth:1400, margin:"0 auto",
        padding:"60px 48px", display:"flex", alignItems:"center",
        minHeight:"calc(100vh - 88px)", gap:80 }}>

        {/* Left hero */}
        <div style={{ flex:1, animation:"slideInLeft 0.8s ease-out" }}>
          <div style={{ display:"inline-block",
            background:`linear-gradient(90deg,${LT.primary}20,${LT.purple}20)`,
            border:`1px solid ${LT.primary}30`, borderRadius:100, padding:"6px 16px",
            fontSize:12, fontWeight:700, color:LT.primaryLight, letterSpacing:"0.05em",
            textTransform:"uppercase", marginBottom:24 }}>
            ✨ AI-Powered Job Search
          </div>
          <h1 style={{ fontSize:72, fontWeight:800, lineHeight:1.1, marginBottom:24,
            letterSpacing:"-0.03em",
            background:`linear-gradient(135deg,${LT.text} 0%,${LT.textSub} 100%)`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            Land your dream job faster
          </h1>
          <p style={{ fontSize:20, lineHeight:1.7, color:LT.textSub, marginBottom:40, maxWidth:540 }}>
            Track applications, tailor your resume with AI, and get personalized job recommendations.
            Built for job seekers who want results.
          </p>
          <div style={{ display:"flex", gap:16, marginBottom:48 }}>
            {[
              { icon:"🎯", title:"Smart Tracking",   sub:"Never lose track",  color:LT.primary },
              { icon:"✨", title:"AI Tailoring",     sub:"Perfect every time", color:LT.accent  },
              { icon:"🧭", title:"Role Suggestions", sub:"Find your fit",      color:LT.purple  },
            ].map(f=>(
              <div key={f.title} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:44, height:44, background:`${f.color}15`, border:`1px solid ${f.color}30`,
                  borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:LT.text }}>{f.title}</div>
                  <div style={{ fontSize:12, color:LT.textMute }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:48, padding:"32px 0",
            borderTop:`1px solid ${LT.border}`, borderBottom:`1px solid ${LT.border}` }}>
            {[["10K+","Active Users",LT.primary],["95%","Success Rate",LT.accent],["2.5x","Faster Results",LT.green]].map(([n,l,c])=>(
              <div key={l}>
                <div style={{ fontSize:36, fontWeight:800, color:c, marginBottom:4 }}>{n}</div>
                <div style={{ fontSize:13, color:LT.textMute, fontWeight:500 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right form */}
        <div style={{ width:460, flexShrink:0, animation:"slideInRight 0.8s ease-out 0.2s backwards" }}>
          <div style={{ background:LT.surface, border:`1px solid ${LT.border}`, borderRadius:20,
            padding:40, boxShadow:`0 20px 60px ${LT.bg}80,0 0 1px ${LT.border}`, backdropFilter:"blur(20px)" }}>

            <div style={{ marginBottom:28, textAlign:"center" }}>
              <h2 style={{ fontSize:26, fontWeight:800, color:LT.text, marginBottom:8, letterSpacing:"-0.02em" }}>
                {isLogin ? "Welcome back" : "Create account"}
              </h2>
              <p style={{ fontSize:14, color:LT.textSub }}>
                {isLogin ? "Sign in to continue your job search" : "Start your job search journey"}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8,
                padding:"10px 14px", marginBottom:20, fontSize:13, color:"#DC2626", textAlign:"center" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:"block", fontSize:13, fontWeight:600, color:LT.textSub, marginBottom:7 }}>Full Name</label>
                  <input type="text" value={name} onChange={e=>setName(e.target.value)}
                    placeholder="Jane Smith" required style={inputStyle}
                    onFocus={e=>{e.target.style.borderColor=LT.primary;e.target.style.boxShadow=`0 0 0 3px ${LT.primary}15`;}}
                    onBlur={e=>{e.target.style.borderColor=LT.border;e.target.style.boxShadow="none";}}/>
                </div>
              )}

              <div style={{ marginBottom:18 }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:LT.textSub, marginBottom:7 }}>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" required style={inputStyle}
                  onFocus={e=>{e.target.style.borderColor=LT.primary;e.target.style.boxShadow=`0 0 0 3px ${LT.primary}15`;}}
                  onBlur={e=>{e.target.style.borderColor=LT.border;e.target.style.boxShadow="none";}}/>
              </div>

              <div style={{ marginBottom: isLogin ? 10 : 24 }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:LT.textSub, marginBottom:7 }}>Password</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6} style={inputStyle}
                  onFocus={e=>{e.target.style.borderColor=LT.primary;e.target.style.boxShadow=`0 0 0 3px ${LT.primary}15`;}}
                  onBlur={e=>{e.target.style.borderColor=LT.border;e.target.style.boxShadow="none";}}/>
              </div>

              {isLogin && (
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:22 }}>
                  <a href="#" style={{ fontSize:13, color:LT.primary, textDecoration:"none", fontWeight:600 }}
                    onMouseEnter={e=>e.target.style.color=LT.primaryLight}
                    onMouseLeave={e=>e.target.style.color=LT.primary}>
                    Forgot password?
                  </a>
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width:"100%", background:loading?LT.textMute:`linear-gradient(135deg,${LT.primary},${LT.primaryDark})`,
                color:"#fff", border:"none", borderRadius:10, padding:"14px", fontSize:15, fontWeight:700,
                cursor:loading?"not-allowed":"pointer", transition:"all 0.2s",
                boxShadow:loading?"none":`0 4px 20px ${LT.primary}40`, fontFamily:"inherit",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8
              }}
                onMouseEnter={e=>{if(!loading){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=`0 6px 25px ${LT.primary}50`;}}}
                onMouseLeave={e=>{if(!loading){e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 4px 20px ${LT.primary}40`;}}}>
                {loading && <div style={{ width:16, height:16, border:"2px solid #ffffff40", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.6s linear infinite" }}/>}
                {loading ? "Please wait..." : (isLogin ? "Sign In →" : "Create Account →")}
              </button>
            </form>

            <div style={{ marginTop:24, textAlign:"center", fontSize:13, color:LT.textSub }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={()=>{setIsLogin(!isLogin);setError("");}} style={{
                background:"none", border:"none", color:LT.primary, fontWeight:700,
                cursor:"pointer", fontSize:13, fontFamily:"inherit"
              }} onMouseEnter={e=>e.target.style.color=LT.primaryLight}
                 onMouseLeave={e=>e.target.style.color=LT.primary}>
                {isLogin ? "Sign up free" : "Sign in"}
              </button>
            </div>

            <div style={{ marginTop:20, textAlign:"center", fontSize:11, color:LT.textMute,
              display:"flex", justifyContent:"center", gap:12, opacity:0.7 }}>
              <span>🔒 Encrypted</span><span>•</span><span>GDPR Compliant</span><span>•</span><span>No spam</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
async function callClaude(system, userMsg, maxTokens=1500) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTokens, system,
      messages:[{role:"user",content:userMsg}] }),
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message);
  return data.content.map(b=>b.text||"").join("");
}

const store = {
  getDocs:    ()=>JSON.parse(localStorage.getItem("jaa_docs")||"[]"),
  setDocs:    (d)=>localStorage.setItem("jaa_docs",JSON.stringify(d)),
  getJobs:    ()=>JSON.parse(localStorage.getItem("jaa_jobs")||"[]"),
  setJobs:    (j)=>localStorage.setItem("jaa_jobs",JSON.stringify(j)),
  getProfile: ()=>JSON.parse(localStorage.getItem("jaa_profile")||"{}"),
  setProfile: (p)=>localStorage.setItem("jaa_profile",JSON.stringify(p)),
};
const genId = ()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

function exportCSV(jobs,docs) {
  const hdrs=["Job Title","Company","Location","URL","Date Saved","Status","Notes","Resume Used","Cover Letter Used"];
  const rows=jobs.map(j=>{
    const res=docs.find(d=>d.id===j.resumeDocId); const cl=docs.find(d=>d.id===j.coverDocId);
    return [j.title,j.company,j.location,j.url,j.savedAt?.slice(0,10),j.status,j.notes||"",res?.tag||"",cl?.tag||""]
      .map(v=>`"${(v||"").replace(/"/g,'""')}"`).join(",");
  });
  const csv=[hdrs.join(","),...rows].join("\n");
  const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="applications.csv"; a.click(); URL.revokeObjectURL(url);
}

// ─── Design primitives ────────────────────────────────────────────────────────
function FL({children}){return <div style={{fontSize:11,fontWeight:700,color:T.textMute,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:6}}>{children}</div>;}
function Divider(){return <div style={{height:1,background:T.border,margin:"18px 0"}}/>;}
function SH({icon,title}){return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><span style={{fontSize:16}}>{icon}</span><span style={{fontSize:14,fontWeight:700,color:T.text}}>{title}</span></div>;}
function PH({title,subtitle,action}){return <div style={{padding:"28px 32px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}><div><h1 style={{margin:0,fontSize:21,fontWeight:800,color:T.text,letterSpacing:"-0.3px"}}>{title}</h1>{subtitle&&<p style={{margin:"4px 0 0",fontSize:13,color:T.textSub}}>{subtitle}</p>}</div>{action}</div>;}
function Card({children,style:s}){return <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:20,...s}}>{children}</div>;}
function Chip({label,color}){return <span style={{fontSize:12,fontWeight:600,color,background:color+"18",border:`1px solid ${color}30`,borderRadius:20,padding:"3px 11px"}}>{label}</span>;}

function StatusBadge({status}){
  const m=STATUS_META[status]||STATUS_META.saved;
  return <span style={{background:m.bg,color:m.color,border:`1px solid ${m.border}`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,letterSpacing:"0.03em",whiteSpace:"nowrap"}}>{m.label}</span>;
}
function Spinner({color=T.primary}){return <span style={{display:"inline-block",width:13,height:13,border:`2px solid ${color}30`,borderTopColor:color,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>;}

function Btn({onClick,children,variant="primary",small,full,disabled,style:s}){
  const base={cursor:disabled?"not-allowed":"pointer",borderRadius:8,fontWeight:600,transition:"opacity 0.15s",display:"inline-flex",alignItems:"center",gap:6,opacity:disabled?0.5:1,border:"none",fontFamily:"inherit"};
  const v={
    primary:{background:T.primary,color:"#fff",padding:small?"6px 14px":"9px 20px",fontSize:small?12:13},
    secondary:{background:T.primaryLight,color:T.primary,padding:small?"6px 14px":"9px 20px",fontSize:small?12:13,border:`1px solid ${T.primaryMid}`},
    ghost:{background:"transparent",color:T.textSub,padding:small?"5px 12px":"8px 16px",fontSize:small?12:13,border:`1px solid ${T.border}`},
    danger:{background:T.redBg,color:T.red,padding:small?"6px 14px":"9px 20px",fontSize:small?12:13,border:`1px solid ${T.redBorder}`},
    success:{background:T.greenBg,color:T.green,padding:small?"6px 14px":"9px 20px",fontSize:small?12:13,border:`1px solid ${T.greenBorder}`},
    violet:{background:T.violetBg,color:T.violet,padding:small?"6px 14px":"9px 20px",fontSize:small?12:13,border:`1px solid ${T.violetBorder}`},
  };
  return <button onClick={disabled?undefined:onClick} style={{...base,...v[variant],...(full?{width:"100%",justifyContent:"center"}:{}),...s}}>{children}</button>;
}

function AppInput({value,onChange,placeholder,type="text",style:s}){
  const [f,setF]=useState(false);
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)}
    style={{width:"100%",background:T.surface,border:`1.5px solid ${f?T.borderFocus:T.border}`,borderRadius:8,color:T.text,padding:"9px 13px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color 0.15s",...s}}/>;
}

function TA({value,onChange,placeholder,rows=6,style:s}){
  const [f,setF]=useState(false);
  return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)}
    style={{width:"100%",background:T.surface,border:`1.5px solid ${f?T.borderFocus:T.border}`,borderRadius:8,color:T.text,padding:"10px 13px",fontSize:13,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.65,transition:"border-color 0.15s",...s}}/>;
}

function Sel({value,onChange,options,style:s}){
  return <select value={value} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:8,color:value?T.text:T.textMute,padding:"9px 13px",fontSize:13,fontFamily:"inherit",outline:"none",cursor:"pointer",...s}}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
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
        const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
        const d=await(await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:3000,messages:[{role:"user",content:[
            {type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},
            {type:"text",text:"Extract and return only the full plain text. No commentary."}
          ]}]})})).json();
        onText(d.content?.map(b=>b.text||"").join("")||"",file.name);
      }else{onText(await file.text(),file.name);}
    }catch{alert("Could not read file.");}
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
function ProfileView({docs,setDocs,userName}){
  const [profile,setP]=useState(()=>{const p=store.getProfile();return p.name?p:{...p,name:userName||""};});
  const [savedMsg,setSavedMsg]=useState("");
  const [showDocForm,setShowDocForm]=useState(false);
  const [docType,setDocType]=useState("resume");
  const [docTag,setDocTag]=useState("");
  const [docContent,setDocContent]=useState("");
  const [editDocId,setEditDocId]=useState(null);

  function up(k,v){setP(p=>({...p,[k]:v}));}
  function save(){store.setProfile(profile);setSavedMsg("Saved!");setTimeout(()=>setSavedMsg(""),2000);}

  function saveDoc(){
    if(!docContent.trim()||!docTag.trim())return;
    const updated=editDocId?docs.map(d=>d.id===editDocId?{...d,tag:docTag,content:docContent,type:docType}:d)
      :[{id:genId(),type:docType,tag:docTag,content:docContent,createdAt:new Date().toISOString()},...docs];
    setDocs(updated);store.setDocs(updated);
    setShowDocForm(false);setEditDocId(null);setDocTag("");setDocContent("");setDocType("resume");
  }
  function startEdit(doc){setEditDocId(doc.id);setDocType(doc.type);setDocTag(doc.tag);setDocContent(doc.content);setShowDocForm(true);}
  function delDoc(id){const u=docs.filter(d=>d.id!==id);setDocs(u);store.setDocs(u);}
  function cancelDoc(){setShowDocForm(false);setEditDocId(null);setDocTag("");setDocContent("");}

  const F=({lbl,k,ph,type="text"})=><div style={{marginBottom:14}}><FL>{lbl}</FL><AppInput value={profile[k]||""} onChange={v=>up(k,v)} placeholder={ph} type={type}/></div>;
  const resumes=docs.filter(d=>d.type==="resume"); const covers=docs.filter(d=>d.type==="cover_letter");

  return(
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <div style={{padding:"28px 32px",maxWidth:920,margin:"0 auto"}}>
        <div style={{marginBottom:22}}>
          <h1 style={{margin:0,fontSize:21,fontWeight:800,color:T.text,letterSpacing:"-0.3px"}}>Profile</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:T.textSub}}>Personal info, job preferences, and documents</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
          <Card>
            <SH icon="👤" title="Personal Info"/>
            <F lbl="Full Name" k="name" ph="Jane Smith"/><F lbl="Email" k="email" ph="jane@example.com" type="email"/>
            <F lbl="LinkedIn URL" k="linkedin" ph="https://linkedin.com/in/jane"/>
            <F lbl="Location" k="location" ph="San Francisco, CA"/><F lbl="Phone" k="phone" ph="+1 (555) 000-0000" type="tel"/>
          </Card>
          <Card>
            <SH icon="🎯" title="Job Preferences"/>
            <F lbl="Target Job Title(s)" k="targetTitle" ph="Product Manager, Senior PM"/>
            <F lbl="Preferred Location(s)" k="targetLocation" ph="Remote, NYC, London"/>
            <F lbl="Seniority Level" k="seniority" ph="Senior, Mid-level, Entry"/>
            <F lbl="Industries" k="industry" ph="SaaS, Fintech, Healthcare"/>
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
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

        <div style={{marginBottom:24}}><Btn onClick={save} variant={savedMsg?"success":"primary"}>{savedMsg?"✓ "+savedMsg:"Save All Preferences"}</Btn></div>

        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <SH icon="📄" title="My Documents"/>
            <Btn onClick={()=>{setShowDocForm(v=>!v);if(showDocForm)cancelDoc();}} variant="secondary" small>{showDocForm?"Cancel":"+ Add Document"}</Btn>
          </div>

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
                <Btn onClick={saveDoc}>{editDocId?"Update":"Save Document"}</Btn>
                <Btn onClick={cancelDoc} variant="ghost">Cancel</Btn>
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
                      <div style={{fontSize:10,color:T.textMute,marginTop:6}}>{doc.createdAt?.slice(0,10)}</div>
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
function SuggestedView({docs,jobs,setJobs}){
  const [roles,setRoles]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [generated,setGenerated]=useState(false);
  const profile=store.getProfile();
  const resume=docs.find(d=>d.type==="resume");

  async function generate(){
    setLoading(true);setError("");setRoles([]);
    try{
      const raw=await callClaude(
        `You are a career advisor. Based on the user's profile and resume, suggest 8 specific job roles they are well-suited for. Return ONLY valid JSON: array of objects with keys: title, category, whyFit (1 sentence), typicalCompanies (array of 3 strings), salaryRange (string), growthOutlook ("High"|"Medium"|"Low"), skills (array of 3-5 strings).`,
        `Name: ${profile.name||"Not set"}\nTarget titles: ${profile.targetTitle||"Not specified"}\nIndustry: ${profile.industry||"Not specified"}\nSeniority: ${profile.seniority||"Not specified"}\nKeywords: ${profile.keywords||"None"}${profile.useCompanyPrefs&&profile.lifestyleVibe?`\nCulture preference: ${profile.lifestyleVibe}`:""}${profile.useCompanyPrefs&&profile.targetCompanies?`\nTarget companies: ${profile.targetCompanies}`:""}\nResume: ${resume?.content?.slice(0,800)||"Not provided"}`,
        2000
      );
      setRoles(JSON.parse(raw.replace(/```json|```/g,"").trim()));setGenerated(true);
    }catch{setError("Could not generate suggestions. Try again.");}
    setLoading(false);
  }

  function saveRole(role){
    if(jobs.find(j=>j.title===role.title&&j.company==="(Suggested Role)"))return;
    const updated=[{id:genId(),title:role.title,company:"(Suggested Role)",location:"",url:"",description:role.whyFit,status:"saved",notes:"",savedAt:new Date().toISOString()},...jobs];
    setJobs(updated);store.setJobs(updated);
  }

  const gc=g=>g==="High"?T.green:g==="Medium"?T.amber:T.textMute;
  const gb=g=>g==="High"?T.greenBg:g==="Medium"?T.amberBg:T.bg;

  return(
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <PH title="Suggested Roles" subtitle="AI-powered role suggestions based on your profile"
        action={<Btn onClick={generate} disabled={loading}>{loading?<><Spinner color="#fff"/> Analyzing…</>:generated?"↺ Regenerate":"✨ Generate Suggestions"}</Btn>}/>
      <div style={{padding:"18px 32px"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
          {profile.targetTitle&&<Chip label={"🎯 "+profile.targetTitle} color={T.primary}/>}
          {profile.industry&&<Chip label={"🏭 "+profile.industry} color={T.teal}/>}
          {profile.seniority&&<Chip label={"📈 "+profile.seniority} color={T.violet}/>}
          {profile.useCompanyPrefs&&profile.lifestyleVibe&&<Chip label={"✨ "+profile.lifestyleVibe.slice(0,40)} color={T.amber}/>}
          {!profile.targetTitle&&!profile.industry&&<div style={{fontSize:13,color:T.textMute}}>Fill out your Profile to get better suggestions.</div>}
        </div>

        {error&&<div style={{fontSize:13,color:T.red,background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:16}}>{error}</div>}

        {!generated&&!loading&&(
          <div style={{textAlign:"center",padding:"80px 0",color:T.textMute}}>
            <div style={{fontSize:44,marginBottom:14}}>🧭</div>
            <div style={{fontSize:15,fontWeight:600,color:T.textSub,marginBottom:6}}>Discover your best-fit roles</div>
            <div style={{fontSize:13,maxWidth:380,margin:"0 auto"}}>Click "Generate Suggestions" to get personalized role recommendations.</div>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
          {roles.map((role,i)=>{
            const saved=jobs.find(j=>j.title===role.title&&j.company==="(Suggested Role)");
            return(
              <Card key={i} style={{display:"flex",flexDirection:"column"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1,marginRight:10}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2}}>{role.title}</div>
                    <div style={{fontSize:12,color:T.primary,fontWeight:600}}>{role.category}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:gc(role.growthOutlook),background:gb(role.growthOutlook),borderRadius:20,padding:"2px 9px",border:`1px solid ${gc(role.growthOutlook)}30`,whiteSpace:"nowrap"}}>{role.growthOutlook} Growth</span>
                </div>
                <div style={{fontSize:12,color:T.textSub,lineHeight:1.6,marginBottom:10}}>{role.whyFit}</div>
                {role.salaryRange&&<div style={{fontSize:12,color:T.text,fontWeight:600,marginBottom:10}}>💰 {role.salaryRange}</div>}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.textMute,marginBottom:6,letterSpacing:"0.05em",textTransform:"uppercase"}}>Key Skills</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {role.skills?.map(s=><span key={s} style={{fontSize:11,color:T.teal,background:T.tealBg,border:`1px solid ${T.tealBorder}`,borderRadius:20,padding:"2px 8px",fontWeight:600}}>{s}</span>)}
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.textMute,marginBottom:6,letterSpacing:"0.05em",textTransform:"uppercase"}}>Typical Companies</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {role.typicalCompanies?.map(c=><span key={c} style={{fontSize:11,color:T.textSub,background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 8px"}}>{c}</span>)}
                  </div>
                </div>
                <div style={{marginTop:"auto",paddingTop:10,borderTop:`1px solid ${T.border}`}}>
                  <Btn onClick={()=>saveRole(role)} variant={saved?"success":"secondary"} small full>{saved?"✓ Added to Tracker":"+ Add to Tracker"}</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOB SEARCH VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function SearchView({docs,jobs,setJobs}){
  const [query,setQuery]=useState("");
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(false);
  const [parsed,setParsed]=useState(null);
  const [error,setError]=useState("");
  const profile=store.getProfile();

  async function search(){
    if(!query.trim())return;
    setLoading(true);setError("");setResults([]);setParsed(null);
    try{
      const raw=await callClaude(
        `You are a job search assistant. Parse the query and return ONLY valid JSON with keys: "parsed" (title, seniority, keywords array, location, remote boolean, industry) and "listings" (array of 6: title, company, location, url, description).`,
        `Query: ${query}${profile.targetTitle?`\nUser targets: ${profile.targetTitle}`:""}${profile.keywords?`\nUser keywords: ${profile.keywords}`:""}${profile.useCompanyPrefs&&profile.targetCompanies?`\nPreferred companies: ${profile.targetCompanies}`:""}${profile.useCompanyPrefs&&profile.lifestyleVibe?`\nCulture: ${profile.lifestyleVibe}`:""}`,
        2000
      );
      const data=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setParsed(data.parsed);setResults(data.listings||[]);
    }catch{setError("Search failed — try rephrasing.");}
    setLoading(false);
  }

  function saveJob(job){
    if(jobs.find(j=>j.title===job.title&&j.company===job.company))return;
    const updated=[{id:genId(),...job,status:"saved",notes:"",savedAt:new Date().toISOString()},...jobs];
    setJobs(updated);store.setJobs(updated);
  }

  return(
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <PH title="Job Search" subtitle="Describe your ideal role in plain English"/>
      <div style={{padding:"18px 32px"}}>
        {profile.useCompanyPrefs&&(profile.targetCompanies||profile.lifestyleVibe)&&(
          <div style={{fontSize:12,color:T.violet,background:T.violetBg,border:`1px solid ${T.violetBorder}`,borderRadius:8,padding:"8px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
            <span>✦</span><span><strong>Profile preferences active:</strong> company type and culture vibe are included in your search.</span>
          </div>
        )}
        <div style={{display:"flex",gap:10,marginBottom:18}}>
          <AppInput value={query} onChange={setQuery} placeholder='e.g. "Remote senior product designer at a fintech startup"' style={{flex:1}}/>
          <Btn onClick={search} disabled={loading}>{loading?<><Spinner color="#fff"/> Searching…</>:"Search"}</Btn>
        </div>
        {error&&<div style={{fontSize:13,color:T.red,background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:16}}>{error}</div>}
        {parsed&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:18,alignItems:"center"}}>
            {[["Role",parsed.title],["Level",parsed.seniority],["Location",parsed.location],["Remote",parsed.remote?"Yes":null],["Industry",parsed.industry]].map(([k,v])=>v&&(
              <div key={k} style={{fontSize:12,background:T.primaryLight,border:`1px solid ${T.primaryMid}`,borderRadius:6,padding:"3px 10px"}}>
                <span style={{color:T.textMute}}>{k}: </span><span style={{color:T.primary,fontWeight:600}}>{v}</span>
              </div>
            ))}
            {parsed.keywords?.map(kw=><span key={kw} style={{fontSize:11,color:T.teal,background:T.tealBg,border:`1px solid ${T.tealBorder}`,borderRadius:20,padding:"3px 10px",fontWeight:600}}>{kw}</span>)}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {results.map((job,i)=>{
            const isSaved=jobs.find(j=>j.title===job.title&&j.company===job.company);
            return(
              <Card key={i}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{flex:1,marginRight:10}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2}}>{job.title}</div>
                    <div style={{fontSize:12,color:T.primary,fontWeight:600}}>{job.company}</div>
                    <div style={{fontSize:11,color:T.textMute,marginTop:2}}>{job.location}</div>
                  </div>
                  <Btn onClick={()=>saveJob(job)} variant={isSaved?"success":"secondary"} small>{isSaved?"✓ Saved":"+ Save"}</Btn>
                </div>
                <div style={{fontSize:12,color:T.textSub,lineHeight:1.6}}>{job.description}</div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKER VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function TrackerView({jobs,setJobs,docs}){
  const [openId,setOpenId]=useState(null);
  const [editNotes,setEditNotes]=useState("");
  const [editingNoteId,setEditingNoteId]=useState(null);
  const [filterStatus,setFilterStatus]=useState("all");
  const [sortBy,setSortBy]=useState("date");

  function updateStatus(id,status){const u=jobs.map(j=>j.id===id?{...j,status}:j);setJobs(u);store.setJobs(u);}
  function saveNotes(id){const u=jobs.map(j=>j.id===id?{...j,notes:editNotes}:j);setJobs(u);store.setJobs(u);setEditingNoteId(null);}
  function deleteJob(id){const u=jobs.filter(j=>j.id!==id);setJobs(u);store.setJobs(u);if(openId===id)setOpenId(null);}

  const filtered=jobs.filter(j=>filterStatus==="all"||j.status===filterStatus).sort((a,b)=>{
    if(sortBy==="date")return new Date(b.savedAt)-new Date(a.savedAt);
    if(sortBy==="company")return(a.company||"").localeCompare(b.company||"");
    return(a.title||"").localeCompare(b.title||"");
  });
  const counts=STATUS_OPTIONS.reduce((acc,s)=>({...acc,[s]:jobs.filter(j=>j.status===s).length}),{});

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.bg}}>
      <PH title="Application Tracker" subtitle={`${jobs.length} application${jobs.length!==1?"s":""} tracked`}
        action={<Btn onClick={()=>exportCSV(jobs,docs)} variant="ghost">↓ Export CSV</Btn>}/>

      <div style={{padding:"14px 32px 0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",flexShrink:0}}>
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

      <div style={{flex:1,overflow:"auto",padding:"12px 32px 24px"}}>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"60px 0",color:T.textMute}}>
            <div style={{fontSize:36,marginBottom:10}}>📭</div>
            <div style={{fontSize:14,color:T.textSub,fontWeight:600,marginBottom:4}}>No applications here</div>
            <div style={{fontSize:13}}>Save jobs from Job Search or Suggested Roles to start tracking.</div>
          </div>
        )}
        {filtered.length>0&&(
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1.4fr 1fr 100px 130px 32px",padding:"10px 16px",
              background:T.bg,borderBottom:`1px solid ${T.border}`,
              fontSize:11,fontWeight:700,color:T.textMute,letterSpacing:"0.05em",textTransform:"uppercase",gap:12}}>
              <div>Role</div><div>Company</div><div>Location</div><div>Date</div><div>Status</div><div/>
            </div>
            {filtered.map((job,i)=>{
              const isOpen=openId===job.id;
              const m=STATUS_META[job.status]||STATUS_META.saved;
              return(
                <div key={job.id} style={{borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none"}}>
                  <div onClick={()=>setOpenId(isOpen?null:job.id)}
                    style={{display:"grid",gridTemplateColumns:"2fr 1.4fr 1fr 100px 130px 32px",
                      padding:"12px 16px",gap:12,cursor:"pointer",alignItems:"center",
                      background:isOpen?T.primaryLight:"transparent",transition:"background 0.1s",
                      borderLeft:`3px solid ${isOpen?T.primary:"transparent"}`}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{job.title||"—"}</div>
                      {job.notes&&!isOpen&&<div style={{fontSize:11,color:T.textMute,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:260}}>📝 {job.notes}</div>}
                    </div>
                    <div style={{fontSize:13,color:T.primary,fontWeight:500}}>{job.company||"—"}</div>
                    <div style={{fontSize:12,color:T.textSub}}>{job.location||"—"}</div>
                    <div style={{fontSize:12,color:T.textMute}}>{job.savedAt?.slice(0,10)||"—"}</div>
                    <div onClick={e=>e.stopPropagation()}>
                      <Sel value={job.status} onChange={v=>updateStatus(job.id,v)}
                        options={STATUS_OPTIONS.map(s=>({value:s,label:STATUS_META[s].label}))}
                        style={{padding:"4px 8px",fontSize:12,color:m.color,background:m.bg,border:`1px solid ${m.border}`,borderRadius:20}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"center"}}>
                      <span style={{fontSize:13,color:T.textMute,display:"inline-block",transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.15s"}}>▾</span>
                    </div>
                  </div>

                  {isOpen&&(
                    <div style={{background:"#FAFBFF",borderTop:`1px solid ${T.primaryMid}`,padding:"16px 20px 16px 36px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
                        <div>
                          <FL>Notes</FL>
                          {editingNoteId===job.id?(
                            <><TA value={editNotes} onChange={setEditNotes} rows={3}/>
                              <div style={{marginTop:8,display:"flex",gap:6}}>
                                <Btn onClick={()=>saveNotes(job.id)} small>Save</Btn>
                                <Btn onClick={()=>setEditingNoteId(null)} variant="ghost" small>Cancel</Btn>
                              </div></>
                          ):(
                            <div onClick={()=>{setEditingNoteId(job.id);setEditNotes(job.notes||"");}}
                              style={{fontSize:13,color:job.notes?T.textSub:T.textMute,background:T.surface,borderRadius:8,padding:"8px 12px",border:`1px dashed ${T.border}`,cursor:"pointer",minHeight:52,lineHeight:1.6}}>
                              {job.notes||<em>Click to add notes…</em>}
                            </div>
                          )}
                        </div>
                        <div>
                          <FL>Tailored Resume Summary</FL>
                          <div style={{fontSize:12,color:job.tailoredResume?T.textSub:T.textMute,background:T.surface,borderRadius:8,padding:"8px 12px",border:`1px solid ${T.border}`,minHeight:52,lineHeight:1.6,maxHeight:100,overflow:"auto"}}>
                            {job.tailoredResume||<em style={{color:T.textMute}}>Not tailored yet — use Tailor AI.</em>}
                          </div>
                        </div>
                        <div>
                          {job.keywords?.length>0&&(<>
                            <FL>Keyword Match</FL>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
                              {job.keywords.map(kw=><span key={kw} style={{fontSize:11,color:T.teal,background:T.tealBg,border:`1px solid ${T.tealBorder}`,borderRadius:20,padding:"2px 7px",fontWeight:600}}>{kw}</span>)}
                            </div>
                          </>)}
                          {job.url&&<div style={{marginBottom:10}}><a href={job.url} target="_blank" rel="noreferrer" style={{fontSize:12,fontWeight:600}}>↗ View Listing</a></div>}
                          <Btn onClick={()=>deleteJob(job.id)} variant="danger" small>Delete</Btn>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAILOR VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function TailorView({docs,jobs,setJobs}){
  const [resumeId,setResumeId]=useState("");
  const [coverId,setCoverId]=useState("");
  const [jobId,setJobId]=useState("");
  const [jd,setJd]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const resumes=docs.filter(d=>d.type==="resume"); const covers=docs.filter(d=>d.type==="cover_letter");
  function onJobSel(id){setJobId(id);const j=jobs.find(x=>x.id===id);if(j?.description)setJd(j.description);}

  async function tailor(){
    const resume=docs.find(d=>d.id===resumeId); const cover=docs.find(d=>d.id===coverId);
    if(!resume&&!cover){setError("Select at least one document.");return;}
    if(!jd.trim()){setError("Paste a job description.");return;}
    setLoading(true);setError("");setResult(null);
    try{
      const raw=await callClaude(
        `Expert resume/cover letter editor. Rules: NEVER fabricate. Only reframe existing content. Mirror JD keywords. Return ONLY valid JSON: tailored_resume_summary, tailored_cover_letter, keyword_alignment (array), skills_match_summary, match_score (0-100).`,
        `Job Description:\n${jd}\n\nResume:\n${resume?.content||"(not provided)"}\n\nCover Letter:\n${cover?.content||"(not provided)"}`,
        2000
      );
      const data=JSON.parse(raw.replace(/```json|```/g,"").trim());setResult(data);
      if(jobId){
        const u=jobs.map(j=>j.id===jobId?{...j,tailoredResume:data.tailored_resume_summary,tailoredCover:data.tailored_cover_letter,keywords:data.keyword_alignment,matchScore:data.match_score,resumeDocId:resumeId,coverDocId:coverId}:j);
        setJobs(u);store.setJobs(u);
      }
    }catch{setError("Tailoring failed. Try again.");}
    setLoading(false);
  }

  const sc=s=>s>70?T.green:s>40?T.amber:T.red;

  return(
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <PH title="Tailor AI" subtitle="Customize your documents to match any job listing"/>
      <div style={{padding:"18px 32px",display:"flex",gap:20,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 320px",minWidth:0}}>
          <Card>
            <SH icon="1️⃣" title="Select documents"/>
            <div style={{marginBottom:12}}><FL>Resume / CV</FL><Sel value={resumeId} onChange={setResumeId} options={[{value:"",label:"Select resume…"},...resumes.map(d=>({value:d.id,label:d.tag}))]}/></div>
            <div style={{marginBottom:16}}><FL>Cover Letter</FL><Sel value={coverId} onChange={setCoverId} options={[{value:"",label:"Select cover letter…"},...covers.map(d=>({value:d.id,label:d.tag}))]}/></div>
            <Divider/>
            <SH icon="2️⃣" title="Job details"/>
            <div style={{marginBottom:12}}><FL>Link to saved job (optional)</FL><Sel value={jobId} onChange={onJobSel} options={[{value:"",label:"Select saved job…"},...jobs.map(j=>({value:j.id,label:`${j.title} @ ${j.company}`}))]}/></div>
            <div style={{marginBottom:16}}><FL>Job Description</FL><TA value={jd} onChange={setJd} placeholder="Paste the full job description here..." rows={10}/></div>
            {error&&<div style={{fontSize:13,color:T.red,background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:12}}>{error}</div>}
            <Btn onClick={tailor} full disabled={loading}>{loading?<><Spinner color="#fff"/> Tailoring…</>:"✨ Generate Tailored Content"}</Btn>
          </Card>
        </div>
        <div style={{flex:"1 1 320px",minWidth:0}}>
          {!result&&!loading&&(
            <div style={{textAlign:"center",padding:"80px 20px",color:T.textMute}}>
              <div style={{fontSize:44,marginBottom:12}}>✨</div>
              <div style={{fontSize:15,fontWeight:600,marginBottom:6,color:T.textSub}}>Ready to tailor</div>
              <div style={{fontSize:13}}>Select documents and paste a job description</div>
            </div>
          )}
          {result&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <Card style={{borderColor:sc(result.match_score)+"50"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.text}}>Match Score</div>
                  <div style={{fontSize:30,fontWeight:800,color:sc(result.match_score)}}>{result.match_score}%</div>
                </div>
                <div style={{width:"100%",height:6,background:T.border,borderRadius:99,overflow:"hidden",marginBottom:10}}>
                  <div style={{height:"100%",width:`${result.match_score}%`,background:sc(result.match_score),borderRadius:99,transition:"width 0.8s ease"}}/>
                </div>
                <div style={{fontSize:13,color:T.textSub,lineHeight:1.6}}>{result.skills_match_summary}</div>
              </Card>
              <Card><FL>Keyword Alignment</FL>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {result.keyword_alignment?.map(kw=><span key={kw} style={{fontSize:12,color:T.teal,background:T.tealBg,border:`1px solid ${T.tealBorder}`,borderRadius:20,padding:"3px 10px",fontWeight:600}}>{kw}</span>)}
                </div>
              </Card>
              {result.tailored_resume_summary&&(
                <Card>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <FL>Tailored Resume Summary</FL>
                    <Btn onClick={()=>navigator.clipboard.writeText(result.tailored_resume_summary)} variant="ghost" small>Copy</Btn>
                  </div>
                  <div style={{fontSize:13,color:T.textSub,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{result.tailored_resume_summary}</div>
                </Card>
              )}
              {result.tailored_cover_letter&&(
                <Card>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <FL>Tailored Cover Letter</FL>
                    <Btn onClick={()=>navigator.clipboard.writeText(result.tailored_cover_letter)} variant="ghost" small>Copy</Btn>
                  </div>
                  <div style={{fontSize:13,color:T.textSub,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{result.tailored_cover_letter}</div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR + APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function AppShell({docs,setDocs,jobs,setJobs,userName,onLogout}){
  const [active,setActive]=useState("profile");
  const nav=[
    {id:"profile",   icon:"👤", label:"Profile"},
    {id:"suggested", icon:"🧭", label:"Suggested Roles"},
    {id:"search",    icon:"🔍", label:"Job Search"},
    {id:"tracker",   icon:"📊", label:"Tracker"},
    {id:"tailor",    icon:"✨", label:"Tailor AI"},
  ];

  const views={
    profile:   <ProfileView   docs={docs} setDocs={setDocs} userName={userName}/>,
    suggested: <SuggestedView docs={docs} jobs={jobs} setJobs={setJobs}/>,
    search:    <SearchView    docs={docs} jobs={jobs} setJobs={setJobs}/>,
    tracker:   <TrackerView   jobs={jobs} setJobs={setJobs} docs={docs}/>,
    tailor:    <TailorView    docs={docs} jobs={jobs} setJobs={setJobs}/>,
  };

  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
      <aside style={{width:190,background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,padding:"16px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 8px 16px",marginBottom:6,borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:`linear-gradient(135deg,${T.primary},#0891b2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>J</div>
          <div style={{fontSize:13,fontWeight:800,color:T.text,lineHeight:1.25}}>Job<br/>Assistant</div>
        </div>
        <nav style={{display:"flex",flexDirection:"column",gap:2,marginTop:2,flex:1}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setActive(n.id)} style={{
              display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:8,border:"none",
              cursor:"pointer",width:"100%",background:active===n.id?T.primaryLight:"transparent",
              color:active===n.id?T.primary:T.textSub,fontFamily:"inherit",fontSize:13,
              fontWeight:active===n.id?700:500,transition:"all 0.12s",textAlign:"left"
            }}>
              <span style={{fontSize:15,flexShrink:0}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {active===n.id&&<div style={{width:5,height:5,borderRadius:"50%",background:T.primary,flexShrink:0}}/>}
            </button>
          ))}
        </nav>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12,marginTop:4}}>
          <div style={{fontSize:12,color:T.textMute,padding:"4px 10px 8px",fontWeight:500}}>
            👋 {userName}
          </div>
          <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",width:"100%",background:"transparent",color:T.textMute,fontFamily:"inherit",fontSize:12,fontWeight:500,transition:"all 0.12s",textAlign:"left"}}
            onMouseEnter={e=>{e.currentTarget.style.background=T.redBg;e.currentTarget.style.color=T.red;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.textMute;}}>
            <span style={{fontSize:14}}>→</span> Sign out
          </button>
        </div>
      </aside>
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.bg}}>
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
  const [userName,setUserName]=useState("");
  const [docs,setDocs]=useState(()=>store.getDocs());
  const [jobs,setJobs]=useState(()=>store.getJobs());

  if(!loggedIn){
    return(
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
          input::placeholder{color:${LT.textMute};}
          @keyframes float{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-30px) scale(1.05);}}
          @keyframes slideInLeft{from{opacity:0;transform:translateX(-40px);}to{opacity:1;transform:translateX(0);}}
          @keyframes slideInRight{from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);}}
          @keyframes spin{to{transform:rotate(360deg);}}
        `}</style>
        <LandingPage onLogin={(name)=>{setUserName(name);setLoggedIn(true);}}/>
      </>
    );
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
        button:not(:disabled):hover{opacity:0.86;}
      `}</style>
      <AppShell docs={docs} setDocs={setDocs} jobs={jobs} setJobs={setJobs}
        userName={userName} onLogout={()=>setLoggedIn(false)}/>
    </>
  );
}
