import { planPageBreaks } from '../utils/reports/pdfPages';

// PDF descargable de una hoja de reporte (sin el diálogo de impresión). Se
// captura la hoja a su tamaño real aunque en el celular esté reducida, se parte
// en páginas A4 sin cortar filas y cada página lleva el pie del reporte.

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_X_MM = 7;
const MARGIN_TOP_MM = 6;
const MARGIN_BOTTOM_MM = 12;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - 2 * MARGIN_X_MM;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;

// Lo que no debe partirse entre dos páginas.
const BLOCK_SELECTOR = 'tr, .report-keep, .report-notes, .agenda-notes, h2';

export async function exportSheetToPdf(sheet: HTMLElement, fileName: string): Promise<void> {
  // Se cargan solo al exportar: no pesan en el resto de la app.
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);

  const footerTitle = sheet.querySelector('[data-pdf-footer]')?.textContent?.trim() ?? 'KristellDent';
  let boundaries: number[] = [];
  let cloneHeight = 0;

  const canvas = await html2canvas(sheet, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    windowWidth: 1280,
    onclone: (_document, clone) => {
      // Tamaño real y solo el contenido (los márgenes los pone el PDF).
      clone.style.zoom = '1';
      clone.style.width = `${CONTENT_WIDTH_MM}mm`;
      clone.style.minHeight = '0';
      clone.style.padding = '0';
      clone.style.border = '0';
      clone.style.boxShadow = 'none';
      clone.querySelectorAll<HTMLElement>('.report-screen-footer, .agenda-screen-footer').forEach((element) => {
        element.style.display = 'none';
      });
      const top = clone.getBoundingClientRect().top;
      cloneHeight = clone.getBoundingClientRect().height;
      boundaries = [...clone.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)].flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return [rect.top - top, rect.bottom - top];
      });
    },
  });

  const pxPerCss = cloneHeight > 0 ? canvas.height / cloneHeight : 1;
  const pxPerMm = canvas.width / CONTENT_WIDTH_MM;
  const slices = planPageBreaks(
    boundaries.map((value) => Math.round(value * pxPerCss)),
    canvas.height,
    Math.floor(CONTENT_HEIGHT_MM * pxPerMm),
  );

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  slices.forEach((slice, index) => {
    if (index > 0) pdf.addPage();
    const page = document.createElement('canvas');
    page.width = canvas.width;
    page.height = slice.end - slice.start;
    const context = page.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, page.width, page.height);
    context.drawImage(canvas, 0, slice.start, canvas.width, page.height, 0, 0, canvas.width, page.height);
    pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN_X_MM, MARGIN_TOP_MM, CONTENT_WIDTH_MM, page.height / pxPerMm);

    const footerY = PAGE_HEIGHT_MM - 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(107, 120, 128);
    pdf.text(footerTitle, MARGIN_X_MM, footerY);
    pdf.text('Confidencial — uso interno', PAGE_WIDTH_MM / 2, footerY, { align: 'center' });
    pdf.setTextColor(23, 36, 44);
    pdf.text(`Página ${index + 1} de ${slices.length}`, PAGE_WIDTH_MM - MARGIN_X_MM, footerY, { align: 'right' });
  });

  pdf.save(fileName);
}
