import { Lock } from "lucide-react";
import { useInventory } from "../state/inventoryContext";

/** Shown instead of a screen the current person's role can't use */
export default function NotAllowed({ what }: { what: string }) {
  const { currentUser } = useInventory();
  return (
    <main className="flex-1 min-w-0 flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
      <Lock className="w-8 h-8 text-muted" aria-hidden="true" />
      <h1 className="font-display text-2xl font-bold">{what} is for owners and managers</h1>
      <p className="text-muted max-w-[420px]">
        You're signed in as {currentUser?.name ?? "staff"} ({currentUser?.role ?? "Staff"}). Ask the owner to change your role in Settings if you need it.
      </p>
    </main>
  );
}
