import type { BaseRecord, ID } from './baserecord';

export interface Wagon extends BaseRecord {
	id: string;
	wagonId?: string; // WAGON_ID
	sampleId?: string; // WAGON_SAMPLE_ID
	transcoreTag?: string; // TRANSCORE_TAG
	wagonIdSimple?: string; // WAGON_ID_SIMPLE
	wagonPhotoUrl?: File | null; // URL of captured photo
	productType?: string;
	verificationTs?: string; // PMC_WAGON_VERIFICATION_TIMESTAMP (YYYY-MM-DD)
	linkedTrainId?: ID; // relation to Train.id
	linkedConsignmentId?: ID; // relation to Consignment.id (dispatch)
	wagonPosition?: number; // WAGON_POSITION
	felWeight?: number; // WAGON_WEIGHT
	samplingStatus?: string; // WAGON_SAMPLING_STATUS
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	process?: string; // e.g. "Loading" / "Unloading" / "Transferring"
	dispatchTimestamp?: Date;
	sampleTimestamp?: Date; // Timestamp when the wagon was sampled
	felTimestamp?: Date;
	releaseTimestamp?: Date;
	loadingLocation?: string; // Location where the wagon is loaded
	trainNumber?: string; // Train number associated with the wagon
	tarpedStatus?: boolean; // Whether the wagon is tarped
}
