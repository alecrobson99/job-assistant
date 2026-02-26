import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient as createSupabaseClient } from "./supabase";

const PREMIUM_PRICE_ID = "price_1T4I2sBWU2sVjaR70RXgIZv1";
const FREE_PRICE_ID = "price_1T4I3DBWU2sVjaR7wBYD2vAR";
const FREE_USAGE_LIMITS = {
  starterSearches: 5,
  roleFitChecks: 3,
};

const ROUTES = {
  landing: "/",
  auth: "/auth",
  pricing: "/pricing",
  billingReturn: "/billing/return",
  onboarding: "/onboarding",
  app: "/app",
};

let supabaseSingleton;
function getSupabaseClient() {
  if (!supabaseSingleton) {
    supabaseSingleton = createSupabaseClient();
  }
  return supabaseSingleton;
}

function parseSearch(search) {
  return new URLSearchParams(search || "");
}

function useRouter() {
  const [route, setRoute] = useState({
    path: window.location.pathname,
    search: window.location.search,
  });

  useEffect(() => {
    const onPopState = () => {
      setRoute({ path: window.location.pathname, search: window.location.search });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to, opts = {}) => {
    const method = opts.replace ? "replaceState" : "pushState";
    if (`${window.location.pathname}${window.location.search}` === to) return;
    window.history[method]({}, "", to);
    setRoute({ path: window.location.pathname, search: window.location.search });
  }, []);

  return { route, navigate };
}

function useAuth() {
  const [state, setState] = useState({ user: null, session: null, loading: true });

  useEffect(() => {
    const supabase = getSupabaseClient();
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setState({ user: null, session: null, loading: false });
          return;
        }
        setState({
          user: data.session?.user ?? null,
          session: data.session ?? null,
          loading: false,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setState({ user: null, session: null, loading: false });
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session: session ?? null, loading: false });
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}

function useProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError("");
      return null;
    }

    setLoading(true);
    setError("");
    const supabase = getSupabaseClient();

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("id,email,name,target_title,location,search_radius_km,onboarding_completed_at")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message || "Unable to load profile.");
      setLoading(false);
      return null;
    }

    setProfile(data || null);
    setLoading(false);
    return data || null;
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, loading, error, refresh, setProfile };
}

function defaultEntitlements(userId) {
  return {
    user_id: userId || null,
    tier: "free",
    has_premium: false,
    premium_period_end: null,
    stripe_price_id: FREE_PRICE_ID,
  };
}

function useEntitlements(userId) {
  const [entitlements, setEntitlements] = useState(defaultEntitlements(userId));
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!userId) {
      const fallback = defaultEntitlements(null);
      setEntitlements(fallback);
      setLoading(false);
      setError("");
      return fallback;
    }

    setLoading(true);
    setError("");
    const supabase = getSupabaseClient();

    const { data, error: fetchError } = await supabase
      .from("user_entitlements")
      .select("user_id,tier,has_premium,premium_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message || "Unable to load entitlements.");
      const fallback = defaultEntitlements(userId);
      setEntitlements(fallback);
      setLoading(false);
      return fallback;
    }

    const nextValue = data
      ? {
          ...data,
          tier: data.tier || (data.has_premium ? "premium" : "free"),
          has_premium: Boolean(data.has_premium),
          stripe_price_id: data.has_premium ? PREMIUM_PRICE_ID : FREE_PRICE_ID,
        }
      : defaultEntitlements(userId);

    setEntitlements(nextValue);
    setLoading(false);
    return nextValue;
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entitlements, loading, error, refresh };
}

function useFeatureUsage(userId, hasPremium) {
  const [usage, setUsage] = useState({ starterSearches: 0, roleFitChecks: 0 });

  useEffect(() => {
    if (!userId) {
      setUsage({ starterSearches: 0, roleFitChecks: 0 });
      return;
    }
    try {
      const raw = window.localStorage.getItem(`job-assistant-usage:${userId}`);
      if (!raw) {
        setUsage({ starterSearches: 0, roleFitChecks: 0 });
        return;
      }
      const parsed = JSON.parse(raw);
      setUsage({
        starterSearches: Number(parsed?.starterSearches || 0),
        roleFitChecks: Number(parsed?.roleFitChecks || 0),
      });
    } catch {
      setUsage({ starterSearches: 0, roleFitChecks: 0 });
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(`job-assistant-usage:${userId}`, JSON.stringify(usage));
  }, [usage, userId]);

  const remaining = useCallback(
    (feature) => {
      if (hasPremium) return Infinity;
      const limit = FREE_USAGE_LIMITS[feature] ?? 0;
      return Math.max(0, limit - (usage[feature] ?? 0));
    },
    [hasPremium, usage]
  );

  const consume = useCallback(
    (feature) => {
      if (hasPremium) return true;
      const limit = FREE_USAGE_LIMITS[feature] ?? 0;
      const current = usage[feature] ?? 0;
      if (current >= limit) return false;
      setUsage((prev) => ({ ...prev, [feature]: (prev[feature] ?? 0) + 1 }));
      return true;
    },
    [hasPremium, usage]
  );

  return { usage, remaining, consume };
}

function LoadingShell({ title = "Loading...", subtitle }) {
  return (
    <div className="screen center">
      <div className="spinner" />
      <h2>{title}</h2>
      {subtitle ? <p className="muted">{subtitle}</p> : null}
    </div>
  );
}

function LandingPage({ user, onStartFree, onSeePricing, onContinue }) {
  return (
    <div className="screen landing">
      <div className="hero-card hero-shell">
        <div className="hero-content">
          <p className="eyebrow">Job Assistant</p>
          <h1>Apply with confidence, not guesswork.</h1>
          <p className="hero-copy">
            Get a focused job search workflow in minutes. Free users get core tools immediately. Upgrade only when
            your limits are reached.
          </p>
          <div className="row">
            {user ? (
              <button className="btn primary" onClick={onContinue}>
                Open dashboard
              </button>
            ) : (
              <button className="btn primary" onClick={onStartFree}>
                Create free account
              </button>
            )}
            <button className="btn ghost" onClick={onSeePricing}>
              Compare plans
            </button>
          </div>
        </div>

        <div className="hero-grid">
          <div className="value-chip">
            <p className="eyebrow">Free includes</p>
            <h3>5 starter searches</h3>
            <p>Plus onboarding, profile setup, and dashboard access at $0.</p>
          </div>
          <div className="value-chip">
            <p className="eyebrow">When to upgrade</p>
            <h3>Only at limits</h3>
            <p>You keep full app access and get prompted only when free usage runs out.</p>
          </div>
          <div className="value-chip">
            <p className="eyebrow">Premium</p>
            <h3>Unlimited workflows</h3>
            <p>Unlock unlimited actions and subscription controls in dashboard settings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapAuthError(message, mode) {
  const text = (message || "").toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "Email or password is incorrect. Please try again.";
  }
  if (text.includes("email not confirmed")) {
    return "Your email is not confirmed yet. Check your inbox and confirm your account.";
  }
  if (text.includes("already registered") || text.includes("user already registered")) {
    return "That email is already registered. Try logging in instead.";
  }
  if (text.includes("password") && text.includes("at least")) {
    return "Password is too short. Please use a stronger password and try again.";
  }
  if (text.includes("network") || text.includes("failed to fetch")) {
    return "Network issue detected. Check your connection and try again.";
  }
  return mode === "signup"
    ? "We could not create your account right now. Please try again."
    : "We could not sign you in right now. Please try again.";
}

function AuthPage({ onAuthed, onBackToLanding }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const mode = tab === "login" ? "login" : "signup";

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const supabase = getSupabaseClient();
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim() },
          },
        });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setNotice("Account created. Confirm your email, then sign in.");
          setTab("login");
          return;
        }
      }

      onAuthed();
    } catch (err) {
      setError(mapAuthError(err?.message, mode));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError("");
    setNotice("");

    try {
      const supabase = getSupabaseClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${ROUTES.app}` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      const text = (err?.message || "").toLowerCase();
      if (text.includes("provider is not enabled")) {
        setError("OAuth provider is not configured yet. Please use email and password.");
      } else {
        setError("Unable to start OAuth sign-in. Please try email/password.");
      }
    }
  };

  return (
    <div className="screen auth-screen">
      <div className="panel auth-panel">
        <div className="tabs">
          <button className={`tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>
            Login
          </button>
          <button className={`tab ${tab === "signup" ? "active" : ""}`} onClick={() => setTab("signup")}>
            Sign up
          </button>
        </div>

        <h1>{tab === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">
          {tab === "login"
            ? "Sign in and pick up where you left off."
            : "Start on Free instantly. Upgrade only when you want Premium features."}
        </p>

        <form onSubmit={onSubmit} className="stack">
          {tab === "signup" ? (
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter your password"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              required
            />
          </label>

          {error ? <p className="alert error">{error}</p> : null}
          {notice ? <p className="alert info">{notice}</p> : null}

          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Please wait..." : tab === "login" ? "Login" : "Sign up"}
          </button>
        </form>

        <div className="oauth-row">
          <button className="btn soft" type="button" onClick={() => handleOAuth("google")}>
            Continue with Google
          </button>
          <button className="btn soft" type="button" onClick={() => handleOAuth("github")}>
            Continue with GitHub
          </button>
        </div>

        <button className="link-btn" onClick={onBackToLanding}>
          Back to landing
        </button>
      </div>
    </div>
  );
}

function OnboardingPage({ user, profile, onSaved, onGoPricing }) {
  const [targetTitle, setTargetTitle] = useState(profile?.target_title || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [searchRadius, setSearchRadius] = useState(profile?.search_radius_km ?? 25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTargetTitle(profile?.target_title || "");
    setLocation(profile?.location || "");
    setSearchRadius(profile?.search_radius_km ?? 25);
  }, [profile?.target_title, profile?.location, profile?.search_radius_km]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!targetTitle.trim() || !location.trim()) {
      setError("Target title and location are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseClient();
      const payload = {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || user.email?.split("@")[0] || "",
        target_title: targetTitle.trim(),
        location: location.trim(),
        search_radius_km: Number(searchRadius) || 25,
        onboarding_completed_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (upsertError) throw upsertError;

      onSaved();
    } catch (err) {
      setError(err?.message || "Unable to save onboarding right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen onboarding-screen">
      <div className="panel onboarding-panel">
        <div className="row spread">
          <p className="eyebrow">Step 1 of 1</p>
          <button className="link-btn" onClick={onGoPricing}>
            See Premium
          </button>
        </div>

        <h1>Tell us where to focus first.</h1>
        <p className="muted">This keeps your first results relevant and ready in one click.</p>

        <form onSubmit={onSubmit} className="stack">
          <label>
            Target title
            <input
              type="text"
              value={targetTitle}
              onChange={(e) => setTargetTitle(e.target.value)}
              placeholder="e.g. Product Manager"
              required
            />
          </label>

          <label>
            Location
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Austin, TX or Remote"
              required
            />
          </label>

          <label>
            Search radius (km) (optional)
            <input
              type="number"
              min="1"
              max="500"
              value={searchRadius}
              onChange={(e) => setSearchRadius(e.target.value)}
              placeholder="25"
            />
          </label>

          {error ? <p className="alert error">{error}</p> : null}

          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Show me my first results"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PricingPage({ user, entitlements, onBack, onNeedAuth, onCheckoutStarted, checkoutLoading, checkoutError }) {
  const query = parseSearch(window.location.search);
  const canceled = query.get("canceled") === "1";

  return (
    <div className="screen pricing-screen">
      <div className="panel pricing-panel">
        <h1>Simple pricing</h1>
        <p className="muted">Start free and upgrade only when you need Premium acceleration.</p>

        {canceled ? (
          <div className="alert info">
            Checkout was canceled. You can continue in Free mode and try again anytime.
          </div>
        ) : null}

        {checkoutError ? <div className="alert error">{checkoutError}</div> : null}

        <div className="price-grid">
          <div className="price-card">
            <p className="eyebrow">Free</p>
            <h2>$0</h2>
            <ul>
              <li>Access core app features</li>
              <li>Onboarding + first results</li>
              <li>No payment required</li>
            </ul>
            <p className="muted small">Default plan using price id {FREE_PRICE_ID}</p>
          </div>

          <div className="price-card featured">
            <p className="eyebrow">Premium</p>
            <h2>Unlock Premium</h2>
            <ul>
              <li>Priority and premium-only actions</li>
              <li>Expanded workflows and outputs</li>
              <li>Subscription managed via Stripe Checkout</li>
            </ul>

            {entitlements?.has_premium ? (
              <button className="btn success" disabled>
                Premium active
              </button>
            ) : user ? (
              <button className="btn primary" onClick={onCheckoutStarted} disabled={checkoutLoading}>
                {checkoutLoading ? "Redirecting to checkout..." : "Upgrade to Premium"}
              </button>
            ) : (
              <button className="btn primary" onClick={onNeedAuth}>
                Sign in to upgrade
              </button>
            )}
          </div>
        </div>

        <div className="row">
          <button className="btn ghost" onClick={onBack}>
            Back
          </button>
          {canceled ? (
            <button className="btn primary" onClick={user ? onCheckoutStarted : onNeedAuth} disabled={checkoutLoading}>
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BillingReturnPage({ user, profile, entitlements, refreshEntitlements, onResolved }) {
  const sessionId = useMemo(() => parseSearch(window.location.search).get("session_id"), []);
  const [status, setStatus] = useState("polling");
  const [detail, setDetail] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function runPoll() {
      if (!user) {
        setStatus("error");
        setDetail("Please sign in to verify your subscription.");
        return;
      }

      if (!sessionId) {
        setStatus("error");
        setDetail("Missing Stripe session id. We can still continue in Free mode.");
        return;
      }

      setStatus("polling");
      setDetail("");

      const start = Date.now();
      let intervalMs = 1500;

      while (!cancelled && Date.now() - start < 60000) {
        const current = await refreshEntitlements();

        if (current?.has_premium) {
          setStatus("success");
          onResolved(profile?.onboarding_completed_at ? ROUTES.app : ROUTES.onboarding);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        intervalMs = Math.min(2500, intervalMs + 250);
      }

      if (!cancelled) {
        setStatus("timeout");
        setDetail("We are still confirming payment with Stripe. Your access will update automatically shortly.");
      }
    }

    runPoll().catch((err) => {
      if (cancelled) return;
      setStatus("error");
      setDetail(err?.message || "Unable to confirm subscription right now.");
    });

    return () => {
      cancelled = true;
    };
  }, [user, sessionId, tick, refreshEntitlements, onResolved, profile?.onboarding_completed_at]);

  const goToApp = () => onResolved(ROUTES.app);

  return (
    <div className="screen center">
      {status === "polling" ? <div className="spinner" /> : null}
      <h2>
        {status === "polling"
          ? "Activating your subscription..."
          : status === "success"
          ? "Premium is active"
          : "We’re still confirming payment"}
      </h2>

      {status === "polling" ? <p className="muted">This can take a few seconds while webhook events are processed.</p> : null}
      {detail ? <p className="muted">{detail}</p> : null}

      {(status === "timeout" || status === "error") && !entitlements?.has_premium ? (
        <div className="row">
          <button className="btn ghost" onClick={() => setTick((v) => v + 1)}>
            Refresh
          </button>
          <button className="btn primary" onClick={goToApp}>
            Go to app
          </button>
          <a className="btn soft" href="mailto:support@example.com?subject=Billing%20support">
            Contact support
          </a>
        </div>
      ) : null}
    </div>
  );
}

function AppHome({
  user,
  profile,
  entitlements,
  onGoPricing,
  onSignOut,
  onOpenBillingPortal,
  portalLoading,
  portalError,
}) {
  const [tab, setTab] = useState("workspace");
  const [actionState, setActionState] = useState("");
  const [upgradeState, setUpgradeState] = useState("");
  const [premiumActionState, setPremiumActionState] = useState("");
  const hasPremium = Boolean(entitlements?.has_premium);
  const { remaining, consume } = useFeatureUsage(user?.id, hasPremium);

  const name = profile?.name || user.user_metadata?.name || user.email?.split("@")[0] || "there";
  const targetTitle = profile?.target_title || "your target role";
  const location = profile?.location || "your preferred location";
  const searchRadius = profile?.search_radius_km ?? 25;

  const runStarterSearch = () => {
    if (!consume("starterSearches")) {
      setUpgradeState("You reached your free Starter Search limit. Upgrade to continue.");
      return;
    }
    const nextRemaining = hasPremium ? "Unlimited searches enabled." : `${Math.max(0, remaining("starterSearches") - 1)} free searches remaining.`;
    setUpgradeState("");
    setActionState(
      `Search created for ${targetTitle} in ${location} within ${searchRadius} km. ${nextRemaining}`
    );
  };

  const runRoleFitCheck = () => {
    if (!consume("roleFitChecks")) {
      setUpgradeState("You reached your free Role Fit Check limit. Upgrade for unlimited checks.");
      return;
    }
    const nextRemaining = hasPremium ? "Unlimited checks enabled." : `${Math.max(0, remaining("roleFitChecks") - 1)} free checks remaining.`;
    setUpgradeState("");
    setActionState(`Role-fit score generated for ${targetTitle} against your profile. ${nextRemaining}`);
  };

  const runPremiumAction = () => {
    if (!hasPremium) {
      setUpgradeState("Premium workflow is locked on Free. Upgrade to unlock it.");
      onGoPricing();
      return;
    }
    setPremiumActionState("Premium action complete: generated a tailored output draft for your profile.");
  };

  return (
    <div className="screen app-screen">
      <div className="panel app-panel">
        <div className="row spread align-start">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{name}</h1>
            <p className="muted">
              Targeting {targetTitle} in {location}
            </p>
          </div>

          <div className="row">
            <button className={`tab-mini ${tab === "workspace" ? "active" : ""}`} onClick={() => setTab("workspace")}>
              Workspace
            </button>
            <button className={`tab-mini ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>
              Settings
            </button>
            <button className="btn ghost" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>

        {tab === "workspace" ? (
          <>
            {!hasPremium ? (
              <div className="upgrade-banner">
                <p>
                  Free plan active: {remaining("starterSearches")} Starter Searches and {remaining("roleFitChecks")} Role
                  Fit Checks remaining.
                </p>
                <button className="btn primary" onClick={onGoPricing}>
                  Upgrade
                </button>
              </div>
            ) : (
              <div className="upgrade-banner premium-banner">
                <p>Premium active: unlimited workflows and advanced outputs.</p>
                <button className="btn soft" onClick={onOpenBillingPortal} disabled={portalLoading}>
                  {portalLoading ? "Opening..." : "Manage billing"}
                </button>
              </div>
            )}

            <div className="action-grid">
              <div className="value-card">
                <p className="eyebrow">Basic feature</p>
                <h2>Starter Search</h2>
                <p className="muted">Generate a focused search from your onboarding profile.</p>
                <button className="btn primary" onClick={runStarterSearch}>
                  Run starter search
                </button>
              </div>

              <div className="value-card">
                <p className="eyebrow">Basic feature</p>
                <h2>Role Fit Check</h2>
                <p className="muted">Get a quick fit score and recommendations for one role.</p>
                <button className="btn soft" onClick={runRoleFitCheck}>
                  Run fit check
                </button>
              </div>

              <div className="value-card">
                <p className="eyebrow">Premium workflow</p>
                <h2>Tailored Output Draft</h2>
                <p className="muted">Create a deeper, premium-only tailored output for your target role.</p>
                <button className="btn soft" onClick={runPremiumAction}>
                  Generate premium draft
                </button>
              </div>
            </div>

            {upgradeState ? (
              <div className="alert info row spread">
                <span>{upgradeState}</span>
                <button className="btn primary" onClick={onGoPricing}>
                  Upgrade now
                </button>
              </div>
            ) : null}

            {actionState ? <p className="alert info">{actionState}</p> : null}
            {premiumActionState ? <p className="alert success">{premiumActionState}</p> : null}
          </>
        ) : (
          <div className="settings-stack">
            <div className="value-card">
              <p className="eyebrow">Subscription</p>
              <h2>{hasPremium ? "Premium" : "Free"}</h2>
              <p className="muted">
                {hasPremium
                  ? "You can update payment method, invoices, and cancel from billing portal."
                  : "You are on Free. Upgrade when you need more usage or premium workflows."}
              </p>
              <div className="row">
                {hasPremium ? (
                  <button className="btn primary" onClick={onOpenBillingPortal} disabled={portalLoading}>
                    {portalLoading ? "Opening portal..." : "Manage subscription"}
                  </button>
                ) : (
                  <button className="btn primary" onClick={onGoPricing}>
                    Upgrade to Premium
                  </button>
                )}
              </div>
              {portalError ? <p className="alert error">{portalError}</p> : null}
            </div>

            <div className="value-card">
              <p className="eyebrow">Usage</p>
              <h2>Free limits</h2>
              <p className="muted">Starter Searches: {hasPremium ? "Unlimited" : `${remaining("starterSearches")} left`}</p>
              <p className="muted">Role Fit Checks: {hasPremium ? "Unlimited" : `${remaining("roleFitChecks")} left`}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const { route, navigate } = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    refresh: refreshProfile,
  } = useProfile(user?.id);
  const {
    entitlements,
    loading: entitlementsLoading,
    error: entitlementsError,
    refresh: refreshEntitlements,
  } = useEntitlements(user?.id);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  const onboardingComplete = Boolean(profile?.onboarding_completed_at);

  useEffect(() => {
    if (authLoading) return;

    const path = route.path;
    if (!user) {
      if (![ROUTES.landing, ROUTES.auth, ROUTES.pricing].includes(path)) {
        navigate(ROUTES.auth, { replace: true });
      }
      return;
    }

    if (!onboardingComplete && ![ROUTES.onboarding, ROUTES.pricing, ROUTES.billingReturn].includes(path)) {
      navigate(ROUTES.onboarding, { replace: true });
      return;
    }

    if (onboardingComplete && [ROUTES.landing, ROUTES.auth, ROUTES.onboarding].includes(path)) {
      navigate(ROUTES.app, { replace: true });
    }
  }, [authLoading, user, onboardingComplete, route.path, navigate]);

  const startCheckout = useCallback(async () => {
    if (!user) {
      navigate(ROUTES.auth);
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const supabase = getSupabaseClient();
      const {
        data: { user: freshUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !freshUser) {
        setCheckoutError("Your session expired. Please sign in again and retry.");
        navigate(ROUTES.auth);
        setCheckoutLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { priceId: PREMIUM_PRICE_ID },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Checkout URL was not returned.");

      window.location.assign(data.url);
    } catch (err) {
      setCheckoutError(err?.message || "Unable to start checkout. Please try again.");
      setCheckoutLoading(false);
    }
  }, [user, navigate]);

  const handleSignOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    navigate(ROUTES.landing);
  }, [navigate]);

  const openBillingPortal = useCallback(async () => {
    if (!user) {
      navigate(ROUTES.auth);
      return;
    }

    setPortalLoading(true);
    setPortalError("");
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke("create-portal-session");
      if (error) throw error;
      if (!data?.url) throw new Error("Billing portal URL was not returned.");
      window.location.assign(data.url);
    } catch (err) {
      setPortalError(err?.message || "Unable to open billing portal right now.");
      setPortalLoading(false);
    }
  }, [user, navigate]);

  const sharedError = profileError || entitlementsError;

  if (authLoading) {
    return (
      <>
        <GlobalStyles />
        <LoadingShell title="Loading your workspace..." />
      </>
    );
  }

  if (user && (profileLoading || entitlementsLoading) && route.path !== ROUTES.billingReturn) {
    return (
      <>
        <GlobalStyles />
        <LoadingShell title="Preparing your account..." />
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      {sharedError ? <div className="top-error">{sharedError}</div> : null}

      {route.path === ROUTES.landing ? (
        <LandingPage
          user={user}
          onStartFree={() => navigate(ROUTES.auth)}
          onSeePricing={() => navigate(ROUTES.pricing)}
          onContinue={() => navigate(onboardingComplete ? ROUTES.app : ROUTES.onboarding)}
        />
      ) : null}

      {route.path === ROUTES.auth ? (
        <AuthPage
          onAuthed={async () => {
            await refreshProfile();
            navigate(ROUTES.onboarding);
          }}
          onBackToLanding={() => navigate(ROUTES.landing)}
        />
      ) : null}

      {route.path === ROUTES.onboarding && user ? (
        <OnboardingPage
          user={user}
          profile={profile}
          onSaved={async () => {
            await refreshProfile();
            navigate(ROUTES.app);
          }}
          onGoPricing={() => navigate(ROUTES.pricing)}
        />
      ) : null}

      {route.path === ROUTES.pricing ? (
        <PricingPage
          user={user}
          entitlements={entitlements}
          checkoutLoading={checkoutLoading}
          checkoutError={checkoutError}
          onCheckoutStarted={startCheckout}
          onNeedAuth={() => navigate(ROUTES.auth)}
          onBack={() => {
            if (!user) {
              navigate(ROUTES.landing);
            } else {
              navigate(onboardingComplete ? ROUTES.app : ROUTES.onboarding);
            }
          }}
        />
      ) : null}

      {route.path === ROUTES.billingReturn ? (
        <BillingReturnPage
          user={user}
          profile={profile}
          entitlements={entitlements}
          refreshEntitlements={refreshEntitlements}
          onResolved={(target) => navigate(target, { replace: true })}
        />
      ) : null}

      {route.path === ROUTES.app && user ? (
        <AppHome
          user={user}
          profile={profile}
          entitlements={entitlements}
          onGoPricing={() => navigate(ROUTES.pricing)}
          onSignOut={handleSignOut}
          onOpenBillingPortal={openBillingPortal}
          portalLoading={portalLoading}
          portalError={portalError}
        />
      ) : null}
    </>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      :root {
        color-scheme: light;
        --bg: #f3f6ff;
        --panel: #ffffff;
        --panel-strong: #eef3ff;
        --text: #101626;
        --muted: #4f5c79;
        --line: #d7dff0;
        --brand: #0b66ff;
        --brand-dark: #0b4ed1;
        --teal: #0ea5a4;
        --success: #177d4a;
        --danger: #b42332;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 4% 5%, #e7f6ff 0%, rgba(231, 246, 255, 0) 28%),
          radial-gradient(circle at 92% 4%, #e6edff 0%, rgba(230, 237, 255, 0) 24%),
          linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
        color: var(--text);
      }

      h1, h2, h3, p { margin: 0; }
      ul { margin: 10px 0 0; padding-left: 18px; color: var(--muted); }
      li { margin-bottom: 8px; }

      .screen {
        min-height: 100vh;
        padding: 32px 20px;
      }

      .center {
        display: grid;
        place-items: center;
        text-align: center;
        gap: 12px;
      }

      .landing,
      .auth-screen,
      .onboarding-screen,
      .pricing-screen,
      .app-screen {
        display: grid;
        place-items: center;
      }

      .hero-card,
      .panel {
        width: min(920px, 100%);
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(20, 26, 42, 0.08);
        padding: 28px;
      }

      .hero-card { max-width: 760px; }
      .hero-copy { margin-top: 12px; color: var(--muted); max-width: 55ch; }
      .hero-shell { display: grid; gap: 18px; }
      .hero-content { display: grid; gap: 10px; }
      .hero-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .value-chip {
        background: linear-gradient(180deg, #f8fbff, #f4f8ff);
        border: 1px solid #d4def5;
        border-radius: 12px;
        padding: 12px;
        display: grid;
        gap: 6px;
      }
      .value-chip h3 { font-size: 16px; }
      .value-chip p { color: var(--muted); font-size: 13px; line-height: 1.35; }

      .auth-panel,
      .onboarding-panel { max-width: 520px; }
      .pricing-panel { max-width: 960px; }
      .app-panel { max-width: 980px; }

      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--brand);
        font-weight: 700;
      }

      .muted { color: var(--muted); }
      .small { font-size: 12px; }

      .row {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }

      .spread { justify-content: space-between; }
      .align-start { align-items: flex-start; }
      .stack { display: grid; gap: 14px; margin-top: 18px; }

      label {
        display: grid;
        gap: 7px;
        font-size: 14px;
        color: var(--text);
      }

      input {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 11px 12px;
        font-size: 14px;
        transition: border-color 0.15s ease;
        background: #fff;
      }

      input:focus {
        outline: none;
        border-color: var(--brand);
      }

      .tabs {
        display: inline-flex;
        background: #f1f4fb;
        border-radius: 10px;
        padding: 4px;
        margin-bottom: 14px;
      }

      .tab {
        border: none;
        background: transparent;
        border-radius: 8px;
        padding: 8px 14px;
        cursor: pointer;
        font-weight: 600;
        color: var(--muted);
      }

      .tab.active {
        background: white;
        color: var(--text);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
      }

      .tab-mini {
        border: 1px solid var(--line);
        background: #fff;
        color: var(--muted);
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .tab-mini.active {
        border-color: #bbceff;
        color: #0f3ea4;
        background: #eef3ff;
      }

      .btn {
        border: 1px solid transparent;
        border-radius: 10px;
        padding: 10px 14px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .btn.primary {
        background: linear-gradient(180deg, var(--brand), var(--brand-dark));
        color: #fff;
      }

      .btn.ghost {
        border-color: var(--line);
        background: #fff;
        color: var(--text);
      }

      .btn.soft {
        background: #eef2ff;
        color: #1c3f98;
      }

      .btn.success {
        background: #e8f7ee;
        color: var(--success);
      }

      .link-btn {
        border: none;
        background: none;
        color: var(--brand);
        font-size: 14px;
        padding: 0;
        cursor: pointer;
        text-decoration: underline;
      }

      .oauth-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
      }

      .alert {
        border-radius: 10px;
        padding: 10px 12px;
        border: 1px solid;
        font-size: 14px;
      }

      .alert.error {
        background: #fff1f3;
        border-color: #f8c4cc;
        color: var(--danger);
      }

      .alert.info {
        background: #eef4ff;
        border-color: #cbdafc;
        color: #1f4eb8;
      }

      .alert.success {
        background: #ebf9f0;
        border-color: #c4eace;
        color: var(--success);
      }

      .price-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin: 18px 0;
      }

      .price-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #fff;
        padding: 18px;
      }

      .price-card.featured {
        background: linear-gradient(180deg, #f5f8ff, #ffffff);
        border-color: #bcccf8;
      }

      .upgrade-banner {
        margin-top: 18px;
        border: 1px solid #c6d5fa;
        background: #edf3ff;
        border-radius: 12px;
        padding: 14px;
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
      }
      .premium-banner {
        border-color: #9ad7d7;
        background: #ecfbfb;
      }

      .value-card {
        margin-top: 18px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #fff;
        padding: 18px;
        display: grid;
        gap: 10px;
      }
      .action-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 10px;
      }
      .action-grid .value-card { margin-top: 0; }
      .settings-stack {
        margin-top: 14px;
        display: grid;
        gap: 12px;
      }

      .spinner {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        border: 3px solid #d4dbee;
        border-top-color: var(--brand);
        animation: spin 1s linear infinite;
      }

      .top-error {
        position: fixed;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        width: min(760px, calc(100vw - 24px));
        background: #fff1f3;
        border: 1px solid #f8c4cc;
        color: var(--danger);
        border-radius: 10px;
        padding: 10px 12px;
        z-index: 100;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @media (max-width: 800px) {
        .price-grid { grid-template-columns: 1fr; }
        .hero-grid { grid-template-columns: 1fr; }
        .action-grid { grid-template-columns: 1fr; }
        .oauth-row { grid-template-columns: 1fr; }
        .hero-card, .panel { padding: 20px; }
      }
    `}</style>
  );
}

export default App;
