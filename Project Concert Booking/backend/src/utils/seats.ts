/**
 * Seat layout generation.
 *
 * Seats are laid out in rows labelled A, B, C ... (then AA, AB ... after Z),
 * `seatsPerRow` seats per row. Example with 23 seats and 10 per row:
 *   A1..A10, B1..B10, C1..C3
 */

const DEFAULT_SEATS_PER_ROW = 10;

export interface GeneratedSeat {
  rowLabel: string;
  seatNumber: number;
  code: string;
}

const toRowLabel = (index: number): string => {
  let label = "";
  let n = index;

  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return label;
};

export const buildSeatRows = (
  totalSeats: number,
  seatsPerRow: number = DEFAULT_SEATS_PER_ROW,
): GeneratedSeat[] => {
  const seats: GeneratedSeat[] = [];
  let remaining = totalSeats;
  let rowIndex = 0;

  while (remaining > 0) {
    const rowLabel = toRowLabel(rowIndex);
    const count = Math.min(seatsPerRow, remaining);

    for (let seatNumber = 1; seatNumber <= count; seatNumber++) {
      seats.push({ rowLabel, seatNumber, code: `${rowLabel}${seatNumber}` });
    }

    remaining -= count;
    rowIndex += 1;
  }

  return seats;
};
