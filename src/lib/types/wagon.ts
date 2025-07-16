import type { BaseRecord, ID } from './baserecord';

export interface Wagon extends BaseRecord {
	id: string; // WAGON_ID
	transcoreTag?: string; // TRANSCORE_TAG
	wagonIdSimple?: string; // WAGON_ID_SIMPLE
	wagonPhotoUrl?: File | null; // URL of captured photo
	componentType?: string; // PROCESS NAME
	verificationTs?: string; // PMC_WAGON_VERIFICATION_TIMESTAMP (YYYY-MM-DD)
	linkedTrainId?: ID; // relation to Train.id
	linkedConsignmentId?: ID; // relation to Consignment.id (dispatch)
	weight?: string; // WAGON_WEIGHT
	samplingStatus?: string; // WAGON_SAMPLING_STATUS
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	process?: string; // e.g. "Loading" / "Unloading" / "Transferring"
	dispatchTimestamp?: Date;
	releaseTimestamp?: Date;
	loadingLocation?: string; // Location where the wagon is loaded
	trainNumber?: string; // Train number associated with the wagon
}
