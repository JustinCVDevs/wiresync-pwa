import type { BaseRecord, ID } from './baserecord';

export interface Wagon extends BaseRecord {
	transcoreTag?: string; // TRANSCORE_TAG
	wagonIdSimple?: string; // WAGON_ID_SIMPLE
	wagonPhotoUrl?: string; // URL of captured photo
	componentType?: string; // PROCESS NAME
	verificationTs?: string; // PMC_WAGON_VERIFICATION_TIMESTAMP (YYYY-MM-DD)
	linkedTrainId?: ID; // relation to Train.id
	linkedConsignmentId?: ID; // relation to Consignment.id (dispatch)
}
