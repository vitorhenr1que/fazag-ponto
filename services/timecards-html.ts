// services/timecards-html.ts
import type { TimecardsReport } from './reports.service';

function escapeHtml(input: any) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatBR(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}/${y}`;
}

function safe(v: any) {
  const s = String(v ?? '').trim();
  return s.length ? s : '-';
}

export function renderTimecardsHtml(report: TimecardsReport) {
  const companyName = process.env.COMPANY_NAME || 'FAZAG';
  const companyCnpj = process.env.COMPANY_CNPJ || '-';
  const companyIe = process.env.COMPANY_IE || '-';

  // ⚠️ caminho ABSOLUTO servido pelo Express
  const logoUrl =
    process.env.COMPANY_LOGO_URL ||
    'http://localhost:3333/public/images/logo-fazag-azul.png';

  const issuedAt = new Date();
  const issuedLabel = issuedAt.toLocaleString('pt-BR');

  const rangeLabel = `DE ${formatBR(report.range.start)} ATÉ ${formatBR(report.range.end)}`;

  const rows = report.days
    .map(d => {
      const obs = d.observation ? escapeHtml(d.observation) : '';
      const statusClass =
        d.status === 'JUSTIFICADO'
          ? 'st-just'
          : d.status === 'INCOMPLETO'
          ? 'st-inc'
          : 'st-ok';

      return `
        <tr>
          <td class="c-date">${formatBR(d.date)}</td>
          <td class="c-time">${escapeHtml(safe(d.punches.ENTRY))}</td>
          <td class="c-time">${escapeHtml(safe(d.punches.BREAK_START))}</td>
          <td class="c-time">${escapeHtml(safe(d.punches.BREAK_END))}</td>
          <td class="c-time">${escapeHtml(safe(d.punches.EXIT))}</td>
          <td class="c-work">${escapeHtml(safe(d.workedLabel))}</td>
          <td class="c-status ${statusClass}">${escapeHtml(safe(d.status))}</td>
          <td class="c-obs">${obs}</td>
        </tr>
      `;
    })
    .join('');

  // ✅ Linha TOTAL na última linha da tabela
  const totalRow = `
    <tr class="total-row">
      <td class="c-date"><strong>Total</strong></td>
      <td class="c-time" colspan="4"></td>
      <td class="c-work"><strong>${escapeHtml(safe(report.totals.workedLabel))}</strong></td>
      <td class="c-status" colspan="2"></td>
    </tr>
  `;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de Ponto</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }

  :root {
    --text: #111;
    --muted: #666;
    --line: #d0d0d0;
    --line2: #e6e6e6;
  }

  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: var(--text);
  }

  .header {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .logo img {
    max-width: 120px;
    height: auto;
  }

  .company {
    text-align: center;
    border-left: 1px solid black;
    
  }

  .company-name {
    font-weight: 700;
    font-size: 14px;
    text-align: start;
    margin-left: 10px;
  }

  .company-meta {
    font-size: 10px;
    color: var(--muted);
    margin-top: 2px;
    text-align: start;
    margin-left: 10px;
  }

  .title {
    margin-top: 6px;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: .4px;
    text-align: start;
    margin-left: 10px;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
    margin: 6px 0 8px 0;
  }

  .card {
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 10px;
  }

  .grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 6px 14px;
  }

  .field { display: flex; gap: 6px; }
  .label { color: var(--muted); min-width: 84px; }
  .value { font-weight: 600; }

  table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--line);
  }

  thead th {
    background: #f3f3f3;
    border-bottom: 1px solid var(--line);
    padding: 6px;
    font-size: 10px;
  }

  tbody td {
    border-top: 1px solid var(--line2);
    padding: 6px;
  }

  .c-date, .c-time, .c-work, .c-status {
    text-align: center;
  }

  .c-work, .c-status { font-weight: 700; }

  .st-ok { color: #0b6; }
  .st-inc { color: #c60; }
  .st-just { color: #06c; }

  /* ✅ Destaque da linha TOTAL */
  .total-row td {
    border-top: 1px solid #000;
    font-weight: 700;
    background: #f2f2f2;
  }

  .ack {
    margin-top: 14px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 6px;
    font-size: 10px;
    text-align: justify;
  }

  .signatures {
    margin-top: 34px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  .sig {
    text-align: center;
  }

  .sig-line {
    border-top: 1px solid #000;
    margin: 24px 0 6px 0;
  }

  .sig-label {
    font-weight: 700;
    font-size: 10px;
  }

  .sig-name {
    font-size: 10px;
    color: var(--muted);
  }

  tr { page-break-inside: avoid; }
</style>
</head>
<body>

  <div class="header">
    <div class="logo">
      <img src="${escapeHtml(logoUrl)}" alt="Logo FAZAG" />
    </div>
    <div class="company">
      <div class="company-name">${escapeHtml(companyName)}</div>
      <div class="company-meta">CNPJ: ${escapeHtml(companyCnpj)} &nbsp; IE: ${escapeHtml(companyIe)}</div>
      <div class="title">CARTÃO DE PONTO</div>
    </div>
  </div>

  <div class="meta-row">
    <div>Emitido em: ${escapeHtml(issuedLabel)}</div>
    <div>${escapeHtml(rangeLabel)}</div>
  </div>

  <div class="card">
    <div class="grid">
      <div class="field"><div class="label">Funcionário:</div><div class="value">${escapeHtml(safe(report.user.nome))}</div></div>
      <div class="field"><div class="label">CPF:</div><div class="value">${escapeHtml(safe(report.user.cpf))}</div></div>

      <div class="field"><div class="label">Função:</div><div class="value">${escapeHtml(safe(report.user.funcao))}</div></div>
      <div class="field"><div class="label">Depto:</div><div class="value">${escapeHtml(safe(report.user.departamento))}</div></div>

      <div class="field"><div class="label">Admissão:</div><div class="value">${escapeHtml(safe(report.user.admissao))}</div></div>
      <div class="field"><div class="label">PIS/PASEP:</div><div class="value">${escapeHtml(safe(report.user.pisPasep))}</div></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Entrada</th>
        <th>Início Int.</th>
        <th>Fim Int.</th>
        <th>Saída</th>
        <th>Horas</th>
        <th>Status</th>
        <th>Obs</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${totalRow}
    </tbody>
  </table>

  <div class="ack">
    Reconheço a exatidão das horas constantes de acordo com minha frequência neste intervalo
    <strong>${escapeHtml(formatBR(report.range.start))}</strong> a
    <strong>${escapeHtml(formatBR(report.range.end))}</strong>.
    Nos termos da Portaria MTB No. 362 de 13/11/91 artigo 13, o presente Cartão Ponto substitui o
    quadro de horário de Trabalho. Inclusive Ficha de Horário de Trabalho Externo.
  </div>

  <div class="signatures">
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">${escapeHtml(safe(report.user.nome))}</div>
      <div class="sig-name">Funcionário</div>
    </div>

    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">Wesley Aguiar</div>
      <div class="sig-name">RH</div>
    </div>
  </div>

</body>
</html>`;
}
