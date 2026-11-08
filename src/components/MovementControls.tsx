import { Minus, Plus } from "lucide-react";
import type { MovementKind } from "../types";

// Segmented control for the movement type (stock in / out / set count)
interface ModeToggleProps {
  modes: [MovementKind, string][];
  value: MovementKind;
  onChange: (mode: MovementKind) => void;
}

export function ModeToggle({ modes, value, onChange }: ModeToggleProps) {
  return (
    <div role="group" aria-label="Movement type" className="grid grid-cols-3 bg-line-soft rounded-xl p-1">
      {modes.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`h-11 rounded-[9px] text-sm font-semibold text-ink cursor-pointer transition-colors ${
            value === key ? "bg-white shadow-sm" : "hover:bg-white/60"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function StepButton({ dir, onClick, large = false }: { dir: "up" | "down"; onClick: () => void; large?: boolean }) {
  const Icon = dir === "up" ? Plus : Minus;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "up" ? "Increase quantity" : "Decrease quantity"}
      className={`shrink-0 flex items-center justify-center border border-input bg-white text-ink cursor-pointer hover:bg-line-soft ${
        large ? "w-14 h-14 rounded-[14px]" : "w-11 h-11 rounded-[10px]"
      }`}
    >
      <Icon className={large ? "w-6 h-6" : "w-5 h-5"} />
    </button>
  );
}
