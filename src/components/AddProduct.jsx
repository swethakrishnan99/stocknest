import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import ProductTile from "./ProductTile";
import StatusChip from "./StatusChip";
import { CATEGORIES, money, stockStatus } from "../lib/sampleData";
import { useInventory } from "../state/inventoryContext";

const SKU_PREFIX = { Ingredients: "ING", Packaging: "PKG", "Baked goods": "BKD", Supplies: "SUP" };
const TINT = { Ingredients: "#F3E9D7", Packaging: "#FDE3DF", "Baked goods": "#E6DCF5", Supplies: "#DCEAF7" };
const UNITS = ["bags", "blocks", "bottles", "boxes", "pcs", "loaves", "packs", "jugs", "kg", "L"];

const inputClass =
  "h-11 w-full px-3 rounded-[10px] border bg-white text-[15px] font-normal text-ink placeholder:text-muted outline-none focus:border-ink";

// Next free SKU for a category, e.g. ING-0045
function nextSku(products, cat) {
  const prefix = SKU_PREFIX[cat];
  const used = products.filter((p) => p.id.startsWith(prefix)).map((p) => Number(p.id.slice(4)) || 0);
  return `${prefix}-${String(Math.max(0, ...used) + 1).padStart(4, "0")}`;
}

function Field({ label, hint, error, className = "", children }) {
  return (
    <label className={`flex flex-col gap-2 text-sm font-semibold ${className}`}>
      <span>
        {label}
        {hint && <span className="font-normal text-muted"> {hint}</span>}
      </span>
      {children}
      {error && <span className="text-[13px] font-semibold text-danger">{error}</span>}
    </label>
  );
}

export default function AddProduct({ onAdd, onClose }) {
  const { products, locationNames } = useInventory();
  const [form, setForm] = useState({
    name: "",
    cat: CATEGORIES[1],
    sku: "",
    barcode: "",
    loc: locationNames[0],
    unit: "",
    qty: "",
    reorder: "",
    cost: "",
  });
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const suggestedSku = nextSku(products, form.cat);
  const qty = Number(form.qty) || 0;
  const reorder = Number(form.reorder) || 0;
  const cost = Number(form.cost) || 0;
  const name = form.name.trim();

  function validate() {
    const er = {};
    if (!name) er.name = "Enter a product name.";
    const sku = (form.sku.trim() || suggestedSku).toUpperCase();
    if (products.some((p) => p.id === sku)) er.sku = `${sku} is already used.`;
    if (!form.unit.trim()) er.unit = "Enter a unit, like bags or pcs.";
    if (form.qty === "" || qty < 0 || !Number.isInteger(qty)) er.qty = "Enter a whole number, 0 or more.";
    if (form.reorder !== "" && (reorder < 0 || !Number.isInteger(reorder))) er.reorder = "Enter a whole number.";
    if (form.cost !== "" && cost < 0) er.cost = "Enter 0 or more.";
    return { er, sku };
  }

  function submit(e) {
    e.preventDefault();
    const { er, sku } = validate();
    setErrors(er);
    if (Object.keys(er).length) {
      e.currentTarget.querySelector(`[name="${Object.keys(er)[0]}"]`)?.focus();
      return;
    }
    onAdd({
      id: sku,
      name,
      initial: name[0].toUpperCase(),
      tint: TINT[form.cat],
      cat: form.cat,
      loc: form.loc,
      qty,
      unit: form.unit.trim(),
      reorder,
      unitCost: cost,
      supplier: "",
      barcode: form.barcode.trim(),
    });
  }

  const border = (key) => (errors[key] ? "border-danger" : "border-input");

  return (
    <Modal title="Add product" subtitle="It will show in Products right away" onClose={onClose}>
      <form noValidate onSubmit={submit} className="flex flex-col min-h-0">
        <div className="overflow-y-auto px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product name" error={errors.name} className="sm:col-span-2">
            <input name="name" type="text" value={form.name} onChange={set("name")} placeholder="e.g. Rye flour, 5 kg" className={`${inputClass} ${border("name")}`} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Category">
            <select name="cat" value={form.cat} onChange={set("cat")} className={`${inputClass} border-input`}>
              {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Location">
            <select name="loc" value={form.loc} onChange={set("loc")} className={`${inputClass} border-input`}>
              {locationNames.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="SKU" hint="(optional)" error={errors.sku}>
            <input name="sku" type="text" value={form.sku} onChange={set("sku")} placeholder={suggestedSku} className={`${inputClass} font-mono uppercase ${border("sku")}`} aria-invalid={!!errors.sku} />
          </Field>
          <Field label="Barcode" hint="(optional)">
            <input name="barcode" type="text" inputMode="numeric" value={form.barcode} onChange={set("barcode")} placeholder="Scan or type" className={`${inputClass} border-input`} />
          </Field>
          <Field label="On hand" error={errors.qty}>
            <input name="qty" type="number" min="0" step="1" inputMode="numeric" value={form.qty} onChange={set("qty")} placeholder="0" className={`${inputClass} ${border("qty")}`} aria-invalid={!!errors.qty} />
          </Field>
          <Field label="Unit" error={errors.unit}>
            <input name="unit" type="text" list="unit-options" value={form.unit} onChange={set("unit")} placeholder="bags, pcs, boxes…" className={`${inputClass} ${border("unit")}`} aria-invalid={!!errors.unit} />
            <datalist id="unit-options">
              {UNITS.map((u) => <option key={u} value={u} />)}
            </datalist>
          </Field>
          <Field label="Reorder at" hint="(optional)" error={errors.reorder}>
            <input name="reorder" type="number" min="0" step="1" inputMode="numeric" value={form.reorder} onChange={set("reorder")} placeholder="0" className={`${inputClass} ${border("reorder")}`} aria-invalid={!!errors.reorder} />
          </Field>
          <Field label="Unit cost" hint="(CAD, optional)" error={errors.cost}>
            <input name="cost" type="number" min="0" step="0.01" inputMode="decimal" value={form.cost} onChange={set("cost")} placeholder="0.00" className={`${inputClass} ${border("cost")}`} aria-invalid={!!errors.cost} />
          </Field>

          <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-table-head border border-line-soft" aria-live="polite">
            <ProductTile initial={name ? name[0].toUpperCase() : "?"} tint={TINT[form.cat]} />
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-semibold truncate">{name || "New product"}</div>
              <div className="text-[13px] text-muted">
                {qty} {form.unit.trim() || "units"} · value {money(qty * cost)}
              </div>
            </div>
            <StatusChip status={stockStatus(qty, reorder)} />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="px-[18px]">Add product</Button>
        </div>
      </form>
    </Modal>
  );
}
