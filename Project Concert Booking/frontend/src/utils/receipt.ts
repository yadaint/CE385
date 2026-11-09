import { calculateVat, formatCurrency } from "./format";
import type { SeatTicket } from "../components/TicketCard";

export interface ReceiptData {
  /** เลขที่ใบเสร็จ — ใช้รหัสตั๋วของการจอง */
  receiptNo: string;
  buyerLabel: string;
  concertName: string;
  venue: string;
  showDateLabel: string;
  zoneName: string;
  /** ที่นั่ง + รหัสตั๋วรายที่นั่ง (แสดงครบทุกที่นั่ง) */
  seatTickets: SeatTicket[];
  quantity: number;
  /** ราคารวม VAT 7% แล้ว */
  totalPrice: number;
}

/** กันตัวอักษรพิเศษพัง HTML ในใบเสร็จ */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * พิมพ์ใบเสร็จรับเงิน — เปิดหน้าต่างใหม่ที่มีใบเสร็จอยู่อย่างเดียวแล้วสั่งพิมพ์ทันที
 * ใบเสร็จแสดง: เลขที่ใบเสร็จ, ผู้ซื้อ, รายการบัตร, ยอดก่อน VAT, VAT 7%, ยอดรวมสุทธิ
 */
export const printReceipt = (data: ReceiptData): void => {
  const vat = calculateVat(data.totalPrice);
  const now = new Date().toLocaleString("th-TH", { hour12: false });
  const seatCodes = data.seatTickets.map((seat) => seat.code).join(", ");
  const seatTicketCodes = data.seatTickets
    .map((seat) => seat.ticketCode ?? "-")
    .join(", ");

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>ใบเสร็จรับเงิน ${escapeHtml(data.receiptNo)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Leelawadee UI", "Tahoma", "Sarabun", sans-serif;
    color: #111; background: #fff;
    width: 320px; margin: 0 auto; padding: 24px 16px;
    font-size: 13px;
  }
  .brand { text-align: center; }
  .brand .name { font-size: 15px; font-weight: 800; letter-spacing: 2px; }
  .brand .doc { font-size: 18px; font-weight: 800; margin-top: 10px; }
  .meta { margin-top: 12px; font-size: 12px; line-height: 1.6; }
  .meta div { display: flex; justify-content: space-between; gap: 8px; }
  .meta span:first-child { color: #555; }
  hr { border: none; border-top: 1px dashed #999; margin: 12px 0; }
  .item { display: flex; justify-content: space-between; gap: 8px; margin-top: 6px; }
  .item .desc { flex: 1; }
  .item .sub { color: #555; font-size: 11px; margin-top: 2px; line-height: 1.5; }
  .totals { margin-top: 12px; font-size: 13px; line-height: 1.8; }
  .totals div { display: flex; justify-content: space-between; gap: 8px; }
  .totals .grand { font-size: 15px; font-weight: 800; border-top: 1px dashed #999; padding-top: 8px; margin-top: 6px; }
  .footer { margin-top: 16px; text-align: center; font-size: 11px; color: #555; line-height: 1.6; }
  @media print { body { width: auto; padding: 8px; } }
</style>
</head>
<body>
  <div class="brand">
    <div class="name">BOOKING TICKET CONCERT</div>
    <div class="doc">ใบเสร็จรับเงิน / RECEIPT</div>
  </div>

  <div class="meta">
    <div><span>เลขที่ใบเสร็จ</span><span>${escapeHtml(data.receiptNo)}</span></div>
    <div><span>วันที่ออกใบเสร็จ</span><span>${now}</span></div>
    <div><span>ผู้ซื้อ</span><span>${escapeHtml(data.buyerLabel)}</span></div>
  </div>

  <hr />

  <div class="item">
    <div class="desc">
      บัตรคอนเสิร์ต ${escapeHtml(data.concertName)}
      <div class="sub">
        สถานที่: ${escapeHtml(data.venue)}<br />
        วันที่แสดง: ${escapeHtml(data.showDateLabel)}<br />
        โซน: ${escapeHtml(data.zoneName)} · ที่นั่ง: ${escapeHtml(seatCodes)}<br />
        จำนวน: ${data.quantity} บัตร<br />
        รหัสตั๋วรายที่นั่ง: ${escapeHtml(seatTicketCodes)}
      </div>
    </div>
  </div>

  <hr />

  <div class="totals">
    <div><span>ยอดก่อน VAT (7%)</span><span>${formatCurrency(vat.beforeVat)}</span></div>
    <div><span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span><span>${formatCurrency(vat.vat)}</span></div>
    <div class="grand"><span>ยอดรวมสุทธิ (รวม VAT 7%)</span><span>${formatCurrency(vat.total)}</span></div>
  </div>

  <div class="footer">
    ขอบคุณที่ใช้บริการ — ใบเสร็จนี้ถือเป็นหลักฐานการชำระเงิน<br />
    ราคาทุกรายการรวมภาษีมูลค่าเพิ่ม (VAT) 7% แล้ว
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=680");
  if (!win) return; // ผู้ใช้บล็อกป๊อปอัป — ไม่มีอะไรเกิดขึ้น

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};
