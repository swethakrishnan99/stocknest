import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Modal from "./Modal";
import Button from "./Button";
import ProductTile from "./ProductTile";
import StatusChip from "./StatusChip";
import { PRODUCT_CATEGORIES, SUPPLIERS, money, stockStatus } from "../lib/sampleData";
import { nextSku, CATEGORY_TINT as TINT } from "../lib/productCsv";
import { useInventory } from "../state/inventoryContext";
import type { Category, Product } from "../types";

const UNITS = ["bags", "blocks", "bottles", "boxes", "pcs", "loaves", "packs", "jugs", "kg", "L"];

const inputClass =
  "h-11 w-full px-3 rounded-[10px] border bg-white text-[15px] font-normal text-ink placeholder:text-muted outline-none focus:border-ink";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

function Field({ label, hint, error, className = "", children }: FieldProps) {
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

/**
 * Add product form. Pass `product` to edit an existing one instead: the SKU stays fixed and
 * the quantity is shown but not edited (stock only changes through movements, so history stays right).
 */
interface FormState {
  name: string;
  cat: Category;
  sku: string;
  barcode: string;
  loc: string;
  unit: string;
  qty: string;
  reorder: string;
  cost: string;
  supplier: string;
}
type FormErrors = Partial<Record<keyof FormState, string>>;

interface AddProductProps {
  product?: Product; // edit this product instead of adding one
  onAdd?: (product: Product) => void;
  onSave?: (id: string, changes: Partial<Product>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function AddProduct({ product, onAdd, onSave, onDelete, onClose }: AddProductProps) {
  const { products, movements, orders, locationNames } = useInventory();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editing = !!product;
  const [form, setForm] = useState<FormState>(() =>
    product
      ? {
          name: product.name,
          cat: product.cat,
          sku: product.id,
          barcode: product.barcode ?? "",
          loc: product.loc,
          unit: product.unit,
          qty: String(product.qty),
          reorder: String(product.reorder),
          cost: String(product.unitCost),
          supplier: product.supplier ?? "",
        }
      : {
          name: "",
          cat: PRODUCT_CATEGORIES[0],
          sku: "",
          barcode: "",
          loc: locationNames[0],
          unit: "",
          qty: "",
          reorder: "",
          cost: "",
          supplier: "",
        }
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const suggestedSku = nextSku(products, form.cat);
  const qty = Number(form.qty) || 0;
  const reorder = Number(form.reorder) || 0;
  const cost = Number(form.cost) || 0;
  const name = form.name.trim();

  function validate() {
    const er: FormErrors = {};
    if (!name) er.name = "Enter a product name.";
    const sku = product ? product.id : (form.sku.trim() || suggestedSku).toUpperCase();
    if (!editing && products.some((p) => p.id === sku)) er.sku = `${sku} is already used.`;
    if (!form.unit.trim()) er.unit = "Enter a unit, like bags or pcs.";
    if (form.qty === "" || qty < 0 || !Number.isInteger(qty)) er.qty = "Enter a whole number, 0 or more.";
    if (form.reorder !== "" && (reorder < 0 || !Number.isInteger(reorder))) er.reorder = "Enter a whole number.";
    if (form.cost !== "" && cost < 0) er.cost = "Enter 0 or more.";
    return { er, sku };
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { er, sku } = validate();
    setErrors(er);
    if (Object.keys(er).length) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(er)[0]}"]`)?.focus();
      return;
    }
    if (product) {
      onSave?.(product.id, {
        name,
        initial: name[0].toUpperCase(),
        tint: product.cat === form.cat ? product.tint : TINT[form.cat],
        cat: form.cat,
        loc: form.loc,
        unit: form.unit.trim(),
        reorder,
        unitCost: cost,
        supplier: form.supplier,
        barcode: form.barcode.trim(),
      });
      return;
    }
    onAdd?.({
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
      supplier: form.supplier,
      barcode: form.barcode.trim(),
    });
  }

  const border = (key: keyof FormState) => (errors[key] ? "border-danger" : "border-input");

  return (
    <Modal title={product ? `Edit ${product.name}` : "Add product"} subtitle={product ? `SKU ${product.id}` : "It will show in Products right away"} onClose={onClose}>
      <form noValidate onSubmit={submit} className="flex flex-col min-h-0">
        <div className="overflow-y-auto px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product name" error={errors.name} className="sm:col-span-2">
            <input name="name" type="text" value={form.name} onChange={set("name")} placeholder="e.g. Rye flour, 5 kg" className={`${inputClass} ${border("name")}`} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Category">
            <select name="cat" value={form.cat} onChange={set("cat")} className={`${inputClass} border-input`}>
              {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Location">
            <select name="loc" value={form.loc} onChange={set("loc")} className={`${inputClass} border-input`}>
              {locationNames.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="SKU" hint={editing ? "(can't be changed)" : "(optional)"} error={errors.sku}>
            <input name="sku" type="text" value={form.sku} onChange={set("sku")} placeholder={suggestedSku} readOnly={editing} className={`${inputClass} font-mono uppercase ${border("sku")} ${editing ? "bg-table-head text-muted" : ""}`} aria-invalid={!!errors.sku} />
          </Field>
          <Field label="Barcode" hint="(optional)">
            <input name="barcode" type="text" inputMode="numeric" value={form.barcode} onChange={set("barcode")} placeholder="Scan or type" className={`${inputClass} border-input`} />
          </Field>
          <Field label="On hand" hint={editing ? "(change it with Update stock)" : undefined} error={errors.qty}>
            <input name="qty" type="number" min="0" step="1" inputMode="numeric" value={form.qty} onChange={set("qty")} placeholder="0" readOnly={editing} className={`${inputClass} ${border("qty")} ${editing ? "bg-table-head text-muted" : ""}`} aria-invalid={!!errors.qty} />
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
          <Field label="Supplier" hint="(optional, used when you reorder)" className="sm:col-span-2">
            <select name="supplier" value={form.supplier} onChange={set("supplier")} className={`${inputClass} border-input`}>
              <option value="">No supplier yet</option>
              {SUPPLIERS.map((s) => <option key={s.name}>{s.name}</option>)}
              {form.supplier && !SUPPLIERS.some((s) => s.name === form.supplier) && <option>{form.supplier}</option>}
            </select>
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

        {editing && confirmDelete && (
          <div role="alert" className="mx-5 mb-1 p-3.5 rounded-xl bg-danger-100 text-danger text-sm flex flex-col gap-3">
            <p>
              <strong>Delete {product.name}?</strong> It will be removed from Products and reports.{" "}
              {movements.some((m) => m.productId === product.id) && "Its past movements stay in Stock movements. "}
              {orders[product.id] && `Its open order (PO #${orders[product.id].po}) will be cancelled. `}
              You can undo right after.
            </p>
            <div className="flex gap-2">
              <Button className="text-sm px-3.5" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
              <Button className="text-sm px-3.5 bg-danger! text-white! border-danger! hover:brightness-110" onClick={() => onDelete?.(product.id)}>
                Delete product
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-line-soft pb-[max(16px,env(safe-area-inset-bottom))]">
          {editing && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="sm:mr-auto min-h-11 px-2 text-sm font-semibold text-danger hover:underline cursor-pointer"
            >
              Delete product
            </button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="px-[18px]">{editing ? "Save changes" : "Add product"}</Button>
        </div>
      </form>
    </Modal>
  );
}
