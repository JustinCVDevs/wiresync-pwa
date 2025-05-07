import type { BaseRecord } from './baserecord';

export interface Train extends BaseRecord {
	refNr: string; // TRAIN_REF_NR
	rfidNr?: string; // TRAIN_RFID_NR
	trainPhotoUrl?: string; // captured photo
}
