// Coloured initial used as a product thumbnail
export default function ProductTile({ initial, tint, className = "w-10 h-10 rounded-[10px]" }: { initial: string; tint: string; className?: string }) {
  return (
    <div
      className={`shrink-0 flex items-center justify-center font-display font-bold text-ink ${className}`}
      style={{ background: tint }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
