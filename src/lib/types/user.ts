import type { BaseRecord } from "./baserecord";

export interface User extends BaseRecord {
	id: string;
	email: string;
    password: string;
    passwordConfirm: string;
    verified: boolean;
	name: string;
    allowedLocations: string[];
    isActive: boolean;
};