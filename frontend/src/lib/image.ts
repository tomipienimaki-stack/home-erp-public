const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;

/** Pienentää mitat niin, että pisin sivu on enintään `max`; kuvasuhde säilyy, pientä ei suurenneta. */
export function targetSize(w: number, h: number, max = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= max) return { width: w, height: h };
  const scale = max / longest;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/** Pienentää kuvan canvasilla ja palauttaa JPEG:n base64-merkkijonona (ilman data:-etuliitettä). */
export async function downscaleToJpegBase64(
  file: File,
  max = MAX_SIDE,
  quality = JPEG_QUALITY,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = targetSize(bitmap.width, bitmap.height, max);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Kuvan käsittely ei onnistu tällä selaimella');
    // JPEG ei tue läpinäkyvyyttä: täytä tausta valkoisella.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return dataUrl.slice(dataUrl.indexOf(',') + 1);
  } finally {
    bitmap.close();
  }
}
