import type { BaseRecord, ID } from './baserecord';

// assays component
export interface ShuntingTrain extends BaseRecord {
	id: string; 
	postDate: Date;
	linkedWagons?: ID[]; 
	syncStatus: 'pending' | 'synced';// many-to-many with TruckLoad.id
	verificationTimestamp?: Date; 
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
}
