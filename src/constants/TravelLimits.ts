// Itinerary text inputs are capped at their qindom column widths, so the user can't type past what
// the backend accepts (it answers an oversized field with a 400). Keep in sync with the column
// widths at the top of qindom's src/itinerary/Itinerary.validator.ts.

/** tb_travel_itinerary.session_title VARCHAR(512) */
export const TRIP_TITLE_MAX_LENGTH = 512
/** tb_travel_itinerary.destination VARCHAR(512) */
export const TRIP_DESTINATION_MAX_LENGTH = 512
/** tb_travel_agenda_item.title VARCHAR(512) */
export const AGENDA_TITLE_MAX_LENGTH = 512
/** tb_travel_itinerary_booking.item VARCHAR(512) */
export const BOOKING_ITEM_MAX_LENGTH = 512
/** tb_travel_itinerary_booking.location VARCHAR(128), sent as `remarks` */
export const BOOKING_REMARKS_MAX_LENGTH = 128
/** tb_travel_itinerary_booking.link VARCHAR(1024) */
export const BOOKING_LINK_MAX_LENGTH = 1024
/** tb_travel_itinerary_booking.payment VARCHAR(256), stored as `Delayed (<date>)` */
export const BOOKING_PAYMENT_DATE_MAX_LENGTH = 256 - 'Delayed ()'.length
/** tb_travel_itinerary_booking.free_cancellation VARCHAR(256) */
export const BOOKING_FREE_CANCELLATION_MAX_LENGTH = 256
/** tb_travel_itinerary_booking.deposit VARCHAR(128) */
export const BOOKING_DEPOSIT_MAX_LENGTH = 128
/** tb_travel_packing_item.label VARCHAR(255) */
export const PACKING_LABEL_MAX_LENGTH = 255
/** tb_travel_note_item.label VARCHAR(255) */
export const NOTE_LABEL_MAX_LENGTH = 255
