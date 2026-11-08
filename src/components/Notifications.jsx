import { ChevronRight, PackageX, TriangleAlert, Truck } from "lucide-react";
import Modal from "./Modal";
import { useInventory } from "../state/inventoryContext";
import { shortDate } from "../lib/dates";

function Row({ icon: Icon, tone, title, detail, onClick }) {
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

/** Stock alerts: what's out, what's low, and purchase orders on the way. */
export default function Notifications({ onOpenProduct, onClose }) {
  const { reorderList, orders } = useInventory();
  const waiting = reorderList.filter((i) => !orders[i.id]);
  const ordered = Object.values(orders);

  return (
    <Modal title="Alerts" subtitle={waiting.length ? `${waiting.length} items need attention` : "Nothing needs attention"} onClose={onClose}>
      <ul className="overflow-y-auto pb-[max(12px,env(safe-area-inset-bottom))]">
        {waiting.map((i) => (
          <Row
            key={i.id}
            icon={i.status === "out" ? PackageX : TriangleAlert}
            tone={i.status === "out" ? "bg-danger-100 text-danger" : "bg-warning-100 text-warning"}
            title={i.status === "out" ? `${i.name} is out of stock` : `${i.name} is running low`}
            detail={`${i.left} ${i.unit} left · reorder at ${i.reorder} · ${i.loc}`}
            onClick={() => onOpenProduct(i.id)}
          />
        ))}
        {ordered.map((o) => (
          <Row
            key={o.po}
            icon={Truck}
            tone="bg-line-soft text-navy-700"
            title={`PO #${o.po} · ${o.item}`}
            detail={`${o.qty} ${o.unit} from ${o.supplier} · due ${shortDate(o.due)}`}
            onClick={() => onOpenProduct(o.productId)}
          />
        ))}
        {waiting.length === 0 && ordered.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-muted border-t border-line-soft">
            Everything is above its reorder point. Nice work.
          </li>
        )}
      </ul>
    </Modal>
  );
}
