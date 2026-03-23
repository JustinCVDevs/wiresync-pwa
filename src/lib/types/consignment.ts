import type { BaseRecord, ID } from './baserecord';
// consignments componentimp
export interface Consignment extends BaseRecord {
	id: string; // consignment id
	name: string; // consignment number
	linkedTrainId?: ID; // relation to Train.id
	serverId?: string;
	syncStatus: 'pending' | 'synced';
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
	user?: string; // user who created the consignment
	isWireSynced?: boolean;
}
