import jsPDF from 'jspdf';

// Dica: import dinâmico ajuda bundle/perf no mobile
async function toCanvas(element: HTMLElement) {
  const html2canvas = (await import('html2canvas')).default;

  // scale 2 = qualidade boa sem pesar demais
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true, // importante se tiver imagens
    logging: false,
  });

  return canvas;
}

export async function generateReceiptPdfBlob(opts: {
  element: HTMLElement;
  fileName?: string;
}) {
  const canvas = await toCanvas(opts.element);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  // A4 em pt: 595.28 x 841.89
  const pdf = new jsPDF('p', 'pt', 'a4');

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // calcula dimensões mantendo proporção
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Se couber em 1 página:
  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  } else {
    // Multi-página: “fatia” o canvas em páginas
    let position = 0;
    let remainingHeight = imgHeight;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    remainingHeight -= pageHeight;

    while (remainingHeight > 0) {
      pdf.addPage();
      position -= pageHeight;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      remainingHeight -= pageHeight;
    }
  }

  const blob = pdf.output('blob');
  return blob as Blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function shareBlobAsPdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/pdf' });

  const canShareFiles =
    !!navigator.share &&
    // @ts-ignore
    (!!navigator.canShare?.({ files: [file] }));

  if (canShareFiles) {
    await navigator.share({
      title: 'Comprovante de Ponto',
      text: 'Segue o PDF do comprovante.',
      files: [file],
    });
    return true;
  }

  // fallback: abre o PDF numa aba (iOS/Android o usuário compartilha/salva por lá)
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  // não revogar imediatamente pra não quebrar no iOS
  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return false;
}
