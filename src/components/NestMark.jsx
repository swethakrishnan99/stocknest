// StockNest logo mark: stacked box over three nest arcs (120x120 viewBox)
export default function NestMark({ className = "w-11 h-11", boxFill = "#0F1E3D", boxStroke = "#FFFFFF" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="StockNest logo">
      <g transform="translate(0 12)" fill={boxFill} stroke={boxStroke} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M38 30 L60 19 L82 30 L60 41 Z" />
        <path d="M38 30 V56 L60 67 V41 Z" />
        <path d="M82 30 V56 L60 67 V41 Z" />
      </g>
      <path d="M12 64 Q60 86 108 64" fill="none" stroke="#F2675A" strokeWidth="8" strokeLinecap="round" />
      <path d="M20 80 Q60 100 100 80" fill="none" stroke="#F79A8F" strokeWidth="8" strokeLinecap="round" />
      <path d="M30 96 Q60 112 90 96" fill="none" stroke="#F2675A" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }) {
  return (
    <span className={`text-[21px] font-bold tracking-[-0.3px] ${className}`}>
      Stock<span className="text-coral">Nest</span>
    </span>
  );
}
