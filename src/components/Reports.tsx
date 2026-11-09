import { Download, FileSpreadsheet, Truck } from "lucide-react";
import Button from "./Button";
import PageHeader from "./PageHeader";
import StatusChip from "./StatusChip";
import { useState } from "react";
import { money, suggestedOrder } from "../lib/sampleData";
import { PERIODS, buildReport, chartTop, type Bucket, type ProductTotal } from "../lib/reports";
import type { ReactNode } from "react";
import { clockTime, monthDay, todayISO } from "../lib/dates";
import { useInventory } from "../state/inventoryContext";
import { downloadCsv } from "../lib/csv";

const short = (n: number) => money(n).replace(/\.\d\d$/, ""); // whole dollars for axis and bar labels

function Stat({ label, value, note, tone = "" }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="bg-white border border-line rounded-[14px] p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className={`font-display text-[32px] font-bold mt-1.5 leading-tight ${tone}`}>{value}</div>
      <div className="text-[13px] text-muted mt-1">{note}</div>
    </div>
  );
}

interface CardProps {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

function Card({ id, title, subtitle, action, children, className = "" }: CardProps) {
  return (
    <section aria-labelledby={id} className={`bg-white border border-line rounded-[14px] p-5 ${className}`}>
      <div className="flex justify-between items-start gap-3 mb-4">
        <div>
          <h2 id={id} className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FlowChart({ buckets, unit }: { buckets: Bucket[]; unit: "day" | "week" }) {
  const top = chartTop(buckets);
  return (
    <>
      <div className="flex gap-4 text-[13px] text-muted mb-3" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-navy-700" />Stock in</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-accent" />Stock out</span>
        <span className="ml-auto">Top of chart: {short(top)}</span>
      </div>
      <div className="flex items-end gap-2 sm:gap-4 h-[200px] border-b border-line pl-1" aria-hidden="true">
        {buckets.map((b) => (
          <div key={b.key} className="flex-1 h-full flex items-end justify-center gap-1">
            <div className="w-full max-w-5 bg-navy-700 rounded-t" style={{ height: `${(b.in / top) * 100}%` }} title={`${b.label}: ${money(b.in)} in`} />
            <div className="w-full max-w-5 bg-accent rounded-t" style={{ height: `${(b.out / top) * 100}%` }} title={`${b.label}: ${money(b.out)} out`} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 sm:gap-4 pl-1 mt-2 text-xs text-muted" aria-hidden="true">
        {buckets.map((b) => (
          <div key={b.key} className="flex-1 text-center">{b.label}</div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Value of stock in and out per {unit}, at cost</caption>
        <thead>
          <tr><th scope="col">{unit === "day" ? "Day" : "Week of"}</th><th scope="col">Stock in</th><th scope="col">Stock out</th></tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key}><th scope="row">{b.label}</th><td>{money(b.in)}</td><td>{money(b.out)}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

type BarRow = ProductTotal & { sortBy: number };

interface BarListProps {
  rows: BarRow[];
  value: (row: BarRow) => string;
  empty: string;
  tone?: string;
}

function BarList({ rows, value, empty, tone = "bg-navy-700" }: BarListProps) {
  if (rows.length === 0) return <p className="text-sm text-muted py-4">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.sortBy));
  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="flex justify-between gap-3 text-sm mb-1.5">
            <span className="font-medium min-w-0 truncate">{r.name}</span>
            <span className="font-semibold whitespace-nowrap">{value(r)}</span>
          </div>
          <div className="h-2.5 bg-line-soft rounded-md overflow-hidden">
            <div className={`h-2.5 rounded-md ${tone}`} style={{ width: `${(r.sortBy / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Reports({ onOrderBySupplier }: { onOrderBySupplier: () => void }) {
  const { movements, products, summary, reorderList, orders, can } = useInventory();
  const [periodId, setPeriodId] = useState("4w");
  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[0];
  const report = buildReport(movements, products, period, todayISO());
  const range = `${monthDay(report.from)} – ${monthDay(report.to)}`;

  const exports = [
    {
      title: "Inventory valuation",
      hint: "Every product with quantity, location and value",
      run: () =>
        downloadCsv(
          "stocknest-inventory.csv",
          ["SKU", "Product", "Category", "Location", "On hand", "Unit", "Reorder at", "Value"],
          products.map((p) => [p.id, p.name, p.cat, p.loc, p.qty, p.unit, p.reorder, p.value])
        ),
    },
    {
      title: "Movement history",
      hint: "All stock in, stock out and counts",
      run: () =>
        downloadCsv(
          "stocknest-movements.csv",
          ["Date", "Time", "Type", "Quantity", "Unit", "Product", "Reason", "Location", "By"],
          movements.map((m) => [m.at.slice(0, 10), clockTime(m.at), m.kind, m.kind === "out" ? -m.qty : m.qty, m.unit, m.product, m.reason, m.loc, m.who])
        ),
    },
    {
      title: "Reorder list",
      hint: "Low and out-of-stock items with suggested order",
      run: exportReorder,
    },
  ];

  function exportReorder() {
    downloadCsv(
      "stocknest-reorder.csv",
      ["Product", "Location", "On hand", "Reorder at", "Suggested order"],
      reorderList.map((i) => [i.name, i.loc, i.left, i.reorder, suggestedOrder(i)])
    );
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col gap-5 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
      <PageHeader title="Reports" subtitle={`${period.label} · ${range} · values at cost`}>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <span className="sr-only sm:not-sr-only">Period</span>
          <select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            className="h-11 px-3 rounded-[10px] border border-input bg-white text-[15px] font-normal text-ink"
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
      </PageHeader>

      <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Stat label="Stock value now" value={summary.stockValue} note="at cost, CAD" />
        <Stat label="Stock in" value={`+${short(report.valueIn)}`} note={`${report.unitsIn.toLocaleString()} units · deliveries and baking`} tone="text-success" />
        <Stat label="Stock out" value={`−${short(report.valueOut)}`} note={`${report.unitsOut.toLocaleString()} units · used, sold and wasted`} tone="text-danger" />
        <Stat
          label="Waste"
          value={money(report.wasteValue)}
          note={report.topWaste[0] ? `${report.wasteUnits} units · most from ${report.topWaste[0].name.split(",")[0].toLowerCase()}` : "nothing thrown away"}
        />
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <Card
          id="flow-h"
          title={`Stock in vs out per ${period.bucket}`}
          subtitle="Value at cost"
          className="flex-[2_1_480px] min-w-0"
        >
          <FlowChart buckets={report.buckets} unit={period.bucket} />
        </Card>
        <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-4">
          <Card id="top-h" title="Most used" subtitle="Used in production or sold, by value">
            <BarList
              rows={report.topUsed.map((r) => ({ ...r, sortBy: r.value }))}
              value={(r) => `${r.qty.toLocaleString()} ${r.unit} · ${short(r.value)}`}
              empty="Nothing used or sold in this period."
            />
          </Card>
          <Card id="waste-h" title="Most wasted" subtitle="Damaged or expired, by value">
            <BarList
              rows={report.topWaste.map((r) => ({ ...r, sortBy: r.value }))}
              value={(r) => `${r.qty} ${r.unit} · ${money(r.value)}`}
              empty="Nothing thrown away in this period."
              tone="bg-accent"
            />
          </Card>
        </div>
      </div>

      <Card
        id="reorder-h"
        title="Reorder list"
        action={
          <div className="flex flex-wrap gap-2">
            {can("order") && reorderList.some((i) => !orders[i.id]) && (
              <Button className="px-3.5 text-sm" onClick={onOrderBySupplier}>
                <Truck className="w-4 h-4" />
                Order by supplier
              </Button>
            )}
            <Button className="px-3.5 text-sm" onClick={exportReorder}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th scope="col" className="py-2 font-semibold">Product</th>
                <th scope="col" className="py-2 px-3 font-semibold">Location</th>
                <th scope="col" className="py-2 px-3 font-semibold text-right">On hand</th>
                <th scope="col" className="py-2 px-3 font-semibold text-right">Reorder at</th>
                <th scope="col" className="py-2 px-3 font-semibold">Status</th>
                <th scope="col" className="py-2 font-semibold text-right">Suggested order</th>
              </tr>
            </thead>
            <tbody>
              {reorderList.map((i) => (
                <tr key={i.id} className="border-t border-line-soft">
                  <td className="py-3 font-semibold">{i.name}</td>
                  <td className="py-3 px-3">{i.loc}</td>
                  <td className="py-3 px-3 text-right">{i.left}</td>
                  <td className="py-3 px-3 text-right text-muted">{i.reorder}</td>
                  <td className="py-3 px-3"><StatusChip status={i.status} label={i.status === "out" ? "Out" : "Low"} /></td>
                  <td className="py-3 text-right font-semibold">{suggestedOrder(i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="dl-h" title="Downloads">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {exports.map((e) => (
            <button
              key={e.title}
              type="button"
              onClick={e.run}
              className="flex items-center gap-3 p-4 rounded-xl border border-input text-left hover:bg-line-soft cursor-pointer"
            >
              <span className="w-10 h-10 shrink-0 rounded-[10px] bg-line-soft text-navy-700 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[15px]">{e.title} (CSV)</span>
                <span className="block text-[13px] text-muted">{e.hint}</span>
              </span>
              <Download className="w-[18px] h-[18px] text-muted" />
            </button>
          ))}
        </div>
      </Card>
    </main>
  );
}
