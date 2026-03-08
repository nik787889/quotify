import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Quotation } from '../types';

// ─── PDF – HTML Template (matches Excel reference image) ─────────────────────

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const generateQuotationHTML = (q: Quotation): string => {
  const headerBg = '#1F497D';
  const altBg = '#DCE6F1';
  const borderColor = '#4472C4';
  const orangeQty = '#FF6600';

  let productRows = '';
  q.products.forEach((product) => {
    const pType = product.pricingType || 'sqft';

    product.rows.forEach((row, rowIdx) => {
      const isFirst = rowIdx === 0;
      const isLast = rowIdx === product.rows.length - 1;

      let w = row.width || '';
      let l = row.length || '';
      let qStr = row.qty || '';
      let s = row.sqft > 0 ? fmt(row.sqft) : '';
      let rate = product.ratePerSqft || '0';
      let totalQtyOrSqft = fmt(product.totalSqft);

      if (pType === 'fixed') {
        w = ''; l = ''; qStr = ''; s = product.totalSqft > 0 ? fmt(product.totalSqft) : '';
        rate = (Number(product.fixedTotalSqft) > 0 && Number(product.fixedRatePerSqft) > 0) ? product.fixedRatePerSqft || '' : '';
        totalQtyOrSqft = '';
      } else if (pType === 'item') {
        w = ''; l = ''; qStr = product.quantity || '1'; s = ''; totalQtyOrSqft = qStr;
      }

      productRows += `
        <tr>
          ${isFirst
          ? `<td class="cell center" rowspan="${product.rows.length}">${product.srNo}</td>
               <td class="cell center" rowspan="${product.rows.length}">${product.name}</td>
               <td class="cell" rowspan="${product.rows.length}">${product.description}</td>`
          : ''}
          <td class="cell center">${w}</td>
          <td class="cell center">${l}</td>
          <td class="cell center" style="color:#333; font-weight:600">${qStr}</td>
          <td class="cell center">${s}</td>
          ${isFirst
          ? `<td class="cell center total-cell" rowspan="${product.rows.length}">${totalQtyOrSqft}</td>
               <td class="cell center total-cell" rowspan="${product.rows.length}">${rate}</td>
               <td class="cell center total-cell" rowspan="${product.rows.length}"><strong>&#8377;${fmt(product.totalAmount)}</strong></td>`
          : ''}
        </tr>`;
    });
    productRows += `<tr style="height:8px"><td colspan="10" style="border:none;background:#f0f4f8"></td></tr>`;
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #222; padding: 16px; }
  .company { text-align:center; font-size:18px; font-weight:bold; color:${headerBg}; letter-spacing:1px; margin-bottom:4px; }
  .subtitle { text-align:center; font-size:11px; color:#555; margin-bottom:2px; }
  .divider { border-top: 2px solid ${borderColor}; margin: 8px 0; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th { background:${headerBg}; color:#fff; padding:6px 4px; text-align:center; font-size:9px; border:1px solid ${borderColor}; }
  .cell { border:1px solid ${borderColor}; padding:4px; vertical-align:middle; }
  .center { text-align:center; }
  .total-cell { background:${altBg}; font-weight:600; }
  .grand-total { text-align:right; margin-top:12px; font-size:13px; font-weight:bold; color:${headerBg}; }
  .footer { margin-top:24px; display:flex; justify-content:space-between; font-size:10px; color:#555; }
  .sig-line { border-top:1px solid #333; width:160px; text-align:center; padding-top:4px; margin-top:40px; }
</style>
</head>
<body>
  <div class="company">${q.companyName || 'Ganesh Interiors'}</div>
  <div class="subtitle">Quotation For: <strong>${q.quotationFor}</strong></div>
  <div class="subtitle">Address: ${q.address}</div>
  <div class="subtitle">Date: ${new Date(q.date).toLocaleDateString('en-IN')}</div>
  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="width:5%">Sr No</th>
        <th style="width:12%">Product</th>
        <th style="width:15%">Description</th>
        <th style="width:9%">Width (Ft)</th>
        <th style="width:9%">Length (Ft)</th>
        <th style="width:6%">Qty</th>
        <th style="width:10%">Total Sq.ft</th>
        <th style="width:10%">Total SQFT / QTY</th>
        <th style="width:12%">Rate per Sq.ft (&#8377;)/QTY</th>
        <th style="width:12%">Amount (&#8377;)</th>
      </tr>
    </thead>
    <tbody>
      ${productRows}
    </tbody>
  </table>

  <div class="grand-total">Grand Total: &#8377;${fmt(q.grandTotal)}</div>

  <div class="footer">
    <div class="sig-line">Prepared By</div>
    <div class="sig-line">Authorised Signatory</div>
  </div>
</body>
</html>`;
};

// ─── Export Functions ─────────────────────────────────────────────────────────

export const exportToPDF = async (quotation: Quotation): Promise<void> => {
  const html = generateQuotationHTML(quotation);
  // expo-print generates a temp PDF file
  const { uri: tempUri } = await Print.printToFileAsync({ html, base64: false });

  const fileName = `Quotation_${quotation.quotationFor.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const destFile = new File(Paths.document, fileName);

  const tempFile = new File(tempUri);
  tempFile.move(destFile);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destFile.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Quotation PDF',
    });
  }
};

export const exportToExcel = async (quotation: Quotation): Promise<void> => {
  // Build CSV rows matching the Excel layout
  const rows: string[][] = [
    [quotation.companyName || 'Ganesh Interiors'],
    [`Quotation For: ${quotation.quotationFor}`],
    [`Address: ${quotation.address}`],
    [`Date: ${new Date(quotation.date).toLocaleDateString('en-IN')}`],
    [],
    [
      'Sr No', 'Product', 'Description',
      'Width (Ft)', 'Length (Ft)', 'Qty',
      'Total Sq.ft', 'Total SQFT/QTY', 'Rate per Sq.ft (Rs)/QTY', 'Amount (Rs)',
    ],
  ];

  quotation.products.forEach((product) => {
    const pType = product.pricingType || 'sqft';

    product.rows.forEach((row, idx) => {
      const isLast = idx === product.rows.length - 1;

      let w = row.width || '';
      let l = row.length || '';
      let qStr = row.qty || '';
      let s = row.sqft > 0 ? String(row.sqft) : '';
      let rate = product.ratePerSqft || '0';
      let totalQtyOrSqft = String(product.totalSqft);

      if (pType === 'fixed') {
        w = ''; l = ''; qStr = ''; s = product.totalSqft > 0 ? String(product.totalSqft) : '';
        rate = (Number(product.fixedTotalSqft) > 0 && Number(product.fixedRatePerSqft) > 0) ? product.fixedRatePerSqft || '' : '';
        totalQtyOrSqft = '';
      } else if (pType === 'item') {
        w = ''; l = ''; qStr = product.quantity || '1'; s = ''; totalQtyOrSqft = qStr;
      }

      rows.push([
        idx === 0 ? String(product.srNo) : '',
        idx === 0 ? product.name : '',
        idx === 0 ? product.description : '',
        w,
        l,
        qStr,
        s,
        isLast ? totalQtyOrSqft : '',
        isLast ? rate : '',
        isLast ? String(product.totalAmount) : '',
      ]);
    });
    rows.push([]); // blank separator row
  });

  rows.push(['', '', '', '', '', '', '', '', 'Grand Total:', String(quotation.grandTotal)]);

  // Escape and join as CSV
  const csvContent = rows
    .map((r) => r.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const fileName = `Quotation_${quotation.quotationFor.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  const destFile = new File(Paths.document, fileName);

  destFile.write(csvContent);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destFile.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Share Quotation as Excel/CSV',
    });
  }
};
