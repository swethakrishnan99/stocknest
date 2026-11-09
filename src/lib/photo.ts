/** Shrinks a photo to a small square-ish JPEG data URL (about 10–25 KB) so it fits in saved data. */
export function shrinkPhoto(file: File, size = 192): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = size / Math.max(img.width, img.height);
      const w = Math.max(1, Math.round(img.width * Math.min(1, scale)));
      const h = Math.max(1, Math.round(img.height * Math.min(1, scale)));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a photo we can read."));
    };
    img.src = url;
  });
}
