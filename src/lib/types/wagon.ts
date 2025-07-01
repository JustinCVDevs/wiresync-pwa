import type { BaseRecord, ID } from './baserecord';

export interface Wagon extends BaseRecord {
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
}
