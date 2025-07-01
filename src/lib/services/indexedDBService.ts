import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
	Assay,
	Wagon,
	Sample,
	Train,
	BaseRecord,
	Truck,
	Consignment,
	TrainDispatch,
	TruckLoad,
	ShuntingTrain, 
	TruckArrival,
	TrainArrival
} from '$lib';

// concretely list your stores so TS sees them as literals
const STORE_NAMES = [
	'trains',
	'wagons',
	'samples',
	'assays',
	'operationQueue',
	'tags',
	'trucks',
	'consignments',
	'trainDispatches',
	'truckLoads',
	'shuntingTrains',
	'truckArrivals',
	'trainArrivals'
] as const;
type StoreName = (typeof STORE_NAMES)[number];

interface AppDB extends DBSchema {
	trains: { key: string; value: Train };
	wagons: { key: string; value: Wagon };
	samples: { key: string; value: Sample };
	assays: { key: string; value: Assay };
	operationQueue: { key: string; value: any };
	tags: { key: string; value: Tag };
	trucks: { key: string; value: Truck };
	consignments: { key: string; value: Consignment };
	trainDispatches: { key: string; value: TrainDispatch };
	truckLoads: { key: string; value: TruckLoad };
	shuntingTrains: { key: string; value: ShuntingTrain };
	truckArrivals: { key: string; value: TruckArrival };
	trainArrivals: { key: string; value: TrainArrival };
}
interface Tag extends BaseRecord {
	id: string;
	asset_name: string;
}
class IndexedDBService {
	private dbName = 'wiresync-db';
	private version = 10; // Increment version to trigger upgrade
	private db: IDBPDatabase<AppDB> | null = null;

	private async initDB(): Promise<void> {
		if (this.db) return;
		this.db = await openDB<AppDB>(this.dbName, this.version, {
			upgrade(db) {
				STORE_NAMES.forEach((store) => {
					if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
				});
			}
		});
	}

	// --- GENERIC CRUD ---
	async saveRecord<K extends StoreName>(store: K, record: AppDB[K]['value']): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction(store, 'readwrite');
		tx.store.put(record);
		await tx.done;
	}

	async getRecord<K extends StoreName>(
		store: K,
		key: AppDB[K]['key']
	): Promise<AppDB[K]['value'] | undefined> {
		await this.initDB();
		const tx = this.db!.transaction(store, 'readonly');
		const result = await tx.store.get(key);
		await tx.done;
		return result;
	}

	/**
	 * Get records from a store filtered by an optional predicate.
	 */
	async getRecords<K extends StoreName>(
		store: K,
		predicate?: (record: AppDB[K]['value']) => boolean
	): Promise<AppDB[K]['value'][]> {
		// Fetch all and then apply filter
		const all = await this.getAllRecords(store);
		return predicate ? all.filter(predicate) : all;
	}

	async getAllRecords<K extends StoreName>(store: K): Promise<AppDB[K]['value'][]> {
		await this.initDB();
		const tx = this.db!.transaction(store, 'readonly');
		const all = await tx.store.getAll();
		await tx.done;
		return all;
	}

	async updateRecord<K extends StoreName>(
		store: K,
		key: AppDB[K]['key'],
		updates: Partial<AppDB[K]['value']>
	): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction(store, 'readwrite');
		const existing = await tx.store.get(key);
		if (existing) {
			tx.store.put({ ...existing, ...updates } as AppDB[K]['value']);
		}
		await tx.done;
	}

	async deleteRecord<K extends StoreName>(store: K, key: AppDB[K]['key']): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction(store, 'readwrite');
		tx.store.delete(key);
		await tx.done;
	}

	async clearStore<K extends StoreName>(store: K): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction(store, 'readwrite');
		tx.store.clear();
		await tx.done;
	}

	// --- DOMAIN-SPECIFIC ---
	async saveTrains(trains: Train[]): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction('trains', 'readwrite');
		trains.forEach((t) => tx.store.put(t));
		await tx.done;
	}
	async getTrains(): Promise<Train[]> {
		return this.getAllRecords('trains');
	}
	async clearTrains(): Promise<void> {
		await this.clearStore('trains');
	}
	async getTagById(tagId: string): Promise<Tag | undefined> {
		return this.getRecord('tags', tagId);
		throw new Error('Method not implemented.');
	}
	async saveWagons(wagons: Wagon[]): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction('wagons', 'readwrite');
		wagons.forEach((w) => tx.store.put(w));
		await tx.done;
	}
	async getWagons(): Promise<Wagon[]> {
		return this.getAllRecords('wagons');
	}
	async clearWagons(): Promise<void> {
		await this.clearStore('wagons');
	}

	async saveSamples(samples: Sample[]): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction('samples', 'readwrite');
		samples.forEach((s) => tx.store.put(s));
		await tx.done;
	}
	async getSamples(): Promise<Sample[]> {
		return this.getAllRecords('samples');
	}
	async clearSamples(): Promise<void> {
		await this.clearStore('samples');
	}

	async saveAssays(assays: Assay[]): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction('assays', 'readwrite');
		assays.forEach((a) => tx.store.put(a));
		await tx.done;
	}
	async getAssays(): Promise<Assay[]> {
		return this.getAllRecords('assays');
	}
	async getAssayById(id: string): Promise<Assay | undefined> {
		return this.getRecord('assays', id);
	}
	async clearAssays(): Promise<void> {
		await this.clearStore('assays');
	}

	// Add these new methods
	async saveTrainDispatches(dispatches: TrainDispatch[]): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction('trainDispatches', 'readwrite');
		dispatches.forEach((d) => tx.store.put(d));
		await tx.done;
	}

	async getTrainDispatches(): Promise<TrainDispatch[]> {
		return this.getAllRecords('trainDispatches');
	}

	async clearTrainDispatches(): Promise<void> {
		await this.clearStore('trainDispatches');
	}
	async saveShuntingTrains(shuntingTrains: ShuntingTrain[]): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction('shuntingTrains', 'readwrite');
		shuntingTrains.forEach((st) => tx.store.put(st));
		await tx.done;
	}
	async getShuntingTrains(): Promise<ShuntingTrain[]> {
		return this.getAllRecords('shuntingTrains');
	}
	async clearShuntingTrains(): Promise<void> {
		await this.clearStore('shuntingTrains');
	}
	async saveTruckArrivals(truckArrivals: TruckArrival[]): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction('truckArrivals', 'readwrite');
		truckArrivals.forEach((ta) => tx.store.put(ta));
		await tx.done;
	}
	async getTruckArrivals(): Promise<TruckArrival[]> {
		return this.getAllRecords('truckArrivals');
	}
	async clearTruckArrivals(): Promise<void> {
		await this.clearStore('truckArrivals');
	}
	async saveTrainArrivals(trainArrivals: TrainArrival[]): Promise<void> {
		await this.initDB();
		const tx = this.db!.transaction('trainArrivals', 'readwrite');
		trainArrivals.forEach((ta) => tx.store.put(ta));
		await tx.done;
	}
	async getTrainArrivals(): Promise<TrainArrival[]> {
		return this.getAllRecords('trainArrivals');
	}
	async clearTrainArrivals(): Promise<void> {
		await this.clearStore('trainArrivals');
	}
}

export const indexedDBService = new IndexedDBService();
