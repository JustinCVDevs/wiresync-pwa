import type { BaseRecord, ID } from './baserecord';

export interface TruckArrival extends BaseRecord{
	/** PocketBase meta */
	id: string;

	/** Core arrival data */
	truckId?: string;                // relation ID or plate number
	dedicatedTruckId?: string;        // relation ID
	port_arrival_sample_id?: string;
	truck_photo?: string;                     // filenames as returned by PocketBase
	port_truck_arrival_timestamp?: Date;      // ISO datetime
	status?: 'received' | 'registered';

	/** Populated only when registering a new truck */
	transporter?: string;
	truck_commodity?: string;
	gross_measured_kg?: number;
	gross_timestamp?: Date;                  // ISO datetime
	tare_stored_kg?: number;
	tare_timestamp?: Date;                   // ISO datetime
	truck_origin_location?: 'TLG' | 'RCL' | 'BOP';
	syncStatus?: string;
	serverId?: string;
	siteLocation?: string; // e.g. "PMC" / "Bosveld" / "Richards Bay"
	name?: string;
	registration?: string;
	user: string;
}