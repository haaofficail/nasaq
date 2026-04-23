/**
 * Canonical Booking Tables
 *
 * ARCHITECTURE:
 * - bookings (legacy) = read only from this point. No new writes.
 * - appointment_bookings = Engine: Appointment (salon, photography, maintenance)
 * - stay_bookings        = Engine: Stay (hotel, car rental, daily rental)
 * - table_reservations   = Engine: Table (restaurant, cafe)
 * - event_bookings       = Engine: Event (wedding, conference, birthday)
 *
 * Use v_all_bookings view for reporting across all engines.
 */
export declare const appointmentBookings: any;
export declare const stayBookings: any;
export declare const tableReservations: any;
export declare const eventBookings: any;
export declare const bookingRecords: any;
export declare const bookingLines: any;
export declare const bookingLineAddons: any;
export declare const bookingTimelineEvents: any;
export declare const bookingRecordAssignments: any;
export declare const bookingRecordCommissions: any;
export declare const bookingRecordConsumptions: any;
export declare const bookingPaymentLinks: any;
//# sourceMappingURL=canonical-bookings.d.ts.map