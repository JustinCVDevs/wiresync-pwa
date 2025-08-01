import type { BaseRecord } from './baserecord';

export interface DedicatedFleetTruck extends BaseRecord {
    id: string;
    registration: string;
    syncStatus: string;
    serverId?: string;
    loadingLocation?: string;
}
