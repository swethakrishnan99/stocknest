import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { useAuth } from "../state/authContext";

const inputClass = "h-11 w-full px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal text-ink placeholder:text-muted outline-none focus:border-ink";

type Step = "signIn" | "signUp" | "forgot";

/** Sign in, create an account, or get a password-reset email */
export default function AccountDialog({ start = "signIn", onClose }: { start?: Step; onClose: () => void }) {
  const auth = useAuth();
  const [step, setStep] = useState<Step>(start);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  const go = (next: Step) => {
    setStep(next);
    setError("");
    setSent("");
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter your email address.");
    if (step !== "forgot" && password.length < 8) return setError("Use a password of at least 8 characters.");
    setBusy(true);
    try {
      if (step === "signIn") {
        await auth.signIn(email.trim(), password);
        onClose();
      } else if (step === "signUp") {
        const { needsConfirmation } = await auth.signUp(email.trim(), password, name.trim());
        if (needsConfirmation) setSent(`We sent a link to ${email.trim()}. Open it to confirm your email, then sign in.`);
        else onClose();
      } else {
        await auth.sendPasswordReset(email.trim());
        setSent(`If there's an account for ${email.trim()}, we've sent a link to choose a new password.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const title = step === "signIn" ? "Sign in" : step === "signUp" ? "Create your account" : "Reset your password";
  const subtitle =
    step === "signUp" ? "Your products and stock sync across your devices and team" : step === "forgot" ? "We'll email you a link" : "Use your StockNest account";

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <form noValidate onSubmit={submit} className="px-5 py-5 flex flex-col gap-4">
        {sent ? (
          <p role="status" className="p-3 rounded-xl bg-success-100 text-success text-sm font-semibold">
            {sent}
          </p>
        ) : (
          <>
            {step === "signUp" && (
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Your name
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} />
              </label>
            )}
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} />
            </label>
            {step !== "forgot" && (
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={step === "signUp" ? "new-password" : "current-password"}
                  className={inputClass}
                />
                {step === "signUp" && <span className="font-normal text-[13px] text-muted">At least 8 characters</span>}
              </label>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "One moment…" : step === "signIn" ? "Sign in" : step === "signUp" ? "Create account" : "Send reset link"}
            </Button>
          </>
        )}
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          {step === "signIn" ? (
            <>
              <button type="button" onClick={() => go("signUp")} className="font-semibold text-navy-700 hover:underline cursor-pointer">
                Create an account
              </button>
              <button type="button" onClick={() => go("forgot")} className="font-semibold text-navy-700 hover:underline cursor-pointer">
                Forgot password?
              </button>
            </>
          ) : (
            <button type="button" onClick={() => go("signIn")} className="font-semibold text-navy-700 hover:underline cursor-pointer">
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
