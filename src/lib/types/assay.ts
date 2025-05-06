import type { BaseRecord, ID } from "./baserecord"


// assays component
export interface Assay extends BaseRecord {
    name: string                 // WAGON_SAMPLE_ID / TRUCK_SAMPLE_ID / FLEET_TRUCK_SAMPLE_ID
    productGrade?: string        // WAGON_PRODUCT_GRADE
    location?: string            // e.g. "West Loadout"
    linkedWagonIds?: ID[]        // many-to-many with Wagon.id
    linkedTruckIds?: ID[]        // many-to-many with Truck.id
  }
