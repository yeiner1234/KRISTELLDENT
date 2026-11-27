// Cortes de página del PDF descargable: la hoja se captura entera y se parte en
// tramos de una página A4, cortando en el borde de una fila o bloque para no
// partirlos. Todo en píxeles de la captura.

export interface PageSlice {
  start: number;
  end: number;
}

// Un corte a menos de esto del inicio de la página dejaría una página casi vacía.
const MIN_PAGE_FILL = 0.25;

export function planPageBreaks(boundaries: number[], totalHeight: number, pageHeight: number): PageSlice[] {
  const sorted = [...new Set(boundaries)].filter((value) => value > 0 && value < totalHeight).sort((a, b) => a - b);
  const slices: PageSlice[] = [];
  let start = 0;

  while (totalHeight - start > pageHeight) {
    const limit = start + pageHeight;
    const fitting = sorted.filter((value) => value > start + pageHeight * MIN_PAGE_FILL && value <= limit);
    // Sin un borde que sirva (bloque más alto que la página), se corta a la altura de la página.
    const end = fitting.length > 0 ? fitting[fitting.length - 1] : limit;
    slices.push({ start, end });
    start = end;
  }

  slices.push({ start, end: totalHeight });
  return slices;
}

// Nombre del archivo a partir del código del documento.
export function pdfFileName(code: string): string {
  const clean = code
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${clean || 'reporte-kristelldent'}.pdf`;
}
