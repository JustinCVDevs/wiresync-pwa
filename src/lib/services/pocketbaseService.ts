import PocketBase, {
	ClientResponseError,
	type AuthRecord,
	type RecordSubscription
} from 'pocketbase';
import { indexedDBService } from './indexedDBService';
import type { Train, Wagon, Sample, Assay, Consignment, TrainDispatch, TruckLoad } from '$lib';

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL;
// make sure you have VITE_POCKETBASE_URL set in your .env
type PBCollection =
	| 'trains'
	| 'wagons'
	| 'samples'
	| 'assays'
	| 'trucks'
	| 'consignments'
	| 'trainDispatches'
	| 'truckLoads';
// add others here...

type PBModelMap = {
	trains: Train;
	wagons: Wagon;
	samples: Sample;
	assays: Assay;
	trucks: { id: string; registration: string };
	consignments: Consignment;
	trainDispatches: TrainDispatch;
	truckLoads: TruckLoad;
	// add other mappings here...
};

/**
 * A generic PocketBase wrapper for read/write operations.
 */
class PocketBaseService {
	private static _instance: PocketBaseService;
	private pb: PocketBase;

	private constructor() {
		this.pb = new PocketBase(POCKETBASE_URL);
	}

	/** Singleton accessor */
	public static get instance() {
		if (!this._instance) {
			this._instance = new PocketBaseService();
		}
		return this._instance;
	}

	/** ── AUTH ───────────────────────────────────────────────────────────────── */
	get isAuthenticated(): boolean {
		return this.pb.authStore.isValid;
	}

	get currentUser(): AuthRecord | null {
		return this.pb.authStore.record;
	}

	async login(email: string, password: string): Promise<AuthRecord> {
		try {
			await this.pb.collection('users').authWithPassword(email, password);
			return this.currentUser!;
		} catch (e: any) {
			if (e instanceof ClientResponseError) {
				throw new Error(e.data.message);
			}
			throw e;
		}
	}

	logout() {
		this.pb.authStore.clear();
	}
	/** ── GENERIC CRUD ───────────────────────────────────────────────────────── */
	private buildFilter(query: Record<string, any>): string {
		return Object.entries(query)
			.map(([k, v]) => {
				if (Array.isArray(v)) {
					return `${k}~"${v.join(',')}"`;
				}
				if (typeof v === 'boolean' || typeof v === 'number') {
					return `${k}=${v}`;
				}
				return `${k}="${v}"`;
			})
			.join(' && ');
	}

	async list<K extends PBCollection>(
		collection: K,
		options: {
			query?: Partial<PBModelMap[K]>;
			expand?: (keyof PBModelMap[K])[];
			page?: number;
			perPage?: number;
		} = {}
	) {
		const { query = {}, expand = [], page = 1, perPage = 20 } = options;
		return this.pb.collection<PBModelMap[K]>(collection).getList(page, perPage, {
			filter: this.buildFilter(query),
			expand: expand.join(',') || undefined
		});
	}

	async getOne<K extends PBCollection>(
		collection: K,
		id: string,
		expand: (keyof PBModelMap[K])[] = []
	) {
		return this.pb.collection<PBModelMap[K]>(collection).getOne(id, { expand: expand.join(',') });
	}

	async create<K extends PBCollection>(collection: K, data: Partial<PBModelMap[K]>) {
		return this.pb.collection<PBModelMap[K]>(collection).create(data as Record<string, any>);
	}

	async update<K extends PBCollection>(collection: K, id: string, data: Partial<PBModelMap[K]>) {
		return this.pb.collection<PBModelMap[K]>(collection).update(id, data as Record<string, any>);
	}

	async delete<K extends PBCollection>(collection: K, id: string) {
		return this.pb.collection(collection).delete(id);
	}

	/** Subscribe to real-time changes */
	subscribe<K extends PBCollection>(
		collection: K,
		callback: (e: RecordSubscription<PBModelMap[K]>) => void
	) {
		return this.pb.collection(collection).subscribe('*', callback);
	}

	unsubscribe(subscription: { unsubscribe: () => void }) {
		subscription.unsubscribe();
	}
	/** ── SYNC HELPERS ───────────────────────────────────────────────────────── */
	private async syncHelper<K extends PBCollection>(
		collection: K,
		saveFn: (items: PBModelMap[K][]) => Promise<void>,
		getLocalFn: () => Promise<PBModelMap[K][]>
	): Promise<PBModelMap[K][]> {
		try {
			const { items } = await this.list(collection, { perPage: 1000 });
			await saveFn(items);
			return items;
		} catch {
			return getLocalFn();
		}
	}

	syncTrains() {
		return this.syncHelper('trains', indexedDBService.saveTrains, indexedDBService.getTrains);
	}

	syncWagons() {
		return this.syncHelper('wagons', indexedDBService.saveWagons, indexedDBService.getWagons);
	}

	syncSamples() {
		return this.syncHelper('samples', indexedDBService.saveSamples, indexedDBService.getSamples);
	}

	syncAssays() {
		return this.syncHelper('assays', indexedDBService.saveAssays, indexedDBService.getAssays);
	}
}

// Export the singleton
export const pocketbaseService = PocketBaseService.instance;
