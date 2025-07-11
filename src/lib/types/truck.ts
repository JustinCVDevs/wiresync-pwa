import type { BaseRecord } from './baserecord';

export interface Truck extends BaseRecord {
	id: string;
	registration: string;
	syncStatus: string;
	serverId?: string;
	loadingLocation?: string;
	loadingHour?: number;
	updatedAt?: Date;
	dedicatedFleet?: boolean;
	linkedFleetIds?: string[];
	felWeight?: number;
}
