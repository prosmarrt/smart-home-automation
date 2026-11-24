import type { Payment, Quotation } from '@/types/types';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n: number) =>
  `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} EGP`;

const byOrder = (a: Payment, b: Payment) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

/** Receipt (operation) number: project code + sequence of the payment. */
export function getReceiptNumber(quotation: Quotation, payment: Payment, payments: Payment[]): string {
  const sorted = [...payments].sort(byOrder);
  const idx = sorted.findIndex((p) => p.id === payment.id);
  const seq = String((idx >= 0 ? idx : sorted.length) + 1).padStart(3, '0');
  return `RC-${quotation.project_code}-${seq}`;
}

/** Opens a printable cash receipt for one payment (print / save as PDF from the browser). */
export function printPaymentReceipt(quotation: Quotation, payment: Payment, payments: Payment[]) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print the receipt / من فضلك اسمح بالنوافذ المنبثقة');
    return;
  }

  const sorted = [...payments].sort(byOrder);
  const idx = sorted.findIndex((p) => p.id === payment.id);
  const upTo = idx >= 0 ? sorted.slice(0, idx + 1) : sorted;
  const paidSoFar = upTo.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, quotation.total_amount - paidSoFar);
  const receiptNo = getReceiptNumber(quotation, payment, payments);
  const date = new Date(payment.payment_date).toLocaleDateString('en-GB');
  const logo = new URL(`${import.meta.env.BASE_URL}prosmart-logo.png`, window.location.origin).href;

  const row = (ar: string, en: string, val: string, cls = '') =>
    `<tr class="${cls}"><td class="l">${ar}<br><small>${en}</small></td><td class="v">${val}</td></tr>`;

  win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${esc(receiptNo)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Tahoma, Arial, sans-serif; color:#111; max-width:720px; margin:0 auto; padding:16px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .head { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #428bca; padding-bottom:10px; }
  .head img { height:56px; }
  h1 { margin:0; font-size:22px; color:#428bca; text-align:left; }
  h1 small { display:block; font-size:13px; color:#555; font-weight:normal; }
  table { width:100%; border-collapse:collapse; margin-top:18px; }
  td { border:1px solid #ccc; padding:10px 12px; font-size:15px; }
  td.l { width:42%; background:#f5f5f5; font-weight:bold; }
  td.v { direction:ltr; text-align:right; }
  td small { font-weight:normal; color:#666; font-size:11px; }
  tr.paid td.v { color:#28a745; font-weight:bold; font-size:18px; }
  tr.rem td.v { color:${remaining > 0 ? '#dc3545' : '#28a745'}; font-weight:bold; font-size:18px; }
  .sign { display:flex; justify-content:space-between; margin-top:60px; font-size:14px; }
  .sign div { width:40%; border-top:1px solid #333; text-align:center; padding-top:6px; }
  .btn { margin:16px 0; padding:8px 18px; font-size:14px; cursor:pointer; }
  @media print { .btn { display:none; } }
</style></head><body>
  <button class="btn" onclick="window.print()">Print / طباعة</button>
  <div class="head">
    <img src="${logo}" alt="logo" onerror="this.style.display='none'">
    <h1>وصل استلام نقدية<small>Cash Receipt</small></h1>
  </div>
  <table>
    ${row('رقم العملية', 'Receipt / Operation No.', esc(receiptNo))}
    ${row('التاريخ', 'Date', esc(date))}
    ${row('اسم العميل', 'Client Name', `<span dir="auto">${esc(quotation.client_name || '-')}</span>`)}
    ${row('رقم المشروع', 'Project Code', esc(quotation.project_code))}
    ${row('طريقة الدفع', 'Payment Method', esc(payment.payment_method))}
    ${payment.cash_received_by ? row('المستلم', 'Received By', `<span dir="auto">${esc(payment.cash_received_by)}</span>`) : ''}
    ${row('إجمالي المشروع', 'Total Amount', money(quotation.total_amount))}
    ${row('المبلغ المدفوع', 'Amount Paid', money(payment.amount), 'paid')}
    ${row('إجمالي المدفوع حتى الآن', 'Total Paid To Date', money(paidSoFar))}
    ${row('المبلغ المتبقي', 'Remaining Balance', money(remaining), 'rem')}
    ${payment.notes ? row('ملاحظات', 'Notes', `<span dir="auto">${esc(payment.notes)}</span>`) : ''}
  </table>
  <div class="sign"><div>توقيع المستلم<br><small>Receiver</small></div><div>توقيع العميل<br><small>Client</small></div></div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`);
  win.document.close();
}
