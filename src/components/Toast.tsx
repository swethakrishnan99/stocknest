import { useEffect } from "react";
import { Check, X } from "lucide-react";

/** Short confirmation at the bottom of the screen, with an optional action such as Undo. Hides itself after 6 seconds. */
export interface ToastProps {
  message: string;
  action?: string; // button label, e.g. Undo
  onAction?: () => void;
  onClose: () => void;
}

export default function Toast({ message, action, onAction, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  return (
    <div
      role="status"
      className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 w-[min(560px,calc(100%-32px))] flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl bg-navy text-white shadow-xl"
    >
      <Check className="w-[18px] h-[18px] shrink-0 text-[#B9F0CF]" strokeWidth={2.4} aria-hidden="true" />
      <span className="flex-1 text-sm font-semibold py-2">{message}</span>
      {action && (
        <button type="button" onClick={onAction} className="min-h-11 px-3 rounded-lg text-sm font-bold text-coral hover:bg-navy-700 cursor-pointer">
          {action}
        </button>
      )}
      <button type="button" onClick={onClose} aria-label="Dismiss" className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center hover:bg-navy-700 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
