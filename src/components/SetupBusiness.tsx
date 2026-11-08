import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import Button from "./Button";
import { TEMPLATES, templateFor } from "../lib/templates";
import type { NewBusiness } from "../state/InventoryProvider";

const inputClass =
  "h-11 w-full px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal text-ink placeholder:text-muted outline-none focus:border-ink";

interface SetupBusinessProps {
  onStart: (business: NewBusiness) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

/** The few questions needed to start a business of your own. Everything can be changed later. */
export default function SetupBusiness({ onStart, onCancel, submitLabel = "Start using StockNest" }: SetupBusinessProps) {
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [locations, setLocations] = useState(TEMPLATES[0].locations.map((l) => l.name));
  const [newLocation, setNewLocation] = useState("");
  const [error, setError] = useState("");

  function pickTemplate(id: string) {
    setTemplateId(id);
    setLocations(templateFor(id).locations.map((l) => l.name));
  }

  function addLocation() {
    const name = newLocation.trim();
    if (!name) return;
    if (!locations.some((l) => l.toLowerCase() === name.toLowerCase())) setLocations((list) => [...list, name]);
    setNewLocation("");
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!businessName.trim()) return setError("Enter your business name.");
    const all = newLocation.trim() ? [...locations, newLocation.trim()] : locations;
    if (!all.length) return setError("Add at least one place where you keep stock.");
    onStart({ businessName, ownerName, ownerEmail, templateId, locations: all });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Business name
        <input
          type="text"
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value);
            setError("");
          }}
          placeholder="e.g. Rosie's Cakes"
          className={inputClass}
          autoComplete="organization"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Your name <span className="font-normal text-muted -mt-1.5 text-[13px]">(optional)</span>
          <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} autoComplete="name" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Your email <span className="font-normal text-muted -mt-1.5 text-[13px]">(optional)</span>
          <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className={inputClass} autoComplete="email" />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold mb-2">What kind of business is it?</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <label
              key={t.id}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${templateId === t.id ? "border-ink bg-table-head" : "border-input hover:bg-line-soft"}`}
            >
              <input type="radio" name="template" checked={templateId === t.id} onChange={() => pickTemplate(t.id)} className="mt-1 accent-navy" />
              <span>
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-[13px] text-muted">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-[13px] text-muted">
          Starts you with the categories {templateFor(templateId).categories.join(", ")}. You can rename or add more in Settings.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold mb-2">Where do you keep stock?</legend>
        <ul className="flex flex-wrap gap-2">
          {locations.map((l) => (
            <li key={l} className="flex items-center gap-1 h-9 pl-3 pr-1 rounded-full border border-input bg-white text-sm">
              {l}
              <button
                type="button"
                onClick={() => setLocations((list) => list.filter((x) => x !== l))}
                aria-label={`Remove ${l}`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:bg-line-soft hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only">Another location</span>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLocation();
                }
              }}
              placeholder="Add another, e.g. Garage"
              className={inputClass}
            />
          </label>
          <Button type="button" onClick={addLocation}>
            <Plus className="w-[18px] h-[18px]" />
            Add
          </Button>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        {onCancel && (
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
