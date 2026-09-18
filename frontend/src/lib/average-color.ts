'use client';

/**
 * The average colour of an image, sampled through a small offscreen canvas.
 * Resolves null for anything a canvas can't read back: a load failure, or a
 * cross-origin image served without permissive CORS headers — that taints
 * the canvas, and getImageData throws rather than returning pixels. Callers
 * are expected to fall back to a fixed colour in that case.
 */
export function averageColor(url: string): Promise<[number, number, number] | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Downsampled well past the point where individual pixels matter —
        // this only ever needs one colour out.
        const size = 8;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        const pixels = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        resolve([Math.round(r / pixels), Math.round(g / pixels), Math.round(b / pixels)]);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
