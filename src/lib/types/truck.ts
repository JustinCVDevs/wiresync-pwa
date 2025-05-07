import type { BaseRecord } from './baserecord';

export interface Truck extends BaseRecord {
	registration: string; // TRUCK_REGISTRATION
	sampleId?: string; // TRUCK_SAMPLE_ID
	sampleSize?: string; // TRUCK_SAMPLE_SIZE
	commodity?: string; // TRUCK_COMMODITY
	materialType?: string; // MATERIAL_TYPE
	felMassKg?: number; // FEL_MASS_KG
	samplingStatus?: boolean; // TRUCK_SAMPLING_STATUS
	loadingLocation?: string; // TRUCK_LOADING_LOCATION
	unrefinedCuProdType?: string; // TRUCK_UNREFINED_CU_PROD_TYPE (copper)
	serverId?: string; 
	syncStatus: 'pending' | 'synced';
}
