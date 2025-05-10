import type { BaseRecord, ID } from './baserecord';

// truck Loads component
export interface TruckLoad extends BaseRecord {
	truckId?: string;
    felWeight?: string;
    samplingStatus?: boolean;
    loadingLocation?: string;
    loadingHour?: string;
	process?: string; // e.g. "Loading" / "Unloading" / "Transferring"
	serverId?: string; 
	syncStatus: 'pending' | 'synced';
    tankLocation?: string;
    acidType?: string;
}