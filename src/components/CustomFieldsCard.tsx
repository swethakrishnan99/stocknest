import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Button from "./Button";
import { FIELD_TYPES, checkField, newFieldId, parseOptions, typeLabel } from "../lib/customFields";
import { useInventory } from "../state/inventoryContext";
import type { CustomField, CustomFieldType } from "../types";

const inputClass = "h-11 px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal text-ink outline-none focus:border-ink";
const linkButton = "text-sm font-semibold text-navy-700 hover:underline cursor-pointer";

interface Draft {
  id?: string; // set when editing an existing field
  name: string;
  type: CustomFieldType;
  options: string; // as typed, comma separated
}

const EMPTY: Draft = { name: "", type: "text", options: "" };

/** Settings → Custom fields: the extra details this business tracks on its products */
export default function CustomFieldsCard() {
  const { business, setBusiness, products } = useInventory();
  const fields = business.customFields;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const used = (f: CustomField) => products.filter((p) => p.fields?.[f.id]).length;

  function save() {
    if (!draft) return;
    const options = draft.type === "choice" ? parseOptions(draft.options) : undefined;
    const field = { name: draft.name.trim(), type: draft.type, options };
    const problem = checkField(field, fields.filter((f) => f.id !== draft.id));
    if (problem) return setError(problem);
    const saved: CustomField = { id: draft.id ?? newFieldId(field.name, fields), name: field.name, type: field.type, ...(options && { options }) };
    setBusiness({
      ...business,
      customFields: draft.id ? fields.map((f) => (f.id === draft.id ? saved : f)) : [...fields, saved],
    });
    setDraft(null);
    setError("");
  }

  return (
    <section aria-labelledby="fields-h" className="bg-white border border-line rounded-[14px] p-5">
      <h2 id="fields-h" className="text-lg font-bold">Custom fields</h2>
      <p className="text-[13px] text-muted mt-0.5">
        Track anything your products need, like size, colour, allergens or a warranty date. Add as many as you like. You can search and filter Products by them.
      </p>

      <ul className="mt-4 flex flex-col">
        {fields.map((f) => (
          <li key={f.id} className="py-3 border-t border-line-soft first:border-t-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold text-[15px]">{f.name}</div>
                <div className="text-[13px] text-muted">
                  {typeLabel(f.type)}
                  {f.type === "choice" && f.options?.length ? `: ${f.options.join(", ")}` : ""} · {used(f)} {used(f) === 1 ? "product" : "products"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraft({ id: f.id, name: f.name, type: f.type, options: (f.options ?? []).join(", ") });
                  setError("");
                  setRemoving(null);
                }}
                className={linkButton}
                aria-label={`Edit ${f.name}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setRemoving(f.id)} className={linkButton} aria-label={`Remove ${f.name}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {removing === f.id && (
              <div role="alert" className="mt-2 p-3 rounded-xl bg-danger-100 text-danger text-sm flex flex-col gap-3">
                <p>
                  <strong>Remove {f.name}?</strong> It will no longer show on products or in exports.
                  {used(f) > 0 && ` The values on ${used(f)} ${used(f) === 1 ? "product stay" : "products stay"} in your backups.`}
                </p>
                <div className="flex gap-2">
                  <Button className="text-sm px-3.5" onClick={() => setRemoving(null)}>Keep it</Button>
                  <Button
                    className="text-sm px-3.5 bg-danger! text-white! border-danger! hover:brightness-110"
                    onClick={() => {
                      setBusiness({ ...business, customFields: fields.filter((x) => x.id !== f.id) });
                      setRemoving(null);
                    }}
                  >
                    Remove field
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
        {fields.length === 0 && <li className="py-2 text-sm text-muted">No custom fields yet.</li>}
      </ul>

      {draft ? (
        <form
          className="mt-3 p-4 rounded-xl bg-table-head grid grid-cols-1 sm:grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Field name
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Size, Expiry date"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            <span>
              Type {draft.id && <span className="font-normal text-muted">(can't be changed)</span>}
            </span>
            <select
              value={draft.type}
              disabled={!!draft.id}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as CustomFieldType })}
              className={`${inputClass} disabled:bg-line-soft disabled:text-muted`}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}: {t.hint}
                </option>
              ))}
            </select>
          </label>
          {draft.type === "choice" && (
            <label className="sm:col-span-2 flex flex-col gap-2 text-sm font-semibold">
              <span>
                Options <span className="font-normal text-muted">(separated by commas)</span>
              </span>
              <input
                value={draft.options}
                onChange={(e) => setDraft({ ...draft, options: e.target.value })}
                placeholder="S, M, L, XL"
                className={inputClass}
              />
            </label>
          )}
          {error && <p role="alert" className="sm:col-span-2 text-sm text-danger">{error}</p>}
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <Button type="button" onClick={() => { setDraft(null); setError(""); }}>Cancel</Button>
            <Button type="submit" variant="primary">{draft.id ? "Save field" : "Add field"}</Button>
          </div>
        </form>
      ) : (
        <Button className="mt-3" onClick={() => { setDraft(EMPTY); setRemoving(null); }}>
          <Plus className="w-[18px] h-[18px]" />
          Add custom field
        </Button>
      )}
    </section>
  );
}
