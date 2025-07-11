import type { BaseRecord, ID } from './baserecord';

// assays component
export interface Assay extends BaseRecord {
	name: string; // WAGON_SAMPLE_ID / TRUCK_SAMPLE_ID / FLEET_TRUCK_SAMPLE_ID
	productGrade?: string; // WAGON_PRODUCT_GRADE
	location?: string; // e.g. "West Loadout"
	linkedWagonIds?: ID[]; // many-to-many with Wagon.id
	linkedTruckIds?: ID[]; // many-to-many with Truck.id
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	linkedTruckLoadIds?: ID[]; // many-to-many with TruckLoad.id
	linkedFleetId?: string;
	sampleSize?: string; // e.g. "1000"
	commodity?: string; // e.g. "Cotton"
	productType?: string; // e.g. "Cotton"
	process?: string; // e.g. "Loading" / "Unloading" / "Transferring"
	dedicatedFleet?: boolean; // e.g. true / false
	sampleId?: string;
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
}
