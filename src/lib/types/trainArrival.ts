import type { BaseRecord, ID } from './baserecord';

export interface TrainArrival extends BaseRecord {
    id: string;
	trainId?: string;
	portRailArrivalTimestamp?: string; // PORT_RAIL_ARRIVAL_TIMESTAMP
	portStagingTimestamp?: string; // PORT_STAGING_TIMESTAMP
	finishSamplingTimestamp?: string; // FINISH_SAMPLING_TIMESTAMP
	trainPhotoUrl?: string;
	status: 'pending' | 'received' | 'staging' | 'sampling' | 'released';
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
	linkedWagonIds?: ID[];
	comment?: string;
}