import { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import Button from "./Button";
import PageHeader from "./PageHeader";
import Toggle from "./Toggle";
import { TEAM, PLAN } from "../lib/sampleData";

const CURRENCIES = ["CAD · Canadian dollar", "USD · US dollar", "EUR · Euro", "GBP · British pound"];
const TIME_ZONES = ["Eastern Time (Toronto)", "Central Time (Winnipeg)", "Mountain Time (Edmonton)", "Pacific Time (Vancouver)", "Atlantic Time (Halifax)"];
const EXPIRY_DAYS = [7, 14, 30];

const inputClass = "h-11 px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal text-ink outline-none focus:border-ink";

function Card({ id, title, hint, children }) {
  return (
    <section aria-labelledby={id} className="bg-white border border-line rounded-[14px] p-5">
      <h2 id={id} className="text-lg font-bold">{title}</h2>
      {hint && <p className="text-[13px] text-muted mt-0.5">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

export default function Settings({ business, onSaveBusiness }) {
  const [draft, setDraft] = useState(business);
  const [saved, setSaved] = useState(false);
  const [alerts, setAlerts] = useState({ lowStock: true, dailySummary: false, expiry: true, expiryDays: 14 });
  const [team, setTeam] = useState(TEAM);

  const edit = (key) => (e) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }));
    setSaved(false);
  };
  const changed = JSON.stringify(draft) !== JSON.stringify(business);
  const usedPct = Math.round((PLAN.used / PLAN.limit) * 100);

  return (
    <main className="flex-1 min-w-0 flex flex-col gap-5 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
      <PageHeader title="Settings" subtitle="Business details, alerts and your team" />

      <div className="max-w-[820px] flex flex-col gap-4">
        <Card id="biz-h" title="Business">
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveBusiness({ ...draft, name: draft.name.trim() || business.name });
              setSaved(true);
            }}
          >
            <Field label="Business name">
              <input type="text" value={draft.name} onChange={edit("name")} className={inputClass} required />
            </Field>
            <Field label="Currency">
              <select value={draft.currency} onChange={edit("currency")} className={inputClass}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Time zone">
              <select value={draft.timeZone} onChange={edit("timeZone")} className={inputClass}>
                {TIME_ZONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Default reorder point">
              <input type="number" min="0" value={draft.defaultReorder} onChange={edit("defaultReorder")} className={inputClass} />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" variant="primary" disabled={!changed} className="disabled:opacity-50 disabled:cursor-not-allowed">
                Save changes
              </Button>
              {saved && !changed && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-success" role="status">
                  <Check className="w-4 h-4" strokeWidth={2.4} />
                  Saved
                </span>
              )}
            </div>
          </form>
        </Card>

        <Card id="alerts-h" title="Alerts" hint={`Sent to ${team[0].email}`}>
          <Toggle
            label="Low stock"
            hint="Email me when a product drops below its reorder point"
            checked={alerts.lowStock}
            onChange={(v) => setAlerts((a) => ({ ...a, lowStock: v }))}
          />
          <Toggle
            label="Daily summary"
            hint="A short email each morning with yesterday's movements"
            checked={alerts.dailySummary}
            onChange={(v) => setAlerts((a) => ({ ...a, dailySummary: v }))}
          />
          <Toggle
            label="Expiry warnings"
            hint={`Warn me ${alerts.expiryDays} days before a batch's best-before date`}
            checked={alerts.expiry}
            onChange={(v) => setAlerts((a) => ({ ...a, expiry: v }))}
          />
          {alerts.expiry && (
            <div role="group" aria-label="Days of warning" className="flex gap-2 pt-1 pb-2">
              {EXPIRY_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAlerts((a) => ({ ...a, expiryDays: d }))}
                  aria-pressed={alerts.expiryDays === d}
                  className={`h-11 px-4 rounded-full border text-sm font-semibold cursor-pointer ${
                    alerts.expiryDays === d ? "bg-navy border-navy text-white" : "bg-white border-input text-ink hover:bg-line-soft"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card id="team-h" title="Team" hint="People who can record stock and see reports">
          {team.map((m, i) => (
            <div key={m.email} className="flex flex-wrap items-center gap-3 py-3 border-t border-line-soft first:border-t-0">
              <span className="w-10 h-10 shrink-0 rounded-full bg-navy-700 text-white flex items-center justify-center font-semibold" aria-hidden="true">
                {m.name[0]}
              </span>
              <div className="flex-1 min-w-[160px]">
                <div className="font-semibold text-[15px]">{m.name}</div>
                <div className="text-[13px] text-muted">{m.email}</div>
              </div>
              {m.role === "Owner" ? (
                <span className="text-sm font-semibold text-muted px-3">Owner</span>
              ) : (
                <label>
                  <span className="sr-only">Role for {m.name}</span>
                  <select
                    value={m.role}
                    onChange={(e) => setTeam((t) => t.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                    className="h-11 px-3 rounded-[10px] border border-input bg-white text-sm text-ink"
                  >
                    <option>Staff</option>
                    <option>Manager</option>
                  </select>
                </label>
              )}
            </div>
          ))}
          <Button className="mt-3">
            <UserPlus className="w-[18px] h-[18px]" />
            Invite someone
          </Button>
        </Card>

        <Card id="plan-h" title="Plan">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[220px]">
              <div className="font-semibold text-[15px]">{PLAN.name}</div>
              <div className="text-[13px] text-muted mb-2">
                {PLAN.used} of {PLAN.limit} items used
              </div>
              <div className="h-2.5 bg-line-soft rounded-md overflow-hidden" role="img" aria-label={`${usedPct}% of the item limit used`}>
                <div className="h-2.5 bg-navy-700 rounded-md" style={{ width: `${usedPct}%` }} />
              </div>
            </div>
            <Button variant="outline">See plans</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
