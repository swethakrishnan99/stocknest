// On/off switch with its label and an optional hint underneath
interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 border-t border-line-soft first:border-t-0 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer ${checked ? "bg-navy-700" : "bg-input"}`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </label>
  );
}
