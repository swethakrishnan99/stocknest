import { useState } from "react";
import { Store, Sparkles } from "lucide-react";
import NestMark, { Wordmark } from "./NestMark";
import SetupBusiness from "./SetupBusiness";
import { useInventory } from "../state/inventoryContext";

/** First screen on a new device: look around a sample bakery, or set up your own business. */
export default function Welcome() {
  const { loadDemo, startOwnBusiness } = useInventory();
  const [settingUp, setSettingUp] = useState(false);

  return (
    <main className="min-h-screen bg-page flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[640px] flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <NestMark className="w-11 h-11" />
          <Wordmark className="text-ink" />
        </div>

        {settingUp ? (
          <section aria-labelledby="setup-h" className="bg-white border border-line rounded-2xl p-5 sm:p-7 flex flex-col gap-5">
            <div>
              <h1 id="setup-h" className="font-display text-[28px] font-bold leading-tight">
                Set up your business
              </h1>
              <p className="text-muted mt-1">A few questions, then you can add your products. Takes about a minute.</p>
            </div>
            <SetupBusiness onStart={startOwnBusiness} onCancel={() => setSettingUp(false)} />
          </section>
        ) : (
          <>
            <div>
              <h1 className="font-display text-[32px] sm:text-[40px] font-bold leading-tight">Know what's on your shelves.</h1>
              <p className="text-muted text-[17px] mt-2">
                StockNest keeps count of your stock, warns you before you run out and makes reordering easy. Made for small and home businesses.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSettingUp(true)}
                className="text-left p-5 rounded-2xl bg-navy text-white border border-navy hover:brightness-110 cursor-pointer flex flex-col gap-2"
              >
                <Store className="w-7 h-7 text-coral" aria-hidden="true" />
                <span className="text-lg font-bold">Set up my business</span>
                <span className="text-sm text-[#C5CEDF]">Start empty with your own name, categories and locations.</span>
              </button>
              <button
                type="button"
                onClick={loadDemo}
                className="text-left p-5 rounded-2xl bg-white border border-line hover:bg-line-soft cursor-pointer flex flex-col gap-2"
              >
                <Sparkles className="w-7 h-7 text-accent" aria-hidden="true" />
                <span className="text-lg font-bold">Try the demo bakery</span>
                <span className="text-sm text-muted">Look around with 51 sample products and six weeks of history. You can start your own any time.</span>
              </button>
            </div>
            <p className="text-[13px] text-muted">Your data stays on this device. You can download a backup from Settings at any time.</p>
          </>
        )}
      </div>
    </main>
  );
}
