// "+24" / "−18" with a true minus sign, and the colour that goes with it
export function signedQty(n) {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

export function qtyTone(n) {
  return n > 0 ? "text-success" : "text-danger";
}
