import type { BaseRecord, ID } from './baserecord';

// truck Loads component
export interface TruckLoad extends BaseRecord {
	id: string;
	truckId?: string;
	felWeight?: string;
	samplingStatus?: boolean;
	sampleId?: string;
	loadingLocation?: string;
	loadingHour?: string;
	process?: string; // e.g. "Loading" / "Unloading" / "Transferring"
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	tankLocation?: string;
	acidType?: string;
	materialType?: string;
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
	user: string;
}
