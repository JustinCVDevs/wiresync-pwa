import type { BaseRecord } from './baserecord';

export interface Truck extends BaseRecord {
	id: string;
	registration: string;
	syncStatus: string;
	serverId?: string;
	loadingLocation?: string;
	productType?: string;
}
