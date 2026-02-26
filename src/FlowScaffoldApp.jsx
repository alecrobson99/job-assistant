import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "./supabase";

const ROUTES = {
  landing: "/",
  signup: "/signup",
  login: "/login",
  verify: "/verify-email",
  forgot: "/forgot-password",
  free: "/app/free",
  limit: "/app/limit",
  upgrade: "/upgrade",
  payment: "/billing/confirmation",
  pro: "/app/pro",
  settings: "/settings",
  billing: "/settings/billing",
};

function useRouter() {
  const [path, setPath] = useState(window.location.pathname || "/");
  const [search, setSearch] = useState(window.location.search || "");

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname || "/");
      setSearch(window.location.search || "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (nextPath, nextSearch = "") => {
    window.history.pushState({}, "", `${nextPath}${nextSearch}`);
    setPath(nextPath);
    setSearch(nextSearch);
  };

  return { path, search, navigate };
}

function Page({ title, children }) {
  return (
    <div style={{ maxWidth: 760, margin: "24px auto", padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div style={{ marginBottom: 10 }}>{children}</div>;
}

function useAuthAndPlan() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [verified, setVerified] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const currentUser = data?.user || null;
      setUser(currentUser);
      setVerified(Boolean(currentUser?.email_confirmed_at));

      if (currentUser) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("subscription-status");
        if (fnError) throw fnError;
        const status = fnData?.status || "inactive";
        setSubscriptionStatus(status);
        setPaid(fnData?.active === true);
      } else {
        setSubscriptionStatus("inactive");
        setPaid(false);
      }
    } catch (e) {
      setError(e?.message || "Auth/plan check failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { loading, user, verified, subscriptionStatus, paid, error, refresh };
}

function LandingScreen({ navigate }) {
  return (
    <Page title="Landing">
      <p>Core value statement, product summary, and flow summary.</p>
      <Row>
        <button onClick={() => navigate(ROUTES.signup)}>Sign up</button>{" "}
        <button onClick={() => navigate(ROUTES.login)}>Log in</button>
      </Row>
    </Page>
  );
}

function SignupScreen({ navigate, onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseClient();
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      await onAuthed();
      navigate(ROUTES.verify);
    } catch (err) {
      setError(err?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page title="Signup">
      <form onSubmit={submit}>
        <Row>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Row>
        <Row>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Row>
        <Row>
          <button disabled={loading} type="submit">{loading ? "Creating..." : "Continue"}</button>
        </Row>
      </form>
      {error && <p>ERROR: {error}</p>}
      <button onClick={() => navigate(ROUTES.login)}>Already have account</button>
    </Page>
  );
}

function VerifyEmailScreen({ navigate, onRefreshAuth, user }) {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function resend() {
    setErr("");
    setMsg("");
    try {
      const supabase = getSupabaseClient();
      const email = user?.email;
      if (!email) throw new Error("Missing user email.");
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setMsg("Verification email resent.");
    } catch (e) {
      setErr(e?.message || "Resend failed.");
    }
  }

  return (
    <Page title="Email verification">
      <p>Check your inbox and verify your email.</p>
      <Row>
        <button onClick={async () => { await onRefreshAuth(); navigate(ROUTES.login); }}>I verified, continue</button>{" "}
        <button onClick={resend}>Resend email</button>
      </Row>
      {msg && <p>{msg}</p>}
      {err && <p>ERROR: {err}</p>}
    </Page>
  );
}

function LoginScreen({ navigate, onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      await onAuthed();
      navigate(ROUTES.free);
    } catch (err) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page title="Login">
      <form onSubmit={submit}>
        <Row>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Row>
        <Row>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Row>
        <Row>
          <button disabled={loading} type="submit">{loading ? "Signing in..." : "Log in"}</button>
        </Row>
      </form>
      {error && <p>ERROR: {error}</p>}
      <button onClick={() => navigate(ROUTES.forgot)}>Forgot password</button>
    </Page>
  );
}

function ForgotPasswordScreen({ navigate }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function sendReset() {
    setMsg("");
    setErr("");
    try {
      const supabase = getSupabaseClient();
      const redirectTo = `${window.location.origin}${ROUTES.login}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setMsg("If account exists, reset link was sent.");
    } catch (e) {
      setErr(e?.message || "Reset request failed.");
    }
  }

  return (
    <Page title="Forgot password">
      <Row>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Row>
      <Row>
        <button onClick={sendReset}>Send reset link</button>{" "}
        <button onClick={() => navigate(ROUTES.login)}>Back to login</button>
      </Row>
      {msg && <p>{msg}</p>}
      {err && <p>ERROR: {err}</p>}
    </Page>
  );
}

function FreeDashboardScreen({ navigate }) {
  const [remaining, setRemaining] = useState(1);
  return (
    <Page title="Free dashboard">
      <p>Free features available. Quota demo for metered action.</p>
      <p>Remaining free usage: {remaining}</p>
      <Row>
        <button onClick={() => {
          // TODO: replace local state with server-enforced quota checks.
          if (remaining <= 0) navigate(ROUTES.limit);
          else setRemaining((r) => r - 1);
        }}>
          Run metered action
        </button>{" "}
        <button onClick={() => navigate(ROUTES.upgrade)}>Upgrade to Pro</button>
      </Row>
      <Row>
        <button onClick={() => navigate(ROUTES.settings)}>Account settings</button>
      </Row>
    </Page>
  );
}

function LimitReachedScreen({ navigate }) {
  return (
    <Page title="Usage limit reached">
      <p>You reached your free plan limit.</p>
      <Row>
        <button onClick={() => navigate(ROUTES.upgrade)}>Upgrade to Pro</button>{" "}
        <button onClick={() => navigate(ROUTES.free)}>Back</button>
      </Row>
    </Page>
  );
}

function UpgradeScreen({ navigate }) {
  const [plan, setPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function startCheckout() {
    setLoading(true);
    setErr("");
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Missing checkout URL.");
      window.location.assign(data.url);
    } catch (e) {
      setErr(e?.message || "Checkout start failed.");
      setLoading(false);
    }
  }

  return (
    <Page title="Upgrade to Pro">
      <Row>
        <label>
          <input type="radio" checked={plan === "monthly"} onChange={() => setPlan("monthly")} />
          Monthly
        </label>{" "}
        <label>
          <input type="radio" checked={plan === "yearly"} onChange={() => setPlan("yearly")} />
          Yearly
        </label>
      </Row>
      <Row>
        <button disabled={loading} onClick={startCheckout}>{loading ? "Redirecting..." : "Continue to payment"}</button>{" "}
        <button onClick={() => navigate(ROUTES.free)}>Back</button>
      </Row>
      {err && <p>ERROR: {err}</p>}
    </Page>
  );
}

function PaymentConfirmationScreen({ navigate, onRefreshAuthPlan, paid }) {
  const [msg, setMsg] = useState("Processing payment confirmation...");
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    const state = await onRefreshAuthPlan();
    if (state?.paid) {
      setMsg("Payment confirmed.");
      navigate(ROUTES.pro);
    } else {
      setErr("Still unpaid or pending sync. Try again.");
    }
  }

  useEffect(() => {
    if (paid) {
      navigate(ROUTES.pro);
      return;
    }
    // TODO: switch this to bounded polling with timeout.
    setMsg("Payment return detected. Click refresh status.");
  }, [paid, navigate]);

  return (
    <Page title="Payment confirmation">
      <p>{msg}</p>
      <Row>
        <button onClick={refresh}>Refresh status</button>{" "}
        <button onClick={() => navigate(ROUTES.free)}>Go to free dashboard</button>
      </Row>
      {err && <p>ERROR: {err}</p>}
    </Page>
  );
}

function ProDashboardScreen({ navigate }) {
  return (
    <Page title="Pro dashboard">
      <p>Pro features unlocked.</p>
      <Row>
        <button onClick={() => navigate(ROUTES.settings)}>Account settings</button>{" "}
        <button onClick={() => navigate(ROUTES.billing)}>Manage subscription</button>
      </Row>
    </Page>
  );
}

function SettingsScreen({ navigate, user, subscriptionStatus, paid, onLogout }) {
  return (
    <Page title="Account / settings">
      <p>Email: {user?.email || "unknown"}</p>
      <p>Subscription status: {subscriptionStatus}</p>
      <p>Plan access: {paid ? "Pro" : "Free"}</p>
      <Row>
        <button onClick={() => navigate(ROUTES.billing)}>Subscription management</button>{" "}
        <button onClick={onLogout}>Log out</button>
      </Row>
    </Page>
  );
}

function BillingManagementScreen({ navigate }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function openPortal() {
    setLoading(true);
    setErr("");
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke("create-portal-session");
      if (error) throw error;
      if (!data?.url) throw new Error("Missing portal URL.");
      window.location.assign(data.url);
    } catch (e) {
      setErr(e?.message || "Could not open billing portal.");
      setLoading(false);
    }
  }

  return (
    <Page title="Subscription management">
      <Row>
        <button disabled={loading} onClick={openPortal}>{loading ? "Opening..." : "Open billing portal"}</button>{" "}
        <button onClick={() => navigate(ROUTES.settings)}>Back</button>
      </Row>
      {err && <p>ERROR: {err}</p>}
    </Page>
  );
}

export default function FlowScaffoldApp() {
  const { path, search, navigate } = useRouter();
  const authPlan = useAuthAndPlan();

  const query = useMemo(() => new URLSearchParams(search), [search]);

  useEffect(() => {
    if (authPlan.loading) return;

    const publicRoutes = new Set([
      ROUTES.landing,
      ROUTES.signup,
      ROUTES.login,
      ROUTES.forgot,
    ]);

    if (!authPlan.user && !publicRoutes.has(path)) {
      navigate(ROUTES.login);
      return;
    }

    if (authPlan.user && !authPlan.verified && path !== ROUTES.verify) {
      navigate(ROUTES.verify);
      return;
    }

    if (authPlan.user && authPlan.verified) {
      if (query.get("billing") && path !== ROUTES.payment) {
        navigate(ROUTES.payment, search);
        return;
      }
      if (!authPlan.paid && path === ROUTES.pro) {
        navigate(ROUTES.free);
      }
    }
  }, [authPlan.loading, authPlan.user, authPlan.verified, authPlan.paid, path, navigate, query, search]);

  async function handleLogout() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    await authPlan.refresh();
    navigate(ROUTES.landing);
  }

  if (authPlan.loading) {
    return <Page title="Loading"><p>Checking auth and subscription...</p></Page>;
  }

  if (authPlan.error) {
    return (
      <Page title="System state error">
        <p>ERROR: {authPlan.error}</p>
        <button onClick={authPlan.refresh}>Retry</button>
      </Page>
    );
  }

  if (path === ROUTES.landing) return <LandingScreen navigate={navigate} />;
  if (path === ROUTES.signup) return <SignupScreen navigate={navigate} onAuthed={authPlan.refresh} />;
  if (path === ROUTES.login) return <LoginScreen navigate={navigate} onAuthed={authPlan.refresh} />;
  if (path === ROUTES.forgot) return <ForgotPasswordScreen navigate={navigate} />;
  if (path === ROUTES.verify) return <VerifyEmailScreen navigate={navigate} onRefreshAuth={authPlan.refresh} user={authPlan.user} />;
  if (path === ROUTES.free) return <FreeDashboardScreen navigate={navigate} />;
  if (path === ROUTES.limit) return <LimitReachedScreen navigate={navigate} />;
  if (path === ROUTES.upgrade) return <UpgradeScreen navigate={navigate} />;
  if (path === ROUTES.payment) return <PaymentConfirmationScreen navigate={navigate} onRefreshAuthPlan={authPlan.refresh} paid={authPlan.paid} />;
  if (path === ROUTES.pro) return <ProDashboardScreen navigate={navigate} />;
  if (path === ROUTES.settings) return <SettingsScreen navigate={navigate} user={authPlan.user} subscriptionStatus={authPlan.subscriptionStatus} paid={authPlan.paid} onLogout={handleLogout} />;
  if (path === ROUTES.billing) return <BillingManagementScreen navigate={navigate} />;

  return (
    <Page title="Not found">
      <p>Unknown route: {path}</p>
      <button onClick={() => navigate(ROUTES.landing)}>Go home</button>
    </Page>
  );
}
