import type { BaseRecord } from './baserecord';

export interface Train extends BaseRecord {
	id: string; // TRAIN_ID
	refNr: string; // TRAIN_REF_NR
	rfidNr?: string; // TRAIN_RFID_NR
	trainPhotoUrl?: string; // captured photo
	serverId?: string;
	syncStatus: 'pending' | 'synced';
}
