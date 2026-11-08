// One purchase order can hold several products from the same supplier. Each product's line is
// kept as its own open order (so lines are received one by one); they share the PO number.
import { money } from "./sampleData";
import { shortDate } from "./dates";
import type { Business, PurchaseOrder, Supplier } from "../types";

/** Usual days from ordering to delivery for a supplier (3 when we don't know) */
export const leadDays = (suppliers: Supplier[], supplier: string) => suppliers.find((s) => s.name === supplier)?.leadDays ?? 3;

export interface PoDocument {
  po: number;
  supplier: string;
  due: string;
  lines: PurchaseOrder[];
  total: number;
}

export function poDocument(orders: Record<string, PurchaseOrder>, po: number): PoDocument | null {
  const lines = Object.values(orders).filter((o) => o.po === po);
  if (!lines.length) return null;
  return { po, supplier: lines[0].supplier, due: lines[0].due, lines, total: lines.reduce((n, o) => n + o.total, 0) };
}

/** The email to send the supplier, as a mailto: link (opens the person's email app) */
export function poEmailLink(doc: PoDocument, business: Business, supplier?: Supplier) {
  const body = [
    `Hello${supplier ? ` ${supplier.name}` : ""},`,
    "",
    `Please supply the following for purchase order #${doc.po}, needed by ${shortDate(doc.due)}:`,
    "",
    ...doc.lines.map((l) => `- ${l.qty} ${l.unit} · ${l.item}${l.note ? ` (${l.note})` : ""}`),
    "",
    `Estimated total: ${money(doc.total)}`,
    "",
    "Thank you,",
    business.name,
  ].join("\n");
  const subject = `Purchase order #${doc.po} from ${business.name}`;
  return `mailto:${encodeURIComponent(supplier?.email ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Saves the purchase order as a PDF */
export async function downloadPoPdf(doc: PoDocument, business: Business, supplier?: Supplier) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(`Purchase order #${doc.po}`, 48, 64);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text([`From: ${business.name}`, `To: ${doc.supplier}${supplier?.email ? ` · ${supplier.email}` : ""}`, `Needed by: ${shortDate(doc.due)}`], 48, 92);
  autoTable(pdf, {
    startY: 140,
    head: [["Item", "Quantity", "Est. cost"]],
    body: doc.lines.map((l) => [l.item + (l.note ? `\n${l.note}` : ""), `${l.qty} ${l.unit}`, money(l.total)]),
    foot: [["", "Total", money(doc.total)]],
    headStyles: { fillColor: [15, 30, 61] },
    footStyles: { fillColor: [238, 240, 245], textColor: [15, 30, 61] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });
  pdf.save(`PO-${doc.po}.pdf`);
}
