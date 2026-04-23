/**
 * Canonical Catalog
 *
 * ARCHITECTURE:
 * - services (legacy) = frozen. No new offeringType values.
 * - catalog_items     = canonical root with item_type discriminator
 * - service_definitions    = Engine: Appointment/Service
 * - product_definitions    = Engine: Commerce
 * - rental_unit_definitions = Engine: Stay/Rental
 *
 * ALLOWED item_type values (canonical, not enum to allow engine extensions):
 *   "service" | "product" | "rental_unit" | "subscription" | "digital"
 */
export declare const catalogItems: any;
export declare const serviceDefinitions: any;
export declare const productDefinitions: any;
export declare const rentalUnitDefinitions: any;
//# sourceMappingURL=canonical-catalog.d.ts.map