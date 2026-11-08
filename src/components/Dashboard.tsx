import { useState } from "react";
import { ScanBarcode, Plus, Bell, PackageCheck } from "lucide-react";
import Button from "./Button";
import StatusChip from "./StatusChip";
import PhoneHome from "./PhoneHome";
import ProductSearch from "./ProductSearch";
import GettingStarted from "./GettingStarted";
import Notifications from "./Notifications";
import { useInventory } from "../state/inventoryContext";
import { addDays, longDate, shortDate, todayISO } from "../lib/dates";
import { currentAlerts, daySummary } from "../lib/alerts";
import type { ReactNode } from "react";
import type { Navigate, ReorderItem } from "../types";

interface StatCardProps {
  label: string;
  value: ReactNode;
  note: string;
  tone?: "warning" | "danger" | "info";
  onClick?: () => void;
}

function StatCard({ label, value, note, tone, onClick }: StatCardProps) {
  const tones = {
    warning: "bg-warning-100 border-warning-border text-warning",
    danger: "bg-danger-100 border-danger-border text-danger",
    info: "bg-white border-line text-navy-700",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`text-left rounded-[14px] border p-5 ${
        tone ? `${tones[tone]} cursor-pointer hover:brightness-[0.98]` : "bg-white border-line"
      }`}
    >
      <div className={`text-sm ${tone ? "font-semibold" : "text-muted"}`}>{label}</div>
      <div className="font-display text-[28px] font-bold mt-1.5 leading-tight">{value}</div>
      <div className={`text-[13px] mt-1 ${tone ? "" : "text-muted"}`}>{note}</div>
    </Tag>
  );
}

interface PanelProps {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

function Panel({ id, title, action, children, className = "" }: PanelProps) {
  return (
    <section aria-labelledby={id} className={`bg-white border border-line rounded-[14px] p-5 pb-2 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h2 id={id} className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-semibold text-accent hover:text-accent-800 cursor-pointer">
      {children}
    </button>
  );
}

interface DashboardProps {
  onNavigate: Navigate;
  onSearch: (query: string) => void;
  onAddProduct: () => void;
  onReorder: (item: ReorderItem) => void;
  onReceive: (productId: string) => void;
  onOrderBySupplier: () => void;
}

export default function Dashboard({ onNavigate, onSearch, onAddProduct, onReorder, onReceive, onOrderBySupplier }: DashboardProps) {
  const { products, movements, batches, alerts, summary, reorderList, recent, categoryValues, orders, can } = useInventory();
  const [showAlerts, setShowAlerts] = useState(false);
  const alertCount = currentAlerts(products, orders, batches, alerts, todayISO()).length;
  const yesterday = daySummary(movements, addDays(todayISO(), -1));
  const canOrderMany = can("order") && reorderList.filter((i) => !orders[i.id]).length > 1;

  if (products.length === 0) {
    return (
      <main className="flex-1 min-w-0 flex flex-col gap-6 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
        <div>
          <h1 className="font-display text-[32px] font-bold leading-tight">Dashboard</h1>
          <p className="mt-1 text-muted text-[15px]">{longDate(todayISO())}</p>
        </div>
        <GettingStarted onNavigate={onNavigate} onAddProduct={onAddProduct} />
      </main>
    );
  }

  return (
    <>
      <PhoneHome onNavigate={onNavigate} onSearch={onSearch} />

      <main className="hidden md:flex flex-1 min-w-0 flex-col gap-6 px-10 pt-8 pb-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] font-bold leading-tight">Dashboard</h1>
            <p className="mt-1 text-muted text-[15px]">{longDate(todayISO())}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ProductSearch
              className="min-w-[260px]"
              onOpenProduct={(id) => onNavigate("product", { id })}
              onSeeAll={onSearch}
            />
            <Button variant="outline" onClick={() => setShowAlerts(true)} aria-label={`Alerts, ${alertCount} need attention`}>
              <Bell className="w-[18px] h-[18px]" />
              {alertCount > 0 && <span className="min-w-6 h-6 px-1.5 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">{alertCount}</span>}
            </Button>
            <Button variant="outline" onClick={() => onNavigate("scan")}>
              <ScanBarcode className="w-[18px] h-[18px]" />
              Scan
            </Button>
            {can("editProducts") && (
              <Button variant="primary" className="px-[18px]" onClick={onAddProduct}>
                <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
                Add product
              </Button>
            )}
          </div>
        </header>

        <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
          <StatCard label="Products" value={summary.products} note={`across ${summary.categories} categories`} />
          <StatCard label="Stock value" value={summary.stockValue} note="at cost, CAD" />
          <StatCard label="Low stock" value={summary.low} note="below reorder point →" tone="warning" onClick={() => onNavigate("products", { status: "low" })} />
          <StatCard label="Out of stock" value={summary.out} note="needs reorder now →" tone="danger" onClick={() => onNavigate("products", { status: "out" })} />
          <StatCard
            label="On order"
            value={Object.keys(orders).length}
            note="not received yet →"
            tone="info"
            onClick={() => onNavigate("products", { status: "ordered" })}
          />
        </section>

        {alerts.dailySummary && yesterday.movements > 0 && (
          <button
            type="button"
            onClick={() => onNavigate("movements")}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 rounded-[14px] bg-white border border-line text-left text-sm hover:bg-line-soft cursor-pointer"
          >
            <PackageCheck className="w-5 h-5 text-navy-700" aria-hidden="true" />
            <strong>Yesterday</strong>
            <span>{yesterday.movements} movements</span>
            <span className="text-success">+{yesterday.unitsIn} in</span>
            <span className="text-danger">−{yesterday.unitsOut} out</span>
            {yesterday.wasted > 0 && <span className="text-muted">{yesterday.wasted} wasted</span>}
            {yesterday.counts > 0 && <span className="text-muted">{yesterday.counts} counted</span>}
            <span className="ml-auto text-muted">See history →</span>
          </button>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-4">
          <Panel
            id="low-h"
            title="Needs reordering"
            action={
              <div className="flex items-center gap-4">
                {canOrderMany && <TextLink onClick={onOrderBySupplier}>Order by supplier</TextLink>}
                <TextLink onClick={() => onNavigate("products", { status: "reorder" })}>View all</TextLink>
              </div>
            }
          >
            {reorderList.length === 0 && <p className="py-6 border-t border-line-soft text-sm text-muted">Everything is above its reorder point.</p>}
            {reorderList.map((item) => {
              const order = orders[item.id];
              return (
                <div key={item.id} className="flex items-center gap-3 py-3 border-t border-line-soft">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[15px]">{item.name}</div>
                    <div className="text-[13px] text-muted" aria-live="polite">
                      {order
                        ? `PO #${order.po} · ${order.qty} ${order.unit} from ${order.supplier} · due ${shortDate(order.due)}`
                        : `${item.left} left · reorder at ${item.reorder} · ${item.loc}`}
                    </div>
                  </div>
                  {order ? (
                    <>
                      <StatusChip status="ordered" label="Ordered" />
                      <Button className="px-3.5 text-sm" onClick={() => onReceive(item.id)} aria-label={`Receive PO #${order.po} for ${item.name}`}>
                        Receive
                      </Button>
                    </>
                  ) : (
                    <>
                      <StatusChip status={item.status} label={item.status === "out" ? "Out" : "Low"} />
                      {can("order") && (
                        <Button className="px-3.5 text-sm" onClick={() => onReorder(item)} aria-label={`Reorder ${item.name}`}>
                          Reorder
                        </Button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </Panel>

          <Panel id="act-h" title="Recent activity" action={<TextLink onClick={() => onNavigate("movements")}>View history</TextLink>}>
            {recent.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-3 border-t border-line-soft">
                <div className={`w-16 font-display font-bold text-[17px] ${a.tone}`}>{a.signed}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px]">{a.name}</div>
                  <div className="text-[13px] text-muted">{a.detail}</div>
                </div>
                <div className="text-[13px] text-muted">{a.when}</div>
              </div>
            ))}
          </Panel>
        </div>

        <section aria-labelledby="val-h" className="bg-white border border-line rounded-[14px] p-5">
          <h2 id="val-h" className="text-lg font-bold mb-4">Stock value by category</h2>
          <div className="flex flex-col gap-3.5">
            {categoryValues.map((c) => (
              <div key={c.name} className="grid grid-cols-[140px_minmax(0,1fr)_80px] gap-4 items-center">
                <div className="text-sm font-medium">{c.name}</div>
                <div className="h-3 bg-line-soft rounded-md overflow-hidden" role="img" aria-label={`${c.pct}% of the largest category`}>
                  <div className="h-3 bg-navy-700 rounded-md" style={{ width: `${c.pct}%` }} />
                </div>
                <div className="text-sm font-semibold text-right">{c.value}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
      {showAlerts && (
        <Notifications
          onClose={() => setShowAlerts(false)}
          onOpenProduct={(id) => {
            setShowAlerts(false);
            onNavigate("product", { id });
          }}
        />
      )}
    </>
  );
}
