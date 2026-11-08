import { CalendarClock, ChevronRight, PackageX, TriangleAlert, Truck } from "lucide-react";
import Modal from "./Modal";
import { useInventory } from "../state/inventoryContext";
import { shortDate, todayISO } from "../lib/dates";
import { currentAlerts, type AlertKind } from "../lib/alerts";
import type { LucideIcon } from "lucide-react";

interface RowProps {
  icon: LucideIcon;
  tone: string;
  title: string;
  detail: string;
  onClick: () => void;
}

function Row({ icon: Icon, tone, title, detail, onClick }: RowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 px-5 py-3 text-left border-t border-line-soft hover:bg-line-soft cursor-pointer"
      >
        <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${tone}`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold">{title}</span>
          <span className="block text-[13px] text-muted">{detail}</span>
        </span>
        <ChevronRight className="w-[18px] h-[18px] text-muted" aria-hidden="true" />
      </button>
    </li>
  );
}

const LOOK: Record<AlertKind, { icon: LucideIcon; tone: string }> = {
  out: { icon: PackageX, tone: "bg-danger-100 text-danger" },
  expired: { icon: CalendarClock, tone: "bg-danger-100 text-danger" },
  overdue: { icon: Truck, tone: "bg-warning-100 text-warning" },
  expiring: { icon: CalendarClock, tone: "bg-warning-100 text-warning" },
  low: { icon: TriangleAlert, tone: "bg-warning-100 text-warning" },
};

/** What needs attention (stock, late orders, best-before dates), then orders on the way. */
export default function Notifications({ onOpenProduct, onClose }: { onOpenProduct: (id: string) => void; onClose: () => void }) {
  const { products, orders, batches, alerts } = useInventory();
  const attention = currentAlerts(products, orders, batches, alerts, todayISO());
  const late = new Set(attention.filter((a) => a.kind === "overdue").map((a) => a.productId));
  const onTheWay = Object.values(orders).filter((o) => !late.has(o.productId));

  return (
    <Modal title="Alerts" subtitle={attention.length ? `${attention.length} need attention` : "Nothing needs attention"} onClose={onClose}>
      <ul className="overflow-y-auto pb-[max(12px,env(safe-area-inset-bottom))]">
        {attention.map((a) => (
          <Row key={a.key} icon={LOOK[a.kind].icon} tone={LOOK[a.kind].tone} title={a.title} detail={a.detail} onClick={() => onOpenProduct(a.productId)} />
        ))}
        {onTheWay.map((o) => (
          <Row
            key={`po-${o.productId}`}
            icon={Truck}
            tone="bg-line-soft text-navy-700"
            title={`PO #${o.po} · ${o.item}`}
            detail={`${o.qty} ${o.unit} from ${o.supplier} · due ${shortDate(o.due)}`}
            onClick={() => onOpenProduct(o.productId)}
          />
        ))}
        {attention.length === 0 && onTheWay.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-muted border-t border-line-soft">
            Everything is above its reorder point and nothing is about to expire. Nice work.
          </li>
        )}
      </ul>
    </Modal>
  );
}
