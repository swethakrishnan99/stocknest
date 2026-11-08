import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Accessible dialog: Esc or clicking outside closes it, focus moves inside. A bottom sheet on phones. */
interface ModalProps {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ title, subtitle, onClose, children, maxWidth = "sm:max-w-lg" }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>("input, select, button:not([data-close])");
    (first ?? panelRef.current)?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-navy/50 flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white w-full ${maxWidth} max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-[14px] shadow-xl focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-line-soft">
          <div>
            <h2 id={titleId} className="font-display text-[22px] font-bold leading-tight">{title}</h2>
            {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 -mr-2 -mt-1.5 shrink-0 rounded-[10px] flex items-center justify-center text-muted hover:text-ink hover:bg-line-soft cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
