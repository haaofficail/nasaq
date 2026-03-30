/**
 * Engines Layer — نسق
 *
 * Each engine owns its domain logic independently.
 * No engine writes directly to bookings/services (legacy tables).
 * All new features MUST live inside an engine.
 *
 * Engines:
 *   appointment  → appointment_bookings + service_definitions
 *   commerce     → orders + product_definitions
 *   stay         → stay_bookings + rental_unit_definitions (hotel/car)
 *   lease        → contracts + rental_unit_definitions (long-term)
 *   table        → table_reservations
 *   event        → event_bookings
 *   education    → school system (students, teachers, attendance, behavior)
 *
 * Shared:
 *   payments     → canonical payment service (wraps payments table)
 *   notifications → fire booking events
 *   vat          → VAT calculation (single source of truth)
 */

export { appointmentEngine } from "./appointment";
export { commerceEngine }    from "./commerce";
export { stayEngine }        from "./stay";
export { leaseEngine }       from "./lease";
export { tableEngine }       from "./table";
export { eventEngine }       from "./event";
export { educationEngine }   from "./education";
