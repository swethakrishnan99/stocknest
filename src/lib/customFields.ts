// Custom fields: details a business adds to its products, like "Size", "Allergens" or "Expiry".
// The fields are listed in Business.customFields; each product keeps its values in Product.fields,
// keyed by the field's id, so a field can be renamed without touching its products.
import type { CustomField, CustomFieldType, Product } from "../types";

export const FIELD_TYPES: { key: CustomFieldType; label: string; hint: string }[] = [
  { key: "text", label: "Text", hint: "Anything, like a colour or batch code" },
  { key: "number", label: "Number", hint: "Like a weight or a size number" },
  { key: "date", label: "Date", hint: "Like an expiry or warranty date" },
  { key: "choice", label: "Choice", hint: "Pick from a list, like S, M, L" },
];

export const typeLabel = (type: CustomFieldType) => FIELD_TYPES.find((t) => t.key === type)?.label ?? type;

/** A new id that isn't used yet, based on the name so files and backups stay readable */
export function newFieldId(name: string, existing: Pick<CustomField, "id">[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "field";
  const used = new Set(existing.map((f) => f.id));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Options typed as "S, M, L" → ["S", "M", "L"], without blanks or repeats */
export function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()));
}

/** Checks a field's settings before saving. Returns a message, or "" when it's fine. */
export function checkField(field: Pick<CustomField, "name" | "type" | "options">, others: Pick<CustomField, "name">[]): string {
  const name = field.name.trim();
  if (!name) return "Enter a name for the field.";
  if (others.some((f) => f.name.trim().toLowerCase() === name.toLowerCase())) return `There's already a field called ${name}.`;
  if (field.type === "choice" && !(field.options ?? []).length) return "Add at least one option, separated by commas.";
  return "";
}

export const fieldValue = (p: Pick<Product, "fields">, field: Pick<CustomField, "id">) => p.fields?.[field.id] ?? "";

/** Checks a value typed for a product. Returns a message, or "" when it's fine (empty is always fine). */
export function checkValue(field: CustomField, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (field.type === "number" && !Number.isFinite(Number(value))) return `${field.name} must be a number.`;
  if (field.type === "date" && !isDate(value)) return `${field.name} must be a date (YYYY-MM-DD).`;
  if (field.type === "choice" && !(field.options ?? []).some((o) => o.toLowerCase() === value.toLowerCase())) {
    return `${field.name} must be one of: ${(field.options ?? []).join(", ")}.`;
  }
  return "";
}

/** The value as it should be saved: trimmed, and a choice spelled the way the option is */
export function cleanValue(field: CustomField, raw: string): string {
  const value = raw.trim();
  if (field.type === "choice") return (field.options ?? []).find((o) => o.toLowerCase() === value.toLowerCase()) ?? value;
  return value;
}

/** Values for the product's fields, leaving out empty ones so products stay small */
export function cleanFieldValues(fields: CustomField[], values: Record<string, string>): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = cleanValue(f, values[f.id] ?? "");
    if (v) out[f.id] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Values kept for fields that were removed stay on the product, so they come back with a backup */
export function mergeFieldValues(fields: CustomField[], previous: Record<string, string> | undefined, values: Record<string, string>) {
  const known = new Set(fields.map((f) => f.id));
  const kept = Object.fromEntries(Object.entries(previous ?? {}).filter(([id]) => !known.has(id)));
  const merged = { ...kept, ...cleanFieldValues(fields, values) };
  return Object.keys(merged).length ? merged : undefined;
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** A value as it reads on screen, e.g. a date as "Mar 4, 2027" */
export function displayValue(field: CustomField, value: string): string {
  if (field.type === "date" && isDate(value)) {
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  }
  return value;
}

/** True when any of the product's field values contains the search text */
export function fieldsMatch(p: Pick<Product, "fields">, fields: CustomField[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => {
    const v = fieldValue(p, f);
    return !!v && (v.toLowerCase().includes(q) || displayValue(f, v).toLowerCase().includes(q));
  });
}

/** The "has no value" choice in the field filter */
export const EMPTY_FILTER = "\u0000empty";

/**
 * Whether a product passes the filter on one field. `value` is an option for a choice field,
 * EMPTY_FILTER for products without a value, "" for any value, or text to look for otherwise.
 */
export function matchesFieldFilter(p: Pick<Product, "fields">, field: CustomField, value: string): boolean {
  const v = fieldValue(p, field);
  if (value === EMPTY_FILTER) return !v;
  if (!value) return !!v;
  if (field.type === "choice") return v.toLowerCase() === value.toLowerCase();
  return v.toLowerCase().includes(value.trim().toLowerCase()) || displayValue(field, v).toLowerCase().includes(value.trim().toLowerCase());
}
