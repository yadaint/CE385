import type { Concert } from "../types";

/** Total number of available seats across every zone of the concert. */
export const getConcertSeatsLeft = (concert: Concert): number =>
  concert.zones.reduce((sum, zone) => sum + zone.availableSeats, 0);

/** A concert is sold out when no zone has seats left. */
export const isConcertSoldOut = (concert: Concert): boolean =>
  getConcertSeatsLeft(concert) === 0;

/** Cheapest zone price — used for the "from ฿X" labels. */
export const getConcertStartingPrice = (concert: Concert): number =>
  concert.zones.reduce((min, zone) => Math.min(min, zone.price), Number.POSITIVE_INFINITY);
