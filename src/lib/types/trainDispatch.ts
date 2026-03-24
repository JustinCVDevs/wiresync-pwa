import type { BaseRecord, ID } from './baserecord';

// train dispatches component
export interface TrainDispatch extends BaseRecord {
	id: string;
	linkedTrainId: string;
	linkedConsignmentId?: string;
	linkedWagonIds?: ID[]; // many-to-many with Wagon.id
	process?: string; // e.g. "Loading" / "Unloading" / "Transferring"
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
	dispatchTimestamp?: Date;
	user: string;
	isWireSynced?: boolean;
}
