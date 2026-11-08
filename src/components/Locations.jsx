import { MapPin, Plus, ChevronRight } from "lucide-react";
import Button from "./Button";
import PageHeader from "./PageHeader";
import StatusChip from "./StatusChip";
import { useInventory } from "../state/inventoryContext";

export default function Locations({ onOpenLocation }) {
  const { locations } = useInventory();
  const total = locations.reduce((n, l) => n + l.products, 0);

  return (
    <main className="flex-1 min-w-0 flex flex-col gap-5 px-5 pt-6 pb-28 md:px-10 md:pt-8 md:pb-12">
      <PageHeader title="Locations" subtitle={`${locations.length} locations · ${total} products`}>
        <Button variant="primary" className="px-[18px]">
          <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
          Add location
        </Button>
      </PageHeader>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {locations.map((l) => (
          <section key={l.name} aria-labelledby={`loc-${l.name}`} className="bg-white border border-line rounded-[14px] p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 shrink-0 rounded-xl bg-line-soft text-navy-700 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 id={`loc-${l.name}`} className="text-lg font-bold">{l.name}</h2>
                <p className="text-[13px] text-muted">{l.kind}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[13px] text-muted">Products</dt>
                <dd className="font-display text-2xl font-bold">{l.products}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Stock value</dt>
                <dd className="font-display text-2xl font-bold">{l.value}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              {l.low > 0 && <StatusChip status="low" label={`${l.low} low`} />}
              {l.out > 0 && <StatusChip status="out" label={`${l.out} out`} />}
              {l.low === 0 && l.out === 0 && <StatusChip status="ok" label="All stocked" />}
              <span className="text-[13px] text-muted ml-auto">Last counted {l.lastCount}</span>
            </div>

            <button
              type="button"
              onClick={() => onOpenLocation(l.name)}
              className="mt-auto flex items-center justify-between min-h-11 px-4 rounded-[10px] border border-input text-[15px] font-semibold hover:bg-line-soft cursor-pointer"
            >
              View products
              <ChevronRight className="w-[18px] h-[18px]" />
            </button>
          </section>
        ))}
      </div>
    </main>
  );
}
