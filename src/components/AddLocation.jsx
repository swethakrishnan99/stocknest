import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { useInventory } from "../state/inventoryContext";

const inputClass =
  "h-11 w-full px-3 rounded-[10px] border bg-white text-[15px] font-normal text-ink placeholder:text-muted outline-none focus:border-ink";

// Quick picks for the description, so most people don't have to type one
const KINDS = ["Dry goods shelves", "Fridge or cooler", "Freezer", "Packaging and supplies", "Display or shop floor", "Back room"];

export default function AddLocation({ onAdd, onClose }) {
  const { locationNames } = useInventory();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    let problem = "";
    if (!clean) problem = "Give the location a name.";
    else if (clean.length > 40) problem = "Keep the name to 40 characters or fewer.";
    else {
      const existing = locationNames.find((n) => n.toLowerCase() === clean.toLowerCase());
      if (existing) problem = `${existing} already exists.`;
    }
    if (problem) {
      setError(problem);
      e.currentTarget.querySelector('[name="name"]')?.focus();
      return;
    }
    onAdd({ name: clean, kind: kind.trim() || "Storage location" });
  }

  return (
    <Modal title="Add location" subtitle="A shelf, room or fridge where you keep stock" onClose={onClose} maxWidth="sm:max-w-md">
      <form noValidate onSubmit={submit} className="flex flex-col min-h-0">
        <div className="overflow-y-auto px-5 py-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Location name
            <input
              name="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="e.g. Basement freezer"
              maxLength={60}
              className={`${inputClass} ${error ? "border-danger" : "border-input"}`}
              aria-invalid={!!error}
              aria-describedby={error ? "loc-name-error" : undefined}
            />
            {error && (
              <span id="loc-name-error" className="text-[13px] font-semibold text-danger">
                {error}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold">
            <span>
              Description <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              name="kind"
              type="text"
              list="location-kinds"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              placeholder="e.g. Freezer"
              className={`${inputClass} border-input`}
            />
            <datalist id="location-kinds">
              {KINDS.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="px-[18px]">
            Add location
          </Button>
        </div>
      </form>
    </Modal>
  );
}
