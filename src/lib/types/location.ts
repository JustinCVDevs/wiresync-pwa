import type { BaseRecord } from './baserecord';

export interface Location extends BaseRecord {
	name: string;
	description: string;
	latitude: number;
	longitude: number;
}
