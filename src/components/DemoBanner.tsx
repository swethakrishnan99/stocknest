import { useState } from "react";
import Modal from "./Modal";
import SetupBusiness from "./SetupBusiness";
import { useInventory } from "../state/inventoryContext";

/** A reminder that this is sample data, with a quick way to start for real. */
export default function DemoBanner() {
  const { startOwnBusiness } = useInventory();
  const [setting, setSetting] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2 bg-navy-700 text-white text-sm text-center">
        <span>You're looking at a demo bakery with sample data.</span>
        <button type="button" onClick={() => setSetting(true)} className="font-semibold text-coral-light underline underline-offset-2 cursor-pointer">
          Set up my business
        </button>
      </div>
      {setting && (
        <Modal title="Set up your business" subtitle="This replaces the demo data on this device" onClose={() => setSetting(false)}>
          <div className="overflow-y-auto px-5 py-5">
            <SetupBusiness
              onCancel={() => setSetting(false)}
              onStart={(b) => {
                startOwnBusiness(b);
                setSetting(false);
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
