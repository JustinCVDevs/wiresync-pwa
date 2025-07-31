import type { BaseRecord, ID } from './baserecord';

export interface TrainArrival extends BaseRecord {
    id: string;
	trainId?: string;
	trainRefNr: string; // TRAIN_REF_NR
	trainRfidNr?: string; // TRAIN_RFID_NR
	portRailArrivalTimestamp?: string; // PORT_RAIL_ARRIVAL_TIMESTAMP
	portStagingTimestamp?: string; // PORT_STAGING_TIMESTAMP
	trainPhotoUrl?: string;
	status: 'pending' | 'received' | 'processed';
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
	linkedWagonIds?: ID[];
}