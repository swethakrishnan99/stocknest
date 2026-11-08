import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { useInventory } from "../state/inventoryContext";

const inputClass =
  "h-11 w-full px-3 rounded-[10px] border bg-white text-[15px] font-normal text-ink placeholder:text-muted outline-none focus:border-ink";

const ROLES = [
  ["Staff", "Records stock and sees products"],
  ["Manager", "Also adds products, orders stock and sees reports"],
];

/** Adds a person to the team. In this demo nothing is emailed; they show as "Invite pending". */
export default function InviteMember({ onInvite, onClose }) {
  const { team } = useInventory();
  const [form, setForm] = useState({ name: "", email: "", role: "Staff" });
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  function submit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const er = {};
    if (!name) er.name = "Enter their name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) er.email = "Enter an email address like name@example.com.";
    else if (team.some((m) => m.email.toLowerCase() === email)) er.email = "This person is already on the team.";
    setErrors(er);
    if (Object.keys(er).length) {
      e.currentTarget.querySelector(`[name="${Object.keys(er)[0]}"]`)?.focus();
      return;
    }
    onInvite({ name, email, role: form.role, pending: true });
  }

  const border = (key) => (errors[key] ? "border-danger" : "border-input");

  return (
    <Modal title="Invite someone" subtitle="They'll be able to sign in and record stock" onClose={onClose} maxWidth="sm:max-w-md">
      <form noValidate onSubmit={submit} className="flex flex-col min-h-0">
        <div className="overflow-y-auto px-5 py-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Name
            <input name="name" type="text" autoComplete="off" value={form.name} onChange={set("name")} placeholder="e.g. Sam Lee" className={`${inputClass} ${border("name")}`} aria-invalid={!!errors.name} />
            {errors.name && <span className="text-[13px] font-semibold text-danger">{errors.name}</span>}
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Email
            <input name="email" type="email" autoComplete="off" value={form.email} onChange={set("email")} placeholder="sam@example.com" className={`${inputClass} ${border("email")}`} aria-invalid={!!errors.email} />
            {errors.email && <span className="text-[13px] font-semibold text-danger">{errors.email}</span>}
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold mb-2">Role</legend>
            {ROLES.map(([role, hint]) => (
              <label key={role} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${form.role === role ? "border-ink bg-table-head" : "border-input"}`}>
                <input type="radio" name="role" value={role} checked={form.role === role} onChange={set("role")} className="mt-1 accent-[#0F1E3D]" />
                <span>
                  <span className="block text-[15px] font-semibold">{role}</span>
                  <span className="block text-[13px] text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="text-[13px] text-muted">This is a demo, so no email is sent. They'll show on the team as "Invite pending".</p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="px-[18px]">Send invite</Button>
        </div>
      </form>
    </Modal>
  );
}
