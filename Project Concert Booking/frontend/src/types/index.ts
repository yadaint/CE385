export type Role = "USER" | "ADMIN";

/** สถานะการจอง: รอชำระเงิน → รอตรวจสอบสลิป → จองสำเร็จ / สลิปไม่ผ่าน / ยกเลิก */
export type BookingStatus =
  | "PENDING"
  | "PENDING_VERIFICATION"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

/** สถานะการตรวจสอบสลิป */
export type PaymentStatus = "PENDING_VERIFICATION" | "APPROVED" | "REJECTED";

/** ต้นสังกัดคอนเสิร์ต: ไทย / ต่างประเทศ */
export type Origin = "THAI" | "INTERNATIONAL";

/** รูปแบบการแสดง: คอนเดี่ยว / คอนกลุ่ม */
export type ArtistType = "SOLO" | "GROUP";

/**
 * สถานะการเปิดขายบัตรของคอนเสิร์ต:
 * DRAFT = สร้างแล้วแต่ยังไม่เปิดขาย (ไม่โชว์หน้าจอง) · OPEN = เปิดขายแล้ว
 * CLOSED = แอดมินปิดขายชั่วคราว · SOLD_OUT = บัตรทุกโซนหมด (ตั้งโดยระบบ)
 * CANCELLED = ยกเลิกการขายถาวร (ป้องกันปัญหาระหว่างเปิดขาย)
 */
export type ConcertSaleStatus = "DRAFT" | "OPEN" | "CLOSED" | "SOLD_OUT" | "CANCELLED";

/** ประเภทการแจ้งเตือนหลังบ้าน */
export type NotificationType = "ZONE_SOLD_OUT" | "CONCERT_SOLD_OUT";

/** Standard API response envelope used by the backend. */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt?: string;
}

/** An individual physical seat inside a zone (row + number, e.g. A12). */
export interface Seat {
  id: string;
  zoneId: string;
  rowLabel: string;
  seatNumber: number;
  /** Display code, e.g. "A12" */
  code: string;
  isAvailable: boolean;
}

/** ตำแหน่งของโซนบนผัง: ซ้าย / กลาง / ขวา */
export type ZoneSide = "LEFT" | "CENTER" | "RIGHT";

/** A priced seating zone of a concert (e.g. VIP, Gold, Standing). */
export interface Zone {
  id: string;
  concertId: string;
  name: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  /** Row position on the seating map (1 = closest to the stage). */
  sortOrder: number;
  /** ตำแหน่งซ้าย/กลาง/ขวาบนผัง */
  side: ZoneSide;
  /** โซนกว้างครอบเต็มแถวบนผัง (เช่น โซนยืน) */
  wide: boolean;
  /** รหัสโซน 2 ตัวอักษร ใช้สร้างรหัสตั๋ว เช่น GD (โกลด์) */
  code: string;
  /** โซนนี้เปิดขายหรือไม่ — โซนปิดขายจะเป็นสีเทา เลือกซื้อไม่ได้ */
  isOnSale: boolean;
  /** Full seat map — only present in the concert-detail response. */
  seats?: Seat[];
}

export interface Concert {
  id: string;
  name: string;
  /** ชื่อภาษาอังกฤษ (null = ใช้ชื่อไทยทั้งสองภาษา) */
  nameEn: string | null;
  description: string;
  /** วันที่แสดงทั้งหมด (ISO 8601) — คอนเสิร์ตหนึ่งงานจัดได้หลายวัน */
  dates: string[];
  venueId: string;
  /** สถานที่จัดงาน */
  venue: { id: string; name: string };
  origin: Origin;
  artistType: ArtistType;
  /** URL รูปภาพปก (ถ้ามี) */
  imageUrl: string | null;
  /** อิโมจิประจำคอนเสิร์ต ใช้บนการ์ดเมื่อไม่มีรูปภาพ */
  emoji: string | null;
  /** สถานะการเปิดขายบัตร */
  saleStatus: ConcertSaleStatus;
  /** วันและเวลาสุดท้ายของการขายบัตร (null = ไม่จำกัดเวลา) */
  saleEndDate: string | null;
  zones: Zone[];
  createdAt: string;
  updatedAt: string;
}

/** ผังโซน FIX ประจำสถานที่ (ใช้ตอนสร้างคอนเสิร์ต) */
export interface VenueZoneLayout {
  id: string;
  venueId: string;
  name: string;
  code: string;
  side: ZoneSide;
  wide: boolean;
  mapRow: number;
  rowCount: number;
  seatsPerRow: number;
}

/** สถานที่จัดงาน พร้อมผังโซน FIX */
export interface Venue {
  id: string;
  name: string;
  zones: VenueZoneLayout[];
}

/** Seat info embedded in a booking response. */
export interface SeatSummary {
  id: string;
  code: string;
  rowLabel: string;
  /** รหัสตั๋วประจำที่นั่ง (1 ที่นั่ง = 1 รหัส) — มาพร้อม response จาก withFlatSeats */
  ticketCode?: string | null;
}

/** Zone info embedded in a booking response. */
export interface ZoneSummary {
  id: string;
  name: string;
  price: number;
}

/** Concert info embedded in a booking response. */
export interface ConcertSummary {
  id: string;
  name: string;
  nameEn?: string | null;
  venue: { name: string };
}

/** สลิปการชำระเงินที่ผูกกับการจอง */
export interface PaymentSummary {
  id: string;
  slipImage: string;
  status: PaymentStatus;
  note: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  concertId: string;
  zoneId: string;
  /** วันที่แสดงที่ผู้ใช้เลือกจอง */
  showDate: string;
  /** รหัสตั๋ว 10 ตัว: PJY + รหัสโซน + เลขสุ่ม 5 ตัว */
  ticketCode: string;
  quantity: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  zone: ZoneSummary;
  concert: ConcertSummary;
  seats: SeatSummary[];
  payment?: PaymentSummary | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/** ผลการตรวจสอบตั๋วจากหน้าเช็คตั๋ว (ไม่มีข้อมูลส่วนตัวของผู้จอง) */
export interface BookingCheckResult {
  id: string;
  quantity: number;
  totalPrice: number;
  status: BookingStatus;
  /** วันที่แสดงที่เลือกจอง */
  showDate: string;
  /** รหัสตั๋ว 10 ตัว */
  ticketCode: string;
  createdAt: string;
  updatedAt: string;
  zone: ZoneSummary;
  concert: ConcertSummary;
  seats: SeatSummary[];
  payment?: { status: PaymentStatus; note: string | null } | null;
}

/* ─── ประเภทสำหรับหลังบ้าน (ADMIN) ─── */

export interface AdminStats {
  users: number;
  concerts: number;
  revenue: number;
  pendingPayments: number;
  /** จำนวนแจ้งเตือนหลังบ้านที่ยังไม่อ่าน (เช่น บัตรโซนหมด) */
  unreadNotifications: number;
  /** จำนวนคอนเสิร์ตแยกตามสถานะการเปิดขาย */
  concertsBySaleStatus: Record<ConcertSaleStatus, number>;
  bookings: { total: number; byStatus: Record<BookingStatus, number> };
}

/** คอนเสิร์ตในหลังบ้าน — เห็นทุกสถานะ พร้อมสรุปที่นั่งคงเหลือ */
export interface AdminConcert {
  id: string;
  name: string;
  nameEn: string | null;
  description: string;
  dates: string[];
  saleStatus: ConcertSaleStatus;
  origin: Origin;
  artistType: ArtistType;
  imageUrl: string | null;
  emoji: string | null;
  venue: { id: string; name: string };
  totalSeats: number;
  availableSeats: number;
  /** จำนวนโซนเปิดขายที่บัตรหมดแล้ว */
  soldOutZoneCount: number;
  /** จำนวนโซนที่เปิดขายทั้งหมด */
  onSaleZoneCount: number;
  zones: Zone[];
  createdAt: string;
  updatedAt: string;
}

/** แจ้งเตือนหลังบ้าน เช่น บัตรโซนหมด / บัตรทั้งคอนหมด */
export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  concertId: string | null;
  zoneId: string | null;
  isRead: boolean;
  createdAt: string;
  concert?: { id: string; name: string } | null;
  zone?: { id: string; name: string; code: string } | null;
}

export interface AdminBooking {
  id: string;
  quantity: number;
  totalPrice: number;
  status: BookingStatus;
  /** วันที่แสดงที่ผู้ใช้เลือกจอง */
  showDate: string;
  ticketCode: string;
  createdAt: string;
  updatedAt: string;
  zone: ZoneSummary;
  concert: ConcertSummary;
  seats: SeatSummary[];
  user: { email: string };
  payment?: {
    id: string;
    status: PaymentStatus;
    slipImage: string;
    note: string | null;
    reviewedAt: string | null;
    reviewedByEmail: string | null;
  } | null;
}

export interface AdminPayment {
  id: string;
  slipImage: string;
  status: PaymentStatus;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
  /** แอดมินผู้ตรวจสลิป (null = ยังไม่ถูกตรวจ) — แสดงรหัสพนักงานให้แอดมินทุกคนเห็นว่าใครเป็นคนกด */
  reviewedBy?: {
    id: string;
    email: string;
    employeeId: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  booking: {
    id: string;
    quantity: number;
    totalPrice: number;
    status: BookingStatus;
    /** วันที่แสดงที่ผู้ใช้เลือกจอง */
    showDate: string;
    ticketCode: string;
    zone: ZoneSummary;
    concert: ConcertSummary;
    seats: SeatSummary[];
    user: { email: string };
  };
}

/* ─── ผังที่นั่งเรียลไทม์ของหลังบ้าน ─── */

/** ที่นั่งในผังหลังบ้าน — เพิ่มสถานะการจองของที่นั่ง */
export interface AdminSeat extends Seat {
  /** null = ที่นั่งว่าง ไม่งั้นคือสถานะการจองที่ถือที่นั่งนี้อยู่ */
  bookingStatus: BookingStatus | null;
}

/** โซนในผังหลังบ้าน พร้อมที่นั่งทั้งหมด */
export interface AdminSeatMapZone {
  id: string;
  name: string;
  code: string;
  price: number;
  side: ZoneSide;
  wide: boolean;
  sortOrder: number;
  isOnSale: boolean;
  totalSeats: number;
  availableSeats: number;
  seats: AdminSeat[];
}

/** ผลลัพธ์ GET /admin/concerts/:id/seats */
export interface AdminSeatMap {
  concert: {
    id: string;
    name: string;
    dates: string[];
    saleStatus: ConcertSaleStatus;
    venue: { name: string };
  };
  zones: AdminSeatMapZone[];
}

/* ─── รายการตั๋วจำเพาะต่อคอนเสิร์ต ─── */

/** โซนแบบย่อสำหรับแถบเลือกโซนในหลังบ้าน */
export interface AdminZoneOption {
  id: string;
  name: string;
  code: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
}

/** ผลลัพธ์ GET /admin/concerts/:id/tickets */
export interface AdminConcertTickets {
  concert: {
    id: string;
    name: string;
    dates: string[];
    saleStatus: ConcertSaleStatus;
    venue: { name: string };
    zones: AdminZoneOption[];
  };
  tickets: Array<
    Omit<AdminBooking, "concert"> & {
      zone: ZoneSummary & { code: string };
      payment: {
        id: string;
        status: PaymentStatus;
        note: string | null;
        reviewedAt: string | null;
        reviewedByEmail: string | null;
      } | null;
    }
  >;
}

/* ─── สรุปรายได้รายโซน ─── */

/** สรุปของแต่ละโซน */
export interface AdminZoneSummary {
  id: string;
  name: string;
  code: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  soldSeats: number;
  isOnSale: boolean;
  bookingsByStatus: Record<BookingStatus, number>;
  bookingCount: number;
  /** รายได้ที่ยืนยันแล้ว (จองสำเร็จ) */
  confirmedRevenue: number;
  /** ยอดที่ยังถือที่นั่งไว้แต่ยังไม่ยืนยัน */
  pendingRevenue: number;
  ticketsSold: number;
}

/** ผลลัพธ์ GET /admin/concerts/:id/summary */
export interface AdminConcertSummary {
  concert: {
    id: string;
    name: string;
    dates: string[];
    saleStatus: ConcertSaleStatus;
    venue: { name: string };
  };
  zones: AdminZoneSummary[];
  totals: {
    confirmedRevenue: number;
    pendingRevenue: number;
    soldSeats: number;
    totalSeats: number;
    bookingCount: number;
  };
}
