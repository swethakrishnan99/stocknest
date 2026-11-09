import { useState, type FormEvent } from "react";
import { Cloud, CloudOff, RefreshCw, ShieldCheck } from "lucide-react";
import Button from "./Button";
import Modal from "./Modal";
import AccountDialog from "./AccountDialog";
import { useAuth, type TotpEnrollment } from "../state/authContext";
import { useInventory } from "../state/inventoryContext";
import { syncLabel } from "../lib/cloud/syncLabel";

function TwoStepSetup({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function begin() {
    setBusy(true);
    setError("");
    try {
      setEnrollment(await auth.startTwoStep());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    setError("");
    try {
      await auth.finishTwoStep(enrollment.factorId, code);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Turn on two-step login" subtitle="A code from your phone, as well as your password" onClose={onClose}>
      <div className="px-5 py-5 flex flex-col gap-4 overflow-y-auto">
        {!enrollment ? (
          <>
            <p className="text-sm">
              You'll need an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator or 1Password. Each time you sign in,
              you'll enter the 6-digit code it shows.
            </p>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button variant="primary" onClick={begin} disabled={busy}>
              {busy ? "One moment…" : "Set it up"}
            </Button>
          </>
        ) : (
          <form onSubmit={finish} noValidate className="flex flex-col gap-4">
            <ol className="list-decimal pl-5 text-sm flex flex-col gap-1">
              <li>In your authenticator app, add an account and scan this code.</li>
              <li>Enter the 6-digit code it shows to finish.</li>
            </ol>
            <img
              src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qrCode)}`}
              alt="QR code to add StockNest to your authenticator app"
              className="w-48 h-48 self-center bg-white p-2 rounded-xl border border-line"
            />
            <details className="text-[13px] text-muted">
              <summary className="cursor-pointer font-semibold">Can't scan it?</summary>
              <p className="mt-1">Choose "enter a setup key" in your app and type this key:</p>
              <code className="block mt-1 p-2 rounded-lg bg-table-head font-mono text-ink break-all select-all">{enrollment.secret}</code>
            </details>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Code from the app
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="h-12 px-3 rounded-[10px] border border-input text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-ink"
              />
            </label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button type="submit" variant="primary" disabled={busy || code.length !== 6}>
              {busy ? "Checking…" : "Turn on"}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
}

/** Settings → Account and sync */
export default function AccountCard() {
  const auth = useAuth();
  const { cloud, mode, business, can } = useInventory();
  const [dialog, setDialog] = useState<"signIn" | "signUp" | "twoStep" | null>(null);
  const [confirmJoin, setConfirmJoin] = useState<{ id: string; name: string } | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!auth.enabled) return null;

  async function upload() {
    setBusy(true);
    setError("");
    try {
      await cloud.uploadThisDevice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const others = cloud.businesses ?? [];

  return (
    <section aria-labelledby="acct-h" className="bg-white border border-line rounded-[14px] p-5">
      <h2 id="acct-h" className="text-lg font-bold flex items-center gap-2">
        <Cloud className="w-5 h-5 text-navy-700" aria-hidden="true" />
        Account and sync
      </h2>

      {auth.status === "loading" && <p className="mt-3 text-sm text-muted">Checking your account…</p>}

      {auth.status === "signedOut" && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-muted">
            Sign in to keep your stock in the cloud: the same data on every phone and computer, your team signing in with their own accounts, and nothing lost if a
            device breaks. Until then, everything stays on this device.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setDialog("signUp")}>
              Create an account
            </Button>
            <Button onClick={() => setDialog("signIn")}>Sign in</Button>
          </div>
        </div>
      )}

      {auth.status === "signedIn" && (
        <div className="mt-3 flex flex-col gap-4">
          <p className="text-sm">
            Signed in as <strong>{auth.user?.email}</strong>
          </p>

          {cloud.linked ? (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-table-head">
              {cloud.status === "offline" || cloud.status === "error" ? <CloudOff className="w-5 h-5 text-warning" aria-hidden="true" /> : <Cloud className="w-5 h-5 text-success" aria-hidden="true" />}
              <p className="flex-1 min-w-[200px] text-sm" role="status">
                <strong>{business.name}</strong> syncs to the cloud. {syncLabel(cloud)}
              </p>
              <Button className="text-sm px-3.5" onClick={() => void cloud.syncNow()} disabled={cloud.status === "syncing"}>
                <RefreshCw className="w-4 h-4" />
                Sync now
              </Button>
            </div>
          ) : cloud.businesses === null ? (
            <p className="text-sm text-muted">Loading your businesses…</p>
          ) : (
            <div className="flex flex-col gap-3 p-3 rounded-xl bg-table-head">
              <p className="text-sm font-semibold">This device isn't syncing yet.</p>
              {others.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center gap-3">
                  <span className="flex-1 min-w-[180px] text-sm">
                    {b.name} <span className="text-muted">· {b.role}</span>
                  </span>
                  <Button className="text-sm px-3.5" onClick={() => setConfirmJoin({ id: b.id, name: b.name })}>
                    Use {b.name} on this device
                  </Button>
                </div>
              ))}
              {mode === "own" && can("manageData") && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex-1 min-w-[180px] text-sm">Upload {business.name} from this device as a new cloud business.</span>
                  <Button variant="primary" className="text-sm px-3.5" onClick={upload} disabled={busy}>
                    {busy ? "Uploading…" : "Upload and sync"}
                  </Button>
                </div>
              )}
              {mode === "demo" && others.length === 0 && (
                <p className="text-sm text-muted">This device is showing the demo bakery. Set up your own business (Settings → Your data), then upload it here.</p>
              )}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-line-soft">
            <ShieldCheck className={`w-5 h-5 ${auth.hasTwoStep ? "text-success" : "text-muted"}`} aria-hidden="true" />
            <p className="flex-1 min-w-[200px] text-sm">
              <strong>Two-step login</strong> {auth.hasTwoStep ? "is on. You'll enter a code from your authenticator app when you sign in." : "is off. Turn it on so a stolen password isn't enough to get in."}
            </p>
            {auth.hasTwoStep ? (
              confirmOff ? (
                <div className="flex gap-2">
                  <Button className="text-sm px-3.5" onClick={() => setConfirmOff(false)}>
                    Keep it on
                  </Button>
                  <Button
                    className="text-sm px-3.5 text-danger"
                    onClick={async () => {
                      await auth.turnOffTwoStep().catch((err: Error) => setError(err.message));
                      setConfirmOff(false);
                    }}
                  >
                    Turn off
                  </Button>
                </div>
              ) : (
                <Button className="text-sm px-3.5" onClick={() => setConfirmOff(true)}>
                  Turn off
                </Button>
              )
            ) : (
              <Button variant="primary" className="text-sm px-3.5" onClick={() => setDialog("twoStep")}>
                Turn on
              </Button>
            )}
          </div>

          <div className="pt-3 border-t border-line-soft">
            <Button
              variant="outline"
              onClick={async () => {
                cloud.disconnect();
                await auth.signOut();
              }}
            >
              Sign out
            </Button>
            <p className="mt-2 text-[13px] text-muted">Signing out stops syncing on this device. What's here stays on this device.</p>
          </div>
        </div>
      )}

      {confirmJoin && (
        <Modal title={`Use ${confirmJoin.name} on this device?`} subtitle="Replaces what's on this device with the cloud's data" onClose={() => setConfirmJoin(null)}>
          <div className="px-5 py-5 flex flex-col gap-4">
            <p className="text-sm">
              Products, stock history and settings on this device will be replaced by {confirmJoin.name}'s. {mode === "own" && "If you want to keep this device's data, download a backup first (Settings → Your data)."}
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConfirmJoin(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  cloud.joinBusiness(confirmJoin.id);
                  setConfirmJoin(null);
                }}
              >
                Use {confirmJoin.name}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {(dialog === "signIn" || dialog === "signUp") && <AccountDialog start={dialog} onClose={() => setDialog(null)} />}
      {dialog === "twoStep" && <TwoStepSetup onClose={() => setDialog(null)} />}
    </section>
  );
}
