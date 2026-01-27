// services/timecards-pdf.playwright.ts
import { chromium } from 'playwright';
import type { TimecardsReport } from './reports.service';
import { renderTimecardsHtml } from './timecards-html';

export async function generateTimecardsPdfBuffer(report: TimecardsReport) {
  const html = renderTimecardsHtml(report);

  // Se seu servidor for muito chamado, dá pra otimizar com browser singleton.
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Carrega o HTML
  await page.setContent(html, { waitUntil: 'load' });

  // Gera o PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
  });

  await page.close();
  await browser.close();

  return pdfBuffer;
}
