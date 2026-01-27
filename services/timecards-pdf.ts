// services/timecards-pdf.ts
import PDFDocument from 'pdfkit';
import type { TimecardsReport } from './reports.service';


function formatDateBR(isoYYYYMMDD: string) {
  // "2026-01-26" -> "26/01/2026"
  const [y, m, d] = isoYYYYMMDD.split('-');
  return `${d}/${m}/${y}`;
}

function nowBRLabel() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`;
}

function safe(v: any) {
  const s = String(v ?? '').trim();
  return s.length ? s : '-';
}

export function renderTimecardsPdf(report: TimecardsReport) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
  });

  // --- helpers de layout ---
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

  const companyName = process.env.COMPANY_NAME || 'FAZAG';
  const companyCnpj = process.env.COMPANY_CNPJ || '-';
  const companyIe = process.env.COMPANY_IE || '-';

  // Cabeçalho
  doc.fontSize(14).text(companyName, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(9).text(`CNPJ: ${companyCnpj}   IE: ${companyIe}`, { align: 'center' });

  doc.moveDown(0.7);
  doc.fontSize(12).text('CARTÃO DE PONTO', { align: 'center' });
  doc.moveDown(0.6);

  // Linha emitido + intervalo
  const rangeLabel =
    report.range?.start && report.range?.end
      ? `DE ${formatDateBR(report.range.start)} ATÉ ${formatDateBR(report.range.end)}`
      : '';

  doc.fontSize(9);
  doc.text(`Emitido em ${nowBRLabel()}`, { align: 'left' });
  if (rangeLabel) doc.text(rangeLabel, { align: 'right' });
  doc.moveDown(0.6);

  // Dados do funcionário (campos opcionais)
  doc.fontSize(10);
  doc.text(`Funcionário: ${safe(report.user.nome)}`);
  doc.text(`CPF: ${safe(report.user.cpf)}   PIS/PASEP: ${safe(report.user.pisPasep)}`);
  doc.text(`Função: ${safe(report.user.funcao)}   Departamento: ${safe(report.user.departamento)}`);
  doc.text(`Admissão: ${safe(report.user.admissao)}`);
  doc.moveDown(0.8);

  // Tabela
  const col = {
    data: 70,
    entry: 70,
    bs: 90,
    be: 80,
    exit: 60,
    worked: 85,
    status: 70,
    obs: contentWidth - (70 + 70 + 90 + 80 + 60 + 85 + 70),
  };

  const startX = doc.page.margins.left;
  let y = doc.y;

  function drawRow(values: string[], isHeader = false) {
    const rowHeight = 18;
    const paddingX = 4;

    // borda
    doc.rect(startX, y, contentWidth, rowHeight).stroke();

    // divisões
    let x = startX;
    const widths = [col.data, col.entry, col.bs, col.be, col.exit, col.worked, col.status, col.obs];

    for (let i = 0; i < widths.length - 1; i++) {
      x += widths[i];
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
    }

    // texto
    doc.fontSize(8).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');

    x = startX;
    const aligns: Array<'left' | 'center'> = ['center','center','center','center','center','center','center','left'];

    for (let i = 0; i < widths.length; i++) {
      doc.text(values[i] ?? '', x + paddingX, y + 5, {
        width: widths[i] - paddingX * 2,
        align: aligns[i],
        ellipsis: true,
      });
      x += widths[i];
    }

    y += rowHeight;

    // quebra de página
    const bottomLimit = doc.page.height - doc.page.margins.bottom - 120;
    if (y > bottomLimit) {
      doc.addPage();
      y = doc.page.margins.top;
      // redesenha header da tabela na nova página
      drawRow(['Data','Entrada','Início Int.','Fim Int.','Saída','Horas','Status','Obs'], true);
    }
  }

  // header da tabela
  drawRow(['Data','Entrada','Início Int.','Fim Int.','Saída','Horas','Status','Obs'], true);

  // linhas
  for (const d of report.days) {
    drawRow([
      formatDateBR(d.date),
      safe(d.punches?.ENTRY),
      safe(d.punches?.BREAK_START),
      safe(d.punches?.BREAK_END),
      safe(d.punches?.EXIT),
      safe(d.workedLabel),
      safe(d.status),
      safe(d.observation),
    ]);
  }

  doc.moveDown(1.2);
  doc.y = y + 10;

  // Totais
  doc.fontSize(10).font('Helvetica-Bold').text(`TOTAL HORAS: ${safe(report.totals.workedLabel)}`);
  doc.fontSize(9).font('Helvetica').text(`INCOMPLETOS: ${report.totals.incompleteDays}`);
  doc.text(`JUSTIFICADOS: ${report.totals.justifiedDays}`);

  doc.moveDown(1.2);

  // Rodapé (texto fixo)
  doc.fontSize(8).text(
    'Declaro que as informações aqui apresentadas correspondem fielmente aos registros de ponto do período.',
    { align: 'center' }
  );
  doc.moveDown(2);

  doc.fontSize(9).text('_________________________________________', { align: 'center' });
  doc.text('Assinatura / RH', { align: 'center' });

  doc.end();
  return doc;
}
