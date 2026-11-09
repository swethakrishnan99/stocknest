import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Camera, ChevronDown, ScanBarcode } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import ProductTile from "./ProductTile";
import StatusChip from "./StatusChip";
import { money, stockStatus } from "../lib/sampleData";
import { nextSku } from "../lib/productCsv";
import { tintFor } from "../lib/templates";
import { shrinkPhoto } from "../lib/photo";
import { checkValue, cleanFieldValues, fieldValue, mergeFieldValues } from "../lib/customFields";
import CameraScanner from "./CameraScanner";
import { useInventory } from "../state/inventoryContext";
import type { Product } from "../types";

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
  cat: string;
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
  const { products, movements, orders, locationNames, business, suppliers } = useInventory();
  const categories = business.categories;
  const customFields = business.customFields;
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(customFields.map((f) => [f.id, product ? fieldValue(product, f) : ""]))
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moreOpen, setMoreOpen] = useState(!!product);
  const [photo, setPhoto] = useState(product?.photo ?? "");
  const [photoError, setPhotoError] = useState("");
  const [scanning, setScanning] = useState(false);
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
          cat: categories[0] ?? "Products",
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

  const setFieldValue = (id: string, value: string) => {
    setFieldValues((v) => ({ ...v, [id]: value }));
    setFieldErrors((er) => ({ ...er, [id]: "" }));
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
    const fer = Object.fromEntries(
      customFields.map((f) => [f.id, checkValue(f, fieldValues[f.id] ?? "")]).filter(([, m]) => m)
    );
    setErrors(er);
    setFieldErrors(fer);
    const firstBad = Object.keys(er)[0] ?? (Object.keys(fer)[0] && `field-${Object.keys(fer)[0]}`);
    if (firstBad) {
      if (er.reorder || er.cost || er.sku || Object.keys(fer).length) setMoreOpen(true);
      const form = e.currentTarget;
      const focus = () => form.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      if (form.querySelector(`[name="${firstBad}"]`)) focus();
      else setTimeout(focus); // the details section appears on the next render
      return;
    }
    if (product) {
      onSave?.(product.id, {
        name,
        initial: name[0].toUpperCase(),
        tint: product.cat === form.cat ? product.tint : tintFor(categories, form.cat),
        cat: form.cat,
        loc: form.loc,
        unit: form.unit.trim(),
        reorder,
        unitCost: cost,
        supplier: form.supplier,
        barcode: form.barcode.trim(),
        photo: photo || undefined,
        fields: mergeFieldValues(customFields, product.fields, fieldValues),
      });
      return;
    }
    onAdd?.({
      id: sku,
      name,
      initial: name[0].toUpperCase(),
      tint: tintFor(categories, form.cat),
      cat: form.cat,
      loc: form.loc,
      qty,
      unit: form.unit.trim(),
      reorder,
      unitCost: cost,
      supplier: form.supplier,
      barcode: form.barcode.trim(),
      ...(photo && { photo }),
      ...(cleanFieldValues(customFields, fieldValues) && { fields: cleanFieldValues(customFields, fieldValues) }),
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
          <Field label="On hand" hint={editing ? "(change it with Update stock)" : undefined} error={errors.qty}>
            <input name="qty" type="number" min="0" step="1" inputMode="numeric" value={form.qty} onChange={set("qty")} placeholder="0" readOnly={editing} className={`${inputClass} ${border("qty")} ${editing ? "bg-table-head text-muted" : ""}`} aria-invalid={!!errors.qty} />
          </Field>
          <Field label="Unit" error={errors.unit}>
            <input name="unit" type="text" list="unit-options" value={form.unit} onChange={set("unit")} placeholder="bags, pcs, boxes…" className={`${inputClass} ${border("unit")}`} aria-invalid={!!errors.unit} />
            <datalist id="unit-options">
              {UNITS.map((u) => <option key={u} value={u} />)}
            </datalist>
          </Field>
          <Field label="Category">
            <select name="cat" value={form.cat} onChange={set("cat")} className={`${inputClass} border-input`}>
              {categories.map((c) => <option key={c}>{c}</option>)}
              {!categories.includes(form.cat) && <option>{form.cat}</option>}
            </select>
          </Field>
          <Field label="Location">
            <select name="loc" value={form.loc} onChange={set("loc")} className={`${inputClass} border-input`}>
              {locationNames.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2 flex items-center gap-3">
            <ProductTile initial={name ? name[0].toUpperCase() : "?"} tint={tintFor(categories, form.cat)} photo={photo} className="w-14 h-14 rounded-xl" />
            <label className="inline-flex items-center gap-2 h-11 px-4 rounded-[10px] border border-input bg-white text-sm font-semibold cursor-pointer hover:bg-line-soft focus-within:ring-2 focus-within:ring-ink">
              <Camera className="w-[18px] h-[18px]" aria-hidden="true" />
              {photo ? "Change photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    setPhoto(await shrinkPhoto(file));
                    setPhotoError("");
                  } catch (err) {
                    setPhotoError(err instanceof Error ? err.message : "That photo couldn't be used.");
                  }
                }}
              />
            </label>
            {photo && (
              <button type="button" onClick={() => setPhoto("")} className="text-sm font-semibold text-muted hover:text-ink hover:underline cursor-pointer">
                Remove
              </button>
            )}
            <span className="text-[13px] text-muted">(optional)</span>
            {photoError && <span role="alert" className="text-[13px] text-danger">{photoError}</span>}
          </div>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-navy-700 hover:underline cursor-pointer justify-self-start"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            {moreOpen
              ? "Fewer details"
              : `More details: reorder point, cost, supplier, SKU, barcode${customFields.length ? `, ${customFields.map((f) => f.name.toLowerCase()).join(", ")}` : ""}`}
          </button>
          {moreOpen && (
            <>
          <Field label="Reorder at" hint="(optional)" error={errors.reorder}>
            <input name="reorder" type="number" min="0" step="1" inputMode="numeric" value={form.reorder} onChange={set("reorder")} placeholder="0" className={`${inputClass} ${border("reorder")}`} aria-invalid={!!errors.reorder} />
          </Field>
          <Field label="Unit cost" hint="(CAD, optional)" error={errors.cost}>
            <input name="cost" type="number" min="0" step="0.01" inputMode="decimal" value={form.cost} onChange={set("cost")} placeholder="0.00" className={`${inputClass} ${border("cost")}`} aria-invalid={!!errors.cost} />
          </Field>
          <Field label="Supplier" hint="(optional, used when you reorder)" >
            <select name="supplier" value={form.supplier} onChange={set("supplier")} className={`${inputClass} border-input`}>
              <option value="">No supplier yet</option>
              {suppliers.map((s) => <option key={s.name}>{s.name}</option>)}
              {form.supplier && !suppliers.some((s) => s.name === form.supplier) && <option>{form.supplier}</option>}
            </select>
          </Field>
          <Field label="SKU" hint={editing ? "(can't be changed)" : "(optional)"} error={errors.sku}>
            <input name="sku" type="text" value={form.sku} onChange={set("sku")} placeholder={suggestedSku} readOnly={editing} className={`${inputClass} font-mono uppercase ${border("sku")} ${editing ? "bg-table-head text-muted" : ""}`} aria-invalid={!!errors.sku} />
          </Field>
          <Field label="Barcode" hint="(optional)">
            <div className="flex gap-2">
              <input name="barcode" type="text" inputMode="numeric" value={form.barcode} onChange={set("barcode")} placeholder="Scan or type" className={`${inputClass} border-input flex-1 min-w-0`} />
              <Button type="button" onClick={() => setScanning(true)} aria-label="Scan barcode with the camera">
                <ScanBarcode className="w-[18px] h-[18px]" />
              </Button>
            </div>
          </Field>
          {customFields.map((f) => (
            <Field key={f.id} label={f.name} hint="(optional)" error={fieldErrors[f.id]}>
              {f.type === "choice" ? (
                <select
                  name={`field-${f.id}`}
                  value={fieldValues[f.id] ?? ""}
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
                  className={`${inputClass} ${fieldErrors[f.id] ? "border-danger" : "border-input"}`}
                >
                  <option value="">Not set</option>
                  {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
                  {fieldValues[f.id] && !(f.options ?? []).includes(fieldValues[f.id]) && <option>{fieldValues[f.id]}</option>}
                </select>
              ) : (
                <input
                  name={`field-${f.id}`}
                  type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  step={f.type === "number" ? "any" : undefined}
                  value={fieldValues[f.id] ?? ""}
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
                  className={`${inputClass} ${fieldErrors[f.id] ? "border-danger" : "border-input"}`}
                  aria-invalid={!!fieldErrors[f.id]}
                />
              )}
            </Field>
          ))}
            </>
          )}
          <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-table-head border border-line-soft" aria-live="polite">
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
      {scanning && (
        <CameraScanner
          title="Scan the product's barcode"
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setScanning(false);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </Modal>
  );
}
