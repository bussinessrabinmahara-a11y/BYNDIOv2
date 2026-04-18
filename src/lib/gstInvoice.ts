// GST Invoice Generator — browser-based PDF via print dialog
// ⚠️ Replace GSTIN below with your real GSTIN once registered.

function esc(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface InvoiceData {
  orderId: string;
  orderDate: string;
  buyerName: string;
  buyerEmail?: string;
  buyerAddress: string;
  buyerPhone?: string;
  sellerName: string;
  sellerGST: string;
  items: { name: string; qty: number; price: number; gstRate: number; hsn: string }[];
  shippingFee: number;
  platformFee: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentId?: string;
}

export async function generateGSTInvoice(data: InvoiceData): Promise<void> {
  const subtotalExGST = data.items.reduce((s, i) => s + (i.price / (1 + i.gstRate / 100)) * i.qty, 0);
  const totalGST      = data.items.reduce((s, i) => s + (i.price - i.price / (1 + i.gstRate / 100)) * i.qty, 0);
  const cgst = totalGST / 2;
  const sgst = totalGST / 2;
  const date = new Date(data.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const invoiceNo = `INV-${data.orderId.slice(0, 8).toUpperCase()}`;

  const itemRows = data.items.map((item, idx) => {
    const exGST = item.price / (1 + item.gstRate / 100);
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(item.name)}</td>
        <td class="center">${esc(item.hsn) || '—'}</td>
        <td class="center">${item.qty}</td>
        <td class="right">₹${exGST.toFixed(2)}</td>
        <td class="center">${item.gstRate}%</td>
        <td class="right">₹${(item.price * item.qty).toFixed(2)}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${invoiceNo} — BYNDIO</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #212121; background: #fff; padding: 24px; max-width: 900px; margin: auto; }
  
  /* Print button — hidden when printing */
  .print-bar { display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 20px; }
  .print-bar button {
    padding: 10px 22px; border: none; border-radius: 6px; font-size: 14px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; gap: 8px;
  }
  .btn-pdf  { background: #0D47A1; color: #fff; }
  .btn-back { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
  
  /* Invoice layout */
  .header { background: #0D47A1; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; opacity: 0.75; margin-top: 3px; }
  .inv-badge { font-size: 20px; font-weight: 700; color: #FFD600; text-align: right; }
  .inv-meta { font-size: 12px; opacity: 0.85; text-align: right; margin-top: 6px; line-height: 1.7; }
  
  .body { border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; padding: 24px; }
  
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 22px; }
  .party { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 14px; }
  .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0D47A1; margin-bottom: 8px; }
  .party-name { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
  .party-detail { font-size: 12px; color: #555; line-height: 1.6; }
  
  /* Status badge */
  .status-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
  .status-badge { font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 20px; }
  .status-paid { background: #E8F5E9; color: #2E7D32; }
  .status-pending { background: #FFF8E1; color: #F57F17; }
  .pay-info { font-size: 12px; color: #757575; }
  
  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  th { background: #0D47A1; color: #fff; padding: 10px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; text-align: left; }
  th.center, td.center { text-align: center; }
  th.right,  td.right  { text-align: right; }
  td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 12px; vertical-align: middle; }
  tr:nth-child(even) td { background: #f9fbff; }
  
  /* Totals */
  .totals-wrap { display: flex; justify-content: flex-end; }
  .totals { width: 320px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
  .totals tr td { padding: 8px 14px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
  .totals tr td:last-child { text-align: right; font-weight: 700; }
  .totals tr:last-child td { background: #0D47A1; color: #fff; font-size: 15px; font-weight: 900; border-bottom: none; }
  .totals tr.free td:last-child { color: #2E7D32; }
  
  /* Footer */
  .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #9e9e9e; text-align: center; line-height: 1.8; }
  .footer strong { color: #555; }
  
  .note { background: #FFF8E1; border: 1px solid #FFE082; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #795548; margin-top: 18px; }
  
  /* PRINT STYLES */
  @media print {
    .print-bar { display: none !important; }
    body { padding: 0; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .totals tr:last-child td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>

<div class="print-bar">
  <button class="btn-back" onclick="window.close()">✕ Close</button>
  <button class="btn-pdf" onclick="window.print()">🖨️ Download PDF / Print</button>
</div>

<div class="header">
  <div>
    <div class="brand">BYNDIO</div>
    <div class="brand-sub">BYNDIO Technologies Pvt Ltd</div>
    <div class="brand-sub" style="margin-top:6px">GSTIN: 27AABCX1234X1Z1 (Sample) | support@byndio.in | 1800-BYNDIO</div>
  </div>
  <div>
    <div class="inv-badge">TAX INVOICE</div>
    <div class="inv-meta">
      <strong>Invoice No:</strong> ${esc(invoiceNo)}<br/>
      <strong>Date:</strong> ${esc(date)}<br/>
      <strong>Order ID:</strong> #${esc(data.orderId.slice(0, 8).toUpperCase())}
    </div>
  </div>
</div>

<div class="body">

  <div class="status-row">
    <div>
      <span class="status-badge ${data.paymentMethod === 'cod' ? 'status-pending' : 'status-paid'}">
        ${data.paymentMethod === 'cod' ? '💵 COD — Pay on Delivery' : '✅ PAID'}
      </span>
    </div>
    <div class="pay-info">
      ${data.paymentId ? `Payment Ref: ${esc(data.paymentId)}` : ''}
      ${data.paymentMethod ? ` &nbsp;|&nbsp; Method: ${esc(data.paymentMethod.toUpperCase())}` : ''}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Bill To (Buyer)</div>
      <div class="party-name">${esc(data.buyerName)}</div>
      <div class="party-detail">
        ${data.buyerEmail ? esc(data.buyerEmail) + '<br/>' : ''}
        ${data.buyerPhone ? esc(data.buyerPhone) + '<br/>' : ''}
        ${esc(data.buyerAddress)}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Sold By (Seller)</div>
      <div class="party-name">${esc(data.sellerName)}</div>
      <div class="party-detail">
        GSTIN: ${esc(data.sellerGST) || 'N/A'}<br/>
        Platform: BYNDIO Marketplace<br/>
        support@byndio.in
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Item Description</th>
        <th class="center">HSN</th>
        <th class="center">Qty</th>
        <th class="right">Rate (excl. GST)</th>
        <th class="center">GST %</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals-wrap">
    <table class="totals">
      <tbody>
        <tr><td>Sub-total (excl. GST)</td><td>₹${subtotalExGST.toFixed(2)}</td></tr>
        <tr><td>CGST (9%)</td><td>₹${cgst.toFixed(2)}</td></tr>
        <tr><td>SGST (9%)</td><td>₹${sgst.toFixed(2)}</td></tr>
        ${data.shippingFee > 0
          ? `<tr><td>Shipping</td><td>₹${data.shippingFee.toFixed(2)}</td></tr>`
          : '<tr class="free"><td>Shipping</td><td>FREE</td></tr>'}
        ${data.platformFee > 0 ? `<tr><td>Platform Fee</td><td>₹${data.platformFee.toFixed(2)}</td></tr>` : ''}
        <tr><td><strong>TOTAL AMOUNT</strong></td><td><strong>₹${data.totalAmount.toFixed(2)}</strong></td></tr>
      </tbody>
    </table>
  </div>

  <div class="note">
    📌 <strong>GST Note:</strong> This is a tax invoice issued under the Central Goods and Services Tax Act, 2017. All taxes are calculated at standard rates based on product category.
  </div>

  <div class="footer">
    This is a computer-generated invoice and does not require a physical signature.<br/>
    <strong>BYNDIO Technologies Pvt Ltd</strong> | Mumbai, Maharashtra, India<br/>
    For disputes: support@byndio.in &nbsp;|&nbsp; Returns: returns@byndio.in &nbsp;|&nbsp; Helpline: 1800-BYNDIO (Toll Free)
  </div>

</div>

<script>
  // Auto-trigger print if opened with ?print=1
  if (new URLSearchParams(window.location.search).get('print') === '1') {
    window.addEventListener('load', () => setTimeout(() => window.print(), 400));
  }
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (!win) {
    // Popup blocked — fallback to download
    const a = document.createElement('a');
    a.href = url;
    a.download = `BYNDIO-Invoice-${invoiceNo}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
