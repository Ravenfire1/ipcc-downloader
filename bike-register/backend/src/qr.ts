import qrcode from "qrcode-generator";

/** Renders a URL as a print-ready SVG QR code (scalable, no raster artifacts on a sticker). */
export function qrCodeSvg(data: string, opts: { margin?: number } = {}): string {
  const qr = qrcode(0, "M");
  qr.addData(data);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const margin = opts.margin ?? 4;
  const size = moduleCount + margin * 2;

  let path = "";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        path += `M${col + margin},${row + margin}h1v1h-1z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/>` +
    `</svg>`;
}
