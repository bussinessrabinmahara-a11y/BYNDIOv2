// PDF Invoice Generator using browser-native jsPDF (loaded from CDN in index.html)
// ⚠️ Replace GSTIN with your real number once registered.

declare const window: any;

function esc(s: string): string {
  return (s || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#039;'}[c] || c));
}

export interface PDFInvoiceData {
  orderId: string;
  orderDate: string;
  paymentMethod: string;
  paymentStatus: string;
  buyerName: string;
  buyerEmail: string;
  buyerAddress: string;
  sellerName: string;
  sellerGST: string;
  items: { name: string; qty: number; price: number; gstRate: number; hsn: string }[];
  shippingFee: number;
  platformFee: number;
  codFee?: number;
  totalAmount: number;
}

export function generatePDFInvoice(data: PDFInvoiceData): void {
  // Build a full-page printable HTML, then open it so the user can Ctrl+P → Save as PDF
  // This works 100% in all browsers with zero dependencies
  const invoiceNo = `INV-${data.orderId.slice(0, 8).toUpperCase()}`;
  const date = new Date(data.orderDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const subtotalExGST = data.items.reduce((s, i) => s + (i.price / (1 + i.gstRate / 100)) * i.qty, 0);
  const totalGST = data.items.reduce((s, i) => s + (i.price - i.price / (1 + i.gstRate / 100)) * i.qty, 0);
  const cgst = totalGST / 2;
  const sgst = totalGST / 2;

  const itemRows = data.items.map((item, idx) => {
    const exGST = item.price / (1 + item.gstRate / 100);
    const lineTotal = item.price * item.qty;
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(item.name)}</td>
        <td style="text-align:center">${esc(item.hsn) || '—'}</td>
        <td style="text-align:center">${item.qty}</td>
        <td style="text-align:right">₹${exGST.toFixed(2)}</td>
        <td style="text-align:center">${item.gstRate}%</td>
        <td style="text-align:right">₹${lineTotal.toFixed(2)}</td>
      </tr>`;
  }).join('');

  const isPaid = data.paymentStatus === 'paid';
  const statusColor = isPaid ? '#2E7D32' : '#E65100';
  const statusBg = isPaid ? '#E8F5E9' : '#FFF3E0';
  const statusLabel = data.paymentStatus.toUpperCase();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${invoiceNo} — BYNDIO</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px;max-width:820px;margin:auto;background:#fff}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #0D47A1;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:10px}
    .brand-logo{background:#0D47A1;color:#fff;font-size:20px;font-weight:900;padding:8px 14px;border-radius:8px;letter-spacing:-0.5px}
    .brand-info{font-size:11px;color:#666;margin-top:4px;line-height:1.6}
    .invoice-meta{text-align:right}
    .invoice-meta h2{font-size:22px;font-weight:900;color:#0D47A1;letter-spacing:1px}
    .invoice-meta .inv-no{font-size:14px;color:#555;margin-top:4px;font-weight:600}
    .invoice-meta .date{font-size:12px;color:#888;margin-top:2px}
    .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;margin-top:8px;background:${statusBg};color:${statusColor};border:1px solid ${statusColor}40}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
    .party{background:#F8FAFF;border:1px solid #E3F2FD;border-radius:10px;padding:14px}
    .party-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0D47A1;margin-bottom:8px}
    .party-name{font-size:14px;font-weight:700;margin-bottom:4px}
    .party-detail{font-size:12px;color:#555;line-height:1.7}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px}
    thead tr{background:#0D47A1;color:#fff}
    th{padding:10px 8px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
    td{padding:9px 8px;border-bottom:1px solid #EEF2FF}
    tbody tr:hover{background:#F8FAFF}
    .totals-wrap{display:flex;justify-content:flex-end;margin-bottom:24px}
    .totals{width:300px;border:1px solid #E3F2FD;border-radius:10px;overflow:hidden}
    .totals-row{display:flex;justify-content:space-between;padding:9px 14px;font-size:12px;border-bottom:1px solid #EEF2FF}
    .totals-row:last-child{border:none;background:#0D47A1;color:#fff;font-size:15px;font-weight:900;padding:12px 14px}
    .totals-label{color:inherit}
    .totals-value{font-weight:600}
    .notice{background:#FFFDE7;border:1px solid #FDD835;border-radius:8px;padding:12px 14px;font-size:11px;color:#5D4037;margin-bottom:20px;line-height:1.6}
    .footer{border-top:1px solid #eee;padding-top:16px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#aaa}
    .footer-brand{font-weight:700;color:#0D47A1;font-size:12px}
    @media print{
      body{padding:16px;font-size:12px}
      .notice{display:none}
      @page{margin:12mm;size:A4}
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-logo">BYNDIO</div>
      <div class="brand-info">
        India's 0% Commission Marketplace<br>
        GSTIN: [PENDING REGISTRATION]<br>
        support@byndio.in | byndio.in
      </div>
    </div>
    <div class="invoice-meta">
      <h2>TAX INVOICE</h2>
      <div class="inv-no">${invoiceNo}</div>
      <div class="date">Date: ${date}</div>
      <div class="status-badge">${statusLabel}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Bill To (Buyer)</div>
      <div class="party-name">${esc(data.buyerName)}</div>
      <div class="party-detail">
        ${esc(data.buyerEmail)}<br>
        ${esc(data.buyerAddress)}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Sold By</div>
      <div class="party-name">${esc(data.sellerName)}</div>
      <div class="party-detail">
        GSTIN: ${esc(data.sellerGST) || 'N/A'}<br>
        Payment: ${esc(data.paymentMethod)}<br>
        Order ID: #${data.orderId.slice(0, 8).toUpperCase()}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th style="width:38%">Description</th>
        <th style="text-align:center">HSN</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Rate (excl. GST)</th>
        <th style="text-align:center">GST%</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-row">
        <span class="totals-label">Sub-total (excl. GST)</span>
        <span class="totals-value">₹${subtotalExGST.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">CGST (9%)</span>
        <span class="totals-value">₹${cgst.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">SGST (9%)</span>
        <span class="totals-value">₹${sgst.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">Shipping</span>
        <span class="totals-value">${data.shippingFee > 0 ? '₹' + data.shippingFee.toFixed(2) : 'FREE'}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">Platform Fee</span>
        <span class="totals-value">₹${data.platformFee.toFixed(2)}</span>
      </div>
      ${data.codFee && data.codFee > 0 ? `<div class="totals-row"><span class="totals-label">COD Fee</span><span class="totals-value">₹${data.codFee.toFixed(2)}</span></div>` : ''}
      <div class="totals-row">
        <span class="totals-label">TOTAL PAID</span>
        <span class="totals-value">₹${data.totalAmount.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="notice">
    ⚠️ <strong>Note:</strong> BYNDIO is currently in the process of GST registration. This is a proforma tax invoice.
    A formal GST invoice with GSTIN will be issued upon registration. For queries: support@byndio.in
  </div>

  <div class="footer">
    <div>
      <div class="footer-brand">BYNDIO Technologies Pvt Ltd</div>
      <div>Mumbai, Maharashtra, India | 1800-BYNDIO (Toll Free)</div>
      <div>This is a computer-generated invoice — no signature required.</div>
    </div>
    <div style="text-align:right">
      <div style="font-weight:600;color:#333">Thank you for shopping! 🛍️</div>
      <div>returns@byndio.in for refunds</div>
    </div>
  </div>

  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // Popup blocked fallback — direct download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNo}-BYNDIO.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
