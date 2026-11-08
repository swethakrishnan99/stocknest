import { Download, FileSpreadsheet } from "lucide-react";
import Button from "./Button";
import PageHeader from "./PageHeader";
import StatusChip from "./StatusChip";
import { SUMMARY, WEEKLY_FLOW, TOP_USED, WASTE, NEEDS_REORDER, PRODUCTS } from "../lib/sampleData";
import { downloadCsv } from "../lib/csv";

const CHART_MAX = 280; // units; top of the weekly chart

const suggestedOrder = (item) => item.reorder * 2 - item.left;

function Stat({ label, value, note, tone = "" }) {
  return (
    <div className="bg-white border border-line rounded-[14px] p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className={`font-display text-[32px] font-bold mt-1.5 leading-tight ${tone}`}>{value}</div>
      <div className="text-[13px] text-muted mt-1">{note}</div>
    </div>
  );
}

function Card({ id, title, action, children, className = "" }) {
  return (
    <section aria-labelledby={id} className={`bg-white border border-line rounded-[14px] p-5 ${className}`}>
      <div className="flex justify-between items-center gap-3 mb-4">
        <h2 id={id} className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function FlowChart() {
  return (
    <>
      <div className="flex gap-4 text-[13px] text-muted mb-3" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-navy-700" />Stock in</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-accent" />Stock out</span>
      </div>
      <div className="flex items-end gap-3 sm:gap-5 h-[200px] border-b border-line pl-1" aria-hidden="true">
        {WEEKLY_FLOW.map((w) => (
          <div key={w.week} className="flex-1 h-full flex items-end justify-center gap-1">
            <div
              className="w-full max-w-5 bg-navy-700 rounded-t"
              style={{ height: `${(w.in / CHART_MAX) * 100}%` }}
              title={`${w.week}: ${w.in} in`}
            />
            <div
              className="w-full max-w-5 bg-accent rounded-t"
              style={{ height: `${(w.out / CHART_MAX) * 100}%` }}
              title={`${w.week}: ${w.out} out`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-3 sm:gap-5 pl-1 mt-2 text-xs text-muted" aria-hidden="true">
        {WEEKLY_FLOW.map((w) => (
          <div key={w.week} className="flex-1 text-center">{w.week}</div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Units in and out per week</caption>
        <thead>
          <tr><th scope="col">Week of</th><th scope="col">Stock in</th><th scope="col">Stock out</th></tr>
        </thead>
        <tbody>
          {WEEKLY_FLOW.map((w) => (
            <tr key={w.week}><th scope="row">{w.week}</th><td>{w.in}</td><td>{w.out}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function Reports({ movements }) {
  const totalIn = WEEKLY_FLOW.reduce((n, w) => n + w.in, 0);
  const totalOut = WEEKLY_FLOW.reduce((n, w) => n + w.out, 0);
  const topMax = TOP_USED[0].used;

  const exports = [
    {
      title: "Inventory valuation",
      hint: "Every product with quantity, location and value",
      run: () =>
        downloadCsv(
          "stocknest-inventory.csv",
          ["SKU", "Product", "Category", "Location", "On hand", "Unit", "Reorder at", "Value"],
          PRODUCTS.map((p) => [p.id, p.name, p.cat, p.loc, p.qty, p.unit, p.reorder, p.value])
        ),
    },
    {
      title: "Movement history",
      hint: "All stock in, stock out and counts",
      run: () =>
        downloadCsv(
          "stocknest-movements.csv",
          ["Date", "Time", "Type", "Quantity", "Unit", "Product", "Reason", "Location", "By"],
          movements.map((m) => [m.day, m.time, m.kind, m.kind === "out" ? -m.qty : m.qty, m.unit, m.product, m.reason, m.loc, m.who])
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
      NEEDS_REORDER.map((i) => [i.name, i.loc, i.left, i.reorder, suggestedOrder(i)])
    );
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col gap-5 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
      <PageHeader title="Reports" subtitle="Sample data · last 6 weeks (Sep 29 – Nov 8)" />

      <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Stat label="Stock value" value={SUMMARY.stockValue} note="at cost, CAD" />
        <Stat label="Units in" value={`+${totalIn.toLocaleString()}`} note="deliveries and returns" tone="text-success" />
        <Stat label="Units out" value={`−${totalOut.toLocaleString()}`} note="sold and used" tone="text-danger" />
        <Stat label="Waste" value={WASTE.units} note={`${WASTE.value} · mostly ${WASTE.topReason.toLowerCase()}`} />
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <Card id="flow-h" title="Stock in vs out per week" className="flex-[2_1_480px] min-w-0">
          <FlowChart />
        </Card>
        <Card id="top-h" title="Most used" className="flex-[1_1_300px] min-w-0">
          <div className="flex flex-col gap-3.5">
            {TOP_USED.map((t) => (
              <div key={t.name}>
                <div className="flex justify-between gap-3 text-sm mb-1.5">
                  <span className="font-medium">{t.name}</span>
                  <span className="font-semibold whitespace-nowrap">
                    {t.used} {t.unit}
                  </span>
                </div>
                <div className="h-2.5 bg-line-soft rounded-md overflow-hidden">
                  <div className="h-2.5 bg-navy-700 rounded-md" style={{ width: `${(t.used / topMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        id="reorder-h"
        title="Reorder list"
        action={
          <Button className="px-3.5 text-sm" onClick={exportReorder}>
            <Download className="w-4 h-4" />
            Export
          </Button>
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
              {NEEDS_REORDER.map((i) => (
                <tr key={i.name} className="border-t border-line-soft">
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
