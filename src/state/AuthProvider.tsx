import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { AuthContext, type Auth, type AuthStatus, type TotpEnrollment } from "./authContext";
import { SUPABASE_KEY, SUPABASE_URL, cloudConfigured } from "../lib/cloud/config";
import { supabaseBackend } from "../lib/cloud/supabaseBackend";
import type { CloudBackend } from "../lib/cloud/backend";

let client: SupabaseClient | null = null;
const getClient = () => (client ??= createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));

/** Where links in sign-up and password emails come back to: this page, without the #/route */
const returnUrl = () => window.location.href.split("#")[0];

/** Supabase messages, in plainer words */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Check them, or reset your password.";
  if (m.includes("email not confirmed")) return "Confirm your email first: open the link we sent you, then sign in.";
  if (m.includes("user already registered")) return "There's already an account with that email. Sign in instead.";
  if (m.includes("password should be at least")) return "Use a password of at least 8 characters.";
  if (m.includes("invalid totp code") || m.includes("invalid mfa") || m.includes("challenge") && m.includes("expired")) return "That code didn't work. Codes change every 30 seconds; enter the newest one.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Wait a minute and try again.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Can't reach StockNest's servers. Check your internet connection.";
  return message;
}

/**
 * Signing in, two-step login and the cloud connection. When the cloud isn't set up (tests, or a
 * build without keys) everything here reports "off" and the app works on this device only.
 */
export default function AuthProvider({ children, backend: injected }: { children: ReactNode; backend?: CloudBackend }) {
  const enabled = cloudConfigured();
  const [status, setStatus] = useState<AuthStatus>(enabled ? "loading" : "off");
  const [user, setUser] = useState<User | null>(null);
  const [hasTwoStep, setHasTwoStep] = useState(false);

  const backend = useMemo(() => injected ?? (enabled ? supabaseBackend(getClient()) : null), [injected, enabled]);

  /** Works out whether the session still needs a two-step code */
  const refresh = useCallback(async (u: User | null, recovery = false) => {
    setUser(u);
    if (!u) return setStatus("signedOut");
    if (recovery) return setStatus("recovery");
    const { data } = await getClient().auth.mfa.getAuthenticatorAssuranceLevel();
    const factors = await getClient().auth.mfa.listFactors();
    setHasTwoStep(!!factors.data?.totp.some((f) => f.status === "verified"));
    setStatus(data && data.nextLevel === "aal2" && data.currentLevel !== "aal2" ? "needsCode" : "signedIn");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const auth = getClient().auth;
    auth.getSession().then(({ data }) => refresh(data.session?.user ?? null));
    const { data: sub } = auth.onAuthStateChange((event, session) => {
      // run outside the callback, as Supabase recommends
      setTimeout(() => refresh(session?.user ?? null, event === "PASSWORD_RECOVERY"), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [enabled, refresh]);

  /** Calls Supabase and turns an error into a friendly Error; returns the data from a successful call */
  const run = useCallback(async <R extends { data: unknown; error: { message: string } | null }>(fn: () => Promise<R>) => {
    const result = await fn();
    if (result.error) throw new Error(friendly(result.error.message));
    return result.data as Extract<R, { error: null }>["data"];
  }, []);

  const value = useMemo(
    (): Auth => ({
      status,
      enabled,
      backend,
      user: user ? { id: user.id, email: user.email ?? "", name: (user.user_metadata?.name as string | undefined) ?? "" } : null,
      hasTwoStep,

      async signUp(email, password, name) {
        const data = await run(() => getClient().auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: returnUrl() } }));
        return { needsConfirmation: !data.session };
      },
      async signIn(email, password) {
        const data = await run(() => getClient().auth.signInWithPassword({ email, password }));
        await refresh(data.user);
      },
      async signOut() {
        await getClient().auth.signOut();
        setUser(null);
        setStatus("signedOut");
      },
      async sendPasswordReset(email) {
        await run(() => getClient().auth.resetPasswordForEmail(email, { redirectTo: returnUrl() }));
      },
      async setNewPassword(password) {
        const data = await run(() => getClient().auth.updateUser({ password }));
        await refresh(data.user);
      },
      async verifyCode(code) {
        const factors = await run(() => getClient().auth.mfa.listFactors());
        const factor = factors.totp.find((f) => f.status === "verified");
        if (!factor) throw new Error("Two-step login isn't set up on this account.");
        await run(() => getClient().auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() }));
        const { data } = await getClient().auth.getUser();
        await refresh(data.user);
      },
      async startTwoStep(): Promise<TotpEnrollment> {
        // a half-finished setup from before would block a new one
        const factors = await run(() => getClient().auth.mfa.listFactors());
        for (const f of factors.all.filter((f) => f.status === "unverified")) await getClient().auth.mfa.unenroll({ factorId: f.id });
        const data = await run(() => getClient().auth.mfa.enroll({ factorType: "totp", friendlyName: `StockNest ${new Date().toISOString().slice(0, 10)}`, issuer: "StockNest" }));
        return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
      },
      async finishTwoStep(factorId, code) {
        await run(() => getClient().auth.mfa.challengeAndVerify({ factorId, code: code.trim() }));
        const { data } = await getClient().auth.getUser();
        await refresh(data.user);
      },
      async turnOffTwoStep() {
        const factors = await run(() => getClient().auth.mfa.listFactors());
        for (const f of factors.totp) await run(() => getClient().auth.mfa.unenroll({ factorId: f.id }));
        const { data } = await getClient().auth.getUser();
        await refresh(data.user);
      },
    }),
    [status, enabled, backend, user, hasTwoStep, run, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
