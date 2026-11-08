const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-800 border border-transparent",
  outline: "bg-white text-ink border border-ink hover:bg-line-soft",
  secondary: "bg-white text-ink border border-input hover:bg-line-soft",
};

// 44px tall to keep touch targets comfortable
export default function Button({ variant = "secondary", className = "", children, ...props }) {
  return (
    <button
      type="button"
      className={`h-11 px-4 rounded-[10px] text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
