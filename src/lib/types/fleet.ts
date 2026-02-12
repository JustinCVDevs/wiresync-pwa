import type { BaseRecord } from '$lib';

export interface Fleet extends BaseRecord {
	id: string; // FLEET_ID
	sampleId: string; // FLEET_TRUCK_SAMPLE_ID
	sampleNumber?: number; // FLEET_TRUCK_SAMPLE_NUMBER
	commodity?: string; // FLEET_TRUCK_COMMODITY
	materialType?: string; // FLEET_MATERIAL_TYPE
	registration?: string; // FLEET_TRUCK_REGISTRATION
	felMassKg?: number; // FLEET_FEL_MASS_KG
	samplingStatus?: boolean; // FLEET_TRUCK_SAMPLING_STATUS
	loadingLocation?: string; // FLEET_TRUCK_LOADING_LOCATION
	loadingHour?: string; // FLEET_HR (0–23)
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
	user: string;
	truckDestination?: string; // FLEET_TRUCK_DESTINATION
}
