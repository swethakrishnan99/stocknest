import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import Button from "./Button";
import { useAuth } from "../state/authContext";

const inputClass = "h-12 w-full px-3 rounded-[10px] border border-input bg-white text-center font-mono text-2xl tracking-[0.4em] text-ink outline-none focus:border-ink";

/**
 * Covers the app when the signed-in person still has to enter their two-step code, or has opened a
 * password-reset link and needs to choose a new password.
 */
export default function AuthGate() {
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (auth.status !== "needsCode" && auth.status !== "recovery") return null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (auth.status === "needsCode") {
        if (!/^\d{6}$/.test(code.trim())) throw new Error("Enter the 6-digit code from your authenticator app.");
        await auth.verifyCode(code);
      } else {
        if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
        await auth.setNewPassword(password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  const needsCode = auth.status === "needsCode";
  return (
    <div className="fixed inset-0 z-[60] bg-page flex items-center justify-center p-5">
      <form onSubmit={submit} noValidate role="dialog" aria-modal="true" aria-labelledby="gate-h" className="w-full max-w-[400px] bg-white border border-line rounded-2xl p-6 flex flex-col gap-4">
        <ShieldCheck className="w-8 h-8 text-navy-700" aria-hidden="true" />
        <div>
          <h1 id="gate-h" className="font-display text-2xl font-bold">
            {needsCode ? "Enter your code" : "Choose a new password"}
          </h1>
          <p className="text-muted text-sm mt-1">
            {needsCode ? `Open your authenticator app and enter the 6-digit code for StockNest (${auth.user?.email}).` : `For ${auth.user?.email}. At least 8 characters.`}
          </p>
        </div>
        {needsCode ? (
          <label className="flex flex-col gap-2 text-sm font-semibold">
            <span className="sr-only">Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              className={inputClass}
            />
          </label>
        ) : (
          <label className="flex flex-col gap-2 text-sm font-semibold">
            New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus className="h-11 px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal outline-none focus:border-ink" />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Checking…" : needsCode ? "Continue" : "Save password"}
        </Button>
        <button type="button" onClick={() => auth.signOut()} className="text-sm font-semibold text-muted hover:text-ink hover:underline cursor-pointer">
          Sign out instead
        </button>
        {needsCode && <p className="text-[13px] text-muted">Lost your phone? Contact StockNest support to reset two-step login on your account.</p>}
      </form>
    </div>
  );
}
