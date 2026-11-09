import { useState, type ChangeEvent, type ReactNode } from "react";
import { Check, Download, Pencil, Plus, Smartphone, Trash2, Upload, UserPlus, X } from "lucide-react";
import Button from "./Button";
import PageHeader from "./PageHeader";
import Toggle from "./Toggle";
import Modal from "./Modal";
import InviteMember from "./InviteMember";
import SetupBusiness from "./SetupBusiness";
import { PLAN } from "../lib/sampleData";
import { todayISO } from "../lib/dates";
import { backupFileName, downloadBackup, parseBackup } from "../lib/backup";
import { askForDeviceNotifications, deviceNotificationsAllowed, deviceNotificationsSupported } from "../lib/deviceNotify";
import { ROLE_HINTS } from "../lib/permissions";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { useInventory } from "../state/inventoryContext";
import AccountCard from "./AccountCard";
import CustomFieldsCard from "./CustomFieldsCard";
import type { BackupData, Business, Role, Supplier, TeamMember } from "../types";

const CURRENCIES = ["CAD · Canadian dollar", "USD · US dollar", "EUR · Euro", "GBP · British pound"];
const TIME_ZONES = ["Eastern Time (Toronto)", "Central Time (Winnipeg)", "Mountain Time (Edmonton)", "Pacific Time (Vancouver)", "Atlantic Time (Halifax)"];
const EXPIRY_DAYS = [7, 14, 30];

const inputClass = "h-11 px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal text-ink outline-none focus:border-ink";
const linkButton = "text-sm font-semibold text-navy-700 hover:underline cursor-pointer";

function Card({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="bg-white border border-line rounded-[14px] p-5">
      <h2 id={id} className="text-lg font-bold">{title}</h2>
      {hint && <p className="text-[13px] text-muted mt-0.5">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

function Saved({ text = "Saved" }: { text?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-success" role="status">
      <Check className="w-4 h-4" strokeWidth={2.4} />
      {text}
    </span>
  );
}

/** Who is using StockNest on this device, and putting it on the home screen */
function YouCard() {
  const { team, currentUser, switchUser, cloud } = useInventory();
  const { how, install } = useInstallPrompt();
  return (
    <Card
      id="you-h"
      title="You"
      hint={cloud.linked ? "You're signed in, so movements are saved under your name." : "On a shared phone or tablet, pick who is recording stock. Movements are saved under their name."}
    >
      <div className="flex flex-col gap-4">
        {cloud.linked ? (
          <p className="text-sm">
            <strong>{currentUser?.name}</strong> · {currentUser?.role}
          </p>
        ) : (
        <label className="flex flex-col gap-2 text-sm font-semibold sm:max-w-[360px]">
          Using StockNest as
          <select value={currentUser?.email ?? ""} onChange={(e) => switchUser(e.target.value)} className={inputClass}>
            {team.map((m) => (
              <option key={m.email} value={m.email}>
                {m.name} · {m.role}
              </option>
            ))}
          </select>
        </label>
        )}
        {currentUser && <p className="text-[13px] text-muted -mt-2">{ROLE_HINTS[currentUser.role]}.</p>}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-line-soft">
          <Smartphone className="w-5 h-5 text-navy-700" aria-hidden="true" />
          <p className="flex-1 min-w-[220px] text-sm">
            {how === "installed"
              ? "StockNest is installed on this device."
              : how === "ios"
                ? "Put StockNest on your home screen: in Safari, tap Share, then Add to Home Screen."
                : how === "prompt"
                  ? "Install StockNest on this device. It opens like an app and works offline."
                  : "To install, choose Install app or Add to Home screen in your browser's menu."}
          </p>
          {how === "prompt" && <Button onClick={install}>Install app</Button>}
        </div>
      </div>
    </Card>
  );
}

function BusinessCard() {
  const { business, setBusiness, products, updateProduct } = useInventory();
  const [draft, setDraft] = useState(business);
  const [saved, setSaved] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const FORM_KEYS = ["name", "currency", "timeZone", "defaultReorder"] as const;
  const changed = FORM_KEYS.some((k) => draft[k] !== business[k]);

  const edit = (key: keyof Business) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }));
    setSaved(false);
  };
  const inUse = (cat: string) => products.filter((p) => p.cat === cat).length;

  function addCategory() {
    const name = newCategory.trim();
    if (!name || business.categories.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    setBusiness({ ...business, categories: [...business.categories, name] });
    setNewCategory("");
  }

  return (
    <Card id="biz-h" title="Business">
      <form
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusiness({ ...business, currency: draft.currency, timeZone: draft.timeZone, defaultReorder: draft.defaultReorder, name: draft.name.trim() || business.name });
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
          <Button type="submit" variant="primary" disabled={!changed}>
            Save changes
          </Button>
          {saved && !changed && <Saved />}
        </div>
      </form>

      <div className="mt-5 pt-4 border-t border-line-soft">
        <h3 className="text-sm font-semibold">Categories</h3>
        <ul className="mt-2 flex flex-col">
          {business.categories.map((c) => (
            <li key={c} className="flex flex-wrap items-center gap-3 py-2 border-t border-line-soft first:border-t-0">
              {renaming?.from === c ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const to = renaming.to.trim();
                    if (to && to !== c && !business.categories.includes(to)) {
                      setBusiness({ ...business, categories: business.categories.map((x) => (x === c ? to : x)) });
                      products.filter((p) => p.cat === c).forEach((p) => updateProduct(p.id, { cat: to })); // its products move with it
                    }
                    setRenaming(null);
                  }}
                >
                  <label className="flex-1">
                    <span className="sr-only">New name for {c}</span>
                    <input autoFocus value={renaming.to} onChange={(e) => setRenaming({ from: c, to: e.target.value })} className={`${inputClass} w-full`} />
                  </label>
                  <Button type="submit">Save</Button>
                  <Button type="button" onClick={() => setRenaming(null)} aria-label="Cancel renaming">
                    <X className="w-4 h-4" />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-[15px]">
                    {c} <span className="text-[13px] text-muted">· {inUse(c)} products</span>
                  </span>
                  <button type="button" onClick={() => setRenaming({ from: c, to: c })} className={linkButton} aria-label={`Rename ${c}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={inUse(c) > 0}
                    title={inUse(c) > 0 ? "Move its products to another category first" : undefined}
                    onClick={() => setBusiness({ ...business, categories: business.categories.filter((x) => x !== c) })}
                    className={`${linkButton} disabled:opacity-35 disabled:cursor-not-allowed`}
                    aria-label={`Remove ${c}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <label className="flex-1 sm:max-w-[320px]">
            <span className="sr-only">New category</span>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory();
                }
              }}
              placeholder="New category"
              className={`${inputClass} w-full`}
            />
          </label>
          <Button onClick={addCategory}>
            <Plus className="w-[18px] h-[18px]" />
            Add
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AlertsCard() {
  const { alerts, setAlerts } = useInventory();
  const [deviceAllowed, setDeviceAllowed] = useState(deviceNotificationsAllowed());
  const [deviceMessage, setDeviceMessage] = useState("");

  async function toggleLowStock(on: boolean) {
    setAlerts({ ...alerts, lowStock: on });
    if (!on) return;
    if (!deviceNotificationsSupported()) {
      setDeviceMessage("This browser can't show notifications. Low stock still shows under Alerts on the Dashboard.");
      return;
    }
    const ok = await askForDeviceNotifications();
    setDeviceAllowed(ok);
    setDeviceMessage(ok ? "" : "Notifications are blocked for this site. Allow them in your browser settings to get them on this device.");
  }

  return (
    <Card id="alerts-h" title="Alerts" hint="Everything here also shows under Alerts (the bell) on the Dashboard.">
      <Toggle
        label="Low stock on this device"
        hint="A notification on this phone or computer when something drops to its reorder point"
        checked={alerts.lowStock}
        onChange={toggleLowStock}
      />
      {alerts.lowStock && (deviceMessage || (deviceNotificationsSupported() && !deviceAllowed)) && (
        <div className="flex flex-wrap items-center gap-3 pb-3 text-[13px] text-muted">
          <span className="flex-1 min-w-[200px]">{deviceMessage || "Notifications aren't turned on for this device yet."}</span>
          {!deviceMessage && (
            <Button className="text-sm px-3.5" onClick={() => toggleLowStock(true)}>
              Turn on
            </Button>
          )}
        </div>
      )}
      <Toggle
        label="Yesterday's summary"
        hint="A line on the Dashboard with yesterday's movements, deliveries and waste"
        checked={alerts.dailySummary}
        onChange={(v) => setAlerts({ ...alerts, dailySummary: v })}
      />
      <Toggle
        label="Best-before warnings"
        hint={`Warn ${alerts.expiryDays} days before a batch's best-before date`}
        checked={alerts.expiry}
        onChange={(v) => setAlerts({ ...alerts, expiry: v })}
      />
      {alerts.expiry && (
        <div role="group" aria-label="Days of warning" className="flex gap-2 pt-1 pb-2">
          {EXPIRY_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setAlerts({ ...alerts, expiryDays: d })}
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
      <p className="mt-2 text-[13px] text-muted">Email alerts need StockNest accounts, which come with cloud sync.</p>
    </Card>
  );
}

const EMPTY_SUPPLIER: Supplier = { name: "", email: "", phone: "", leadDays: 3 };

function SuppliersCard() {
  const { suppliers, saveSupplier, removeSupplier, products } = useInventory();
  const [editing, setEditing] = useState<{ previous?: string; value: Supplier } | null>(null);
  const [error, setError] = useState("");

  return (
    <Card id="sup-h" title="Suppliers" hint="Used when you reorder. With an email, a purchase order can be sent in one tap.">
      <ul className="flex flex-col">
        {suppliers.map((s) => (
          <li key={s.name} className="flex flex-wrap items-center gap-3 py-3 border-t border-line-soft first:border-t-0">
            <div className="flex-1 min-w-[180px]">
              <div className="font-semibold text-[15px]">{s.name}</div>
              <div className="text-[13px] text-muted">
                {[s.email, s.phone, `usually ${s.leadDays} ${s.leadDays === 1 ? "day" : "days"}`].filter(Boolean).join(" · ")}
              </div>
            </div>
            <button type="button" onClick={() => setEditing({ previous: s.name, value: s })} className={linkButton} aria-label={`Edit ${s.name}`}>
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => removeSupplier(s.name)}
              className={linkButton}
              aria-label={`Remove ${s.name}`}
              title={products.some((p) => p.supplier === s.name) ? "Products keep this supplier's name" : undefined}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {suppliers.length === 0 && <li className="py-2 text-sm text-muted">No suppliers yet.</li>}
      </ul>
      {editing ? (
        <form
          className="mt-3 p-4 rounded-xl bg-table-head grid grid-cols-1 sm:grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const v = { ...editing.value, name: editing.value.name.trim(), email: editing.value.email.trim(), phone: editing.value.phone.trim() };
            if (!v.name) return setError("Enter the supplier's name.");
            if (v.name !== editing.previous && suppliers.some((s) => s.name.toLowerCase() === v.name.toLowerCase())) return setError("There's already a supplier with that name.");
            saveSupplier(v, editing.previous);
            setEditing(null);
            setError("");
          }}
        >
          <Field label="Name">
            <input value={editing.value.name} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, name: e.target.value } })} className={inputClass} />
          </Field>
          <Field label="Email (optional)">
            <input type="email" value={editing.value.email} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, email: e.target.value } })} className={inputClass} />
          </Field>
          <Field label="Phone (optional)">
            <input type="tel" value={editing.value.phone} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, phone: e.target.value } })} className={inputClass} />
          </Field>
          <Field label="Usual delivery time (days)">
            <input
              type="number"
              min="0"
              value={editing.value.leadDays}
              onChange={(e) => setEditing({ ...editing, value: { ...editing.value, leadDays: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })}
              className={inputClass}
            />
          </Field>
          {error && <p role="alert" className="sm:col-span-2 text-sm text-danger">{error}</p>}
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <Button type="button" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" variant="primary">Save supplier</Button>
          </div>
        </form>
      ) : (
        <Button className="mt-3" onClick={() => setEditing({ value: EMPTY_SUPPLIER })}>
          <Plus className="w-[18px] h-[18px]" />
          Add supplier
        </Button>
      )}
    </Card>
  );
}

function TeamCard() {
  const { team, inviteMember, setMemberRole, removeMember, currentUser, cloud } = useInventory();
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState("");
  const [teamError, setTeamError] = useState("");
  const userIdFor = (email: string) => cloud.members.find((m) => m.email.toLowerCase() === email.toLowerCase())?.userId;
  const guard = (p: Promise<void>) => p.catch((err: Error) => setTeamError(err.message));
  const changeRole = (m: TeamMember, role: Role) => {
    if (!cloud.linked) return setMemberRole(m.email, role);
    const id = userIdFor(m.email);
    if (id) void guard(cloud.setRole(id, role));
  };
  const remove = (m: TeamMember) => {
    if (!cloud.linked) return removeMember(m.email);
    if (m.pending) return void guard(cloud.cancelInvite(m.email));
    const id = userIdFor(m.email);
    if (id) void guard(cloud.removeMember(id));
  };
  return (
    <Card id="team-h" title="Team" hint="Staff record stock and counts. Managers also add products, order and see reports.">
      {team.map((m) => (
        <div key={m.email} className="flex flex-wrap items-center gap-3 py-3 border-t border-line-soft first:border-t-0">
          <span className="w-10 h-10 shrink-0 rounded-full bg-navy-700 text-white flex items-center justify-center font-semibold" aria-hidden="true">
            {m.name[0]}
          </span>
          <div className="flex-1 min-w-[160px]">
            <div className="font-semibold text-[15px]">
              {m.name}
              {m.email === currentUser?.email && <span className="text-muted font-normal"> (you)</span>}
            </div>
            <div className="text-[13px] text-muted">
              {m.email}
              {m.pending && <span className="ml-2 font-semibold text-warning">{cloud.linked ? "Invited · joins when they sign in with this email" : "Invited"}</span>}
            </div>
          </div>
          {m.role === "Owner" ? (
            <span className="text-sm font-semibold text-muted px-3">Owner</span>
          ) : (
            <>
              <label>
                <span className="sr-only">Role for {m.name}</span>
                <select value={m.role} disabled={cloud.linked && m.pending} onChange={(e) => changeRole(m, e.target.value as Role)} className="h-11 px-3 rounded-[10px] border border-input bg-white text-sm text-ink">
                  <option>Staff</option>
                  <option>Manager</option>
                </select>
              </label>
              <button type="button" onClick={() => remove(m)} className={linkButton} aria-label={m.pending && cloud.linked ? `Cancel the invite for ${m.name}` : `Remove ${m.name} from the team`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ))}
      {invited && <p role="status" className="mt-3 text-sm font-semibold text-success">{invited}</p>}
      {teamError && <p role="alert" className="mt-3 text-sm text-danger">{teamError}</p>}
      <Button className="mt-3" onClick={() => setInviting(true)}>
        <UserPlus className="w-[18px] h-[18px]" />
        Add someone
      </Button>
      <p className="mt-3 text-[13px] text-muted">
        {cloud.linked
          ? "People you add get access when they create a StockNest account (or sign in) with that email."
          : "Without an account, everyone shares this device's data (pick who's using it under You). Sign in under Account and sync so your team can use their own phones."}
      </p>
      {inviting && (
        <InviteMember
          onClose={() => setInviting(false)}
          onInvite={(member: TeamMember) => {
            setInviting(false);
            if (cloud.linked) {
              void guard(cloud.invite({ email: member.email.toLowerCase(), name: member.name, role: member.role }).then(() => setInvited(`${member.name} is invited as ${member.role}. Tell them to sign in to StockNest with ${member.email}.`)));
              return;
            }
            inviteMember({ ...member, pending: false });
            setInvited(`${member.name} was added as ${member.role}.`);
          }}
        />
      )}
    </Card>
  );
}

function DataCard() {
  const { mode, business, exportBackup, restoreBackup, startOver, startOwnBusiness, cloud } = useInventory();
  const [pending, setPending] = useState<BackupData | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  async function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
      setError("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That file couldn't be read.");
    }
  }

  return (
    <Card id="data-h" title="Your data" hint="Everything is saved in this browser on this device. Keep a backup, or use one to move to another device.">
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            downloadBackup(exportBackup(), backupFileName(business.name, todayISO()));
            setMessage("Backup downloaded. Keep it somewhere safe, like your email or cloud drive.");
          }}
        >
          <Download className="w-[18px] h-[18px]" />
          Download backup
        </Button>
        <label className="inline-flex items-center gap-2 h-11 px-4 rounded-[10px] border border-input bg-white text-[15px] font-semibold cursor-pointer hover:bg-line-soft focus-within:ring-2 focus-within:ring-ink">
          <Upload className="w-[18px] h-[18px]" aria-hidden="true" />
          Restore from backup
          <input type="file" accept=".json,application/json" className="sr-only" onChange={chooseFile} />
        </label>
      </div>
      {message && <p role="status" className="mt-3 text-sm font-semibold text-success">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {pending && (
        <div role="alert" className="mt-3 p-4 rounded-xl bg-warning-100 text-sm flex flex-col gap-3">
          <p>
            <strong>Replace everything on this device with the backup of {pending.business.name}?</strong> It has {pending.products.length} products and{" "}
            {pending.movements.length} movements, saved {pending.savedAt.replace("T", " at ")}. What's here now will be replaced.
            {cloud.linked && " This device stops syncing; upload the restored business again under Account and sync if you want it in the cloud."}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setPending(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                restoreBackup(pending);
                setPending(null);
                setMessage(`Restored ${pending.business.name}.`);
              }}
            >
              Replace with backup
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-line-soft flex flex-wrap items-center gap-3">
        <p className="flex-1 min-w-[220px] text-[13px] text-muted">
          {mode === "demo"
            ? "You're using the demo bakery. Set up your own business to start with empty data."
            : cloud.linked
              ? "Start over clears this device and stops it syncing. Your business stays safe in the cloud; sign in again to open it."
              : "Start over to go back to the welcome screen. Download a backup first if you might want this data again."}
        </p>
        {mode === "demo" ? (
          <Button variant="primary" onClick={() => setSettingUp(true)}>
            Set up my business
          </Button>
        ) : confirmStartOver ? (
          <div className="flex gap-2">
            <Button onClick={() => setConfirmStartOver(false)}>Cancel</Button>
            <Button className="bg-danger! text-white! border-danger!" onClick={startOver}>
              Erase and start over
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirmStartOver(true)}>
            Start over
          </Button>
        )}
      </div>
      {settingUp && (
        <Modal title="Set up your business" subtitle="This replaces the demo data on this device" onClose={() => setSettingUp(false)}>
          <div className="overflow-y-auto px-5 py-5">
            <SetupBusiness
              onCancel={() => setSettingUp(false)}
              onStart={(b) => {
                startOwnBusiness(b);
                if (cloud.status !== "off" && cloud.status !== "signedOut") cloud.uploadWhenReady();
                setSettingUp(false);
              }}
            />
          </div>
        </Modal>
      )}
    </Card>
  );
}

export default function Settings() {
  const { can, products, mode } = useInventory();
  const usedPct = Math.round((products.length / PLAN.limit) * 100);

  return (
    <main className="flex-1 min-w-0 flex flex-col gap-5 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
      <PageHeader title="Settings" subtitle="Your business, alerts, suppliers, team and data" />

      <div className="max-w-[820px] flex flex-col gap-4">
        <AccountCard />
        <YouCard />
        {can("manageBusiness") && <BusinessCard />}
        {can("manageBusiness") && <CustomFieldsCard />}
        {can("manageBusiness") && <AlertsCard />}
        {can("order") && <SuppliersCard />}
        {can("manageTeam") && <TeamCard />}
        {can("manageData") && <DataCard />}
        {mode !== null && can("manageBusiness") && (
          <Card id="plan-h" title="Plan">
            <div className="flex-1 min-w-[220px]">
              <div className="font-semibold text-[15px]">{PLAN.name}</div>
              <div className="text-[13px] text-muted mb-2">
                {products.length} of {PLAN.limit} items used
              </div>
              <div className="h-2.5 bg-line-soft rounded-md overflow-hidden" role="img" aria-label={`${usedPct}% of the item limit used`}>
                <div className="h-2.5 bg-navy-700 rounded-md" style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
