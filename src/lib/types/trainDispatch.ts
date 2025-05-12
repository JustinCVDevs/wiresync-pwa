import type { BaseRecord, ID } from './baserecord';

// train dispatches component
export interface TrainDispatch extends BaseRecord {
	linkedTrainId: string;
	linkedConsignmentId?: string;
	linkedWagonIds?: ID[]; // many-to-many with Wagon.id
	process?: string; // e.g. "Loading" / "Unloading" / "Transferring"
	serverId?: string;
	syncStatus: 'pending' | 'synced';
}
