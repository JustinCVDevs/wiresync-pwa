import type { AnyDateTime } from "@internationalized/date";

export type ID = string;

export interface BaseRecord {
	id?: ID;
	created?: Date; // ISO 8601 timestamp
	updated?: string; // ISO 8601 timestamp
}
