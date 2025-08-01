import type { BaseRecord, ID } from './baserecord';

// assays component
export interface Assay extends BaseRecord {
	id: string; // ASSAY_ID
	name: string; // WAGON_SAMPLE_ID / TRUCK_SAMPLE_ID / FLEET_TRUCK_SAMPLE_ID
	location?: string; // e.g. "West Loadout"
	linkedWagonIds?: ID[]; // many-to-many with Wagon.id
	linkedTruckIds?: ID[]; // many-to-many with Truck.id
	linkedDedicatedFleetTruckIds?: ID[]; // many-to-many with DedicatedFleetTruck.id
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	linkedTruckLoadIds?: ID[]; // many-to-many with TruckLoad.id
	linkedFleetIds?: ID[]; // many-to-many with Fleet.id
	sampleSize?: string; // e.g. "1000"
	materialType?: string; // e.g. "Cotton"
	productType?: string; // e.g. "Cotton"
	process?: string; // e.g. "Loading" / "Unloading" / "Transferring"
	commodity?: string;
	dedicatedFleet?: boolean; // e.g. true / false
	sampleId?: string;
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
}
