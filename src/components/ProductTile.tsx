interface ProductTileProps {
  initial: string;
  tint: string;
  photo?: string;
  className?: string;
}

// Product thumbnail: the photo when there is one, otherwise a coloured initial
export default function ProductTile({ initial, tint, photo, className = "w-10 h-10 rounded-[10px]" }: ProductTileProps) {
  if (photo) return <img src={photo} alt="" className={`shrink-0 object-cover bg-line-soft ${className}`} />;
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
