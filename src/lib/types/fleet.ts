import type { BaseRecord } from '$lib';

export interface Fleet extends BaseRecord {
	sampleId: string; // FLEET_TRUCK_SAMPLE_ID
	sampleSize?: string; // FLEET_TRUCK_SAMPLE_SIZE
	commodity?: string; // FLEET_TRUCK_COMMODITY
	materialType?: string; // FLEET_MATERIAL_TYPE
	registration?: string; // FLEET_TRUCK_REGISTRATION
	felMassKg?: number; // FLEET_FEL_MASS_KG
	samplingStatus?: boolean; // FLEET_TRUCK_SAMPLING_STATUS
	loadingLocation?: string; // FLEET_TRUCK_LOADING_LOCATION
	loadingHour?: number; // FLEET_HR (0–23)
	serverId?: string; 
	syncStatus: 'pending' | 'synced';
}
