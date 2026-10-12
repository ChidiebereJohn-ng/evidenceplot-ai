export function serializeSvgElement(svgEl: SVGSVGElement | null): string {
  if (!svgEl) return '';
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgEl);
  if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
    source = source.replace(
      '<svg',
      '<svg xmlns="http://www.w3.org/2000/svg"'
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${source}`;
}

export function triggerTextDownload(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvgFile(
  svgEl: SVGSVGElement | null,
  baseName: string
): void {
  const xml = serializeSvgElement(svgEl);
  if (!xml) return;
  triggerTextDownload(
    `${baseName}-figure.svg`,
    xml,
    'image/svg+xml;charset=utf-8'
  );
}

export async function downloadPng2xFile(
  svgEl: SVGSVGElement | null,
  baseName: string
): Promise<void> {
  if (!svgEl) return;
  const xml = serializeSvgElement(svgEl);
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = 760 * 2;
      const height = 460 * 2;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error('Failed to encode PNG blob'));
          return;
        }
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `${baseName}-figure-2x.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
        resolve();
      }, 'image/png');
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}
