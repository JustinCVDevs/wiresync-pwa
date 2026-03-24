import type { BaseRecord, ID } from './baserecord';

// assays component
export interface ShuntingTrain extends BaseRecord {
	id: string; 
	postDate: Date;
	linkedWagons?: ID[]; 
	serverId?: string;
	syncStatus: 'pending' | 'synced';// many-to-many with TruckLoad.id
	verificationTimestamp?: Date | string;
	finishSamplingTimestamp?: Date | string;
	finishFELOperationTimestamp?: Date | string;
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
	user: string;
	isWireSynced?: boolean;
}
