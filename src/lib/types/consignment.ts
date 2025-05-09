import type { BaseRecord, ID } from './baserecord';
// consignments componentimp
export interface Consignment extends BaseRecord {
	name: string; // consignment number
	linkedTrainId?: ID; // relation to Train.id
	serverId?: string;
	syncStatus: 'pending' | 'synced';
}
