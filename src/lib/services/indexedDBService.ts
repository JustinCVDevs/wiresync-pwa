// Import required dependencies and type definitions
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Train } from '../types/train';
import type { Wagon } from '../types/wagon';
import type { Sample } from '../types/sample';
import type { Assay } from '../types/assay';

// Define the database schema with all collections
interface TrainDB extends DBSchema {
    trains: {
        key: string;
        value: Train;
    };
    wagons: {
        key: string;
        value: Wagon;
    };
    samples: {
        key: string;
        value: Sample;
    };
    assays: {
        key: string;
        value: Assay;
    };
}

/**
 * Service to handle all IndexedDB operations for offline data storage
 * Manages trains, wagons, samples, and assays data
 */
class IndexedDBService {
    private dbName = 'wiresync-db';
    private version = 1;
    private db: IDBPDatabase<TrainDB> | null = null;

    /**
     * Initialize the IndexedDB database and create object stores if they don't exist
     * This method is called automatically before any database operation
     */
    async initDB() {
        this.db = await openDB<TrainDB>(this.dbName, this.version, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('trains')) {
                    db.createObjectStore('trains', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('wagons')) {
                    db.createObjectStore('wagons', { keyPath: 'rfid' });
                }
                if (!db.objectStoreNames.contains('samples')) {
                    db.createObjectStore('samples', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('assays')) {
                    db.createObjectStore('assays', { keyPath: 'sampleId' });
                }
            },
        });
    }

    // Wagon-related operations
    /**
     * Save multiple wagons to IndexedDB
     * Creates or updates wagon records in a single transaction
     */
    async saveWagons(wagons: Wagon[]) {
        if (!this.db) await this.initDB();
        const tx = this.db!.transaction('wagons', 'readwrite');
        await Promise.all([
            ...wagons.map(wagon => tx.store.put(wagon)),
            tx.done
        ]);
    }

    /**
     * Retrieve all wagons from IndexedDB
     */
    async getWagons(): Promise<Wagon[]> {
        if (!this.db) await this.initDB();
        return this.db!.getAll('wagons');
    }

    /**
     * Filter and return wagons associated with a specific train
     */
    async getWagonsByTrainId(trainId: string): Promise<Wagon[]> {
        if (!this.db) await this.initDB();
        const allWagons = await this.getWagons();
        return allWagons.filter(wagon => wagon.trainId === trainId);
    }

    /**
     * Remove all wagon records from IndexedDB
     */
    async clearWagons() {
        if (!this.db) await this.initDB();
        const tx = this.db!.transaction('wagons', 'readwrite');
        await tx.store.clear();
        await tx.done;
    }

    // Train-related operations
    /**
     * Save multiple trains to IndexedDB
     * Creates or updates train records in a single transaction
     */
    async saveTrains(trains: Train[]) {
        if (!this.db) await this.initDB();
        const tx = this.db!.transaction('trains', 'readwrite');
        await Promise.all([
            ...trains.map(train => tx.store.put(train)),
            tx.done
        ]);
    }

    /**
     * Retrieve all trains from IndexedDB
     */
    async getTrains(): Promise<Train[]> {
        if (!this.db) await this.initDB();
        return this.db!.getAll('trains');
    }

    /**
     * Remove all train records from IndexedDB
     */
    async clearTrains() {
        if (!this.db) await this.initDB();
        const tx = this.db!.transaction('trains', 'readwrite');
        await tx.store.clear();
        await tx.done;
    }

    // Sample-related operations
    /**
     * Save multiple samples to IndexedDB
     * Creates or updates sample records in a single transaction
     */
    async saveSamples(samples: Sample[]) {
        if (!this.db) await this.initDB();
        const tx = this.db!.transaction('samples', 'readwrite');
        await Promise.all([
            ...samples.map(sample => tx.store.put(sample)),
            tx.done
        ]);
    }

    /**
     * Retrieve all samples from IndexedDB
     */
    async getSamples(): Promise<Sample[]> {
        if (!this.db) await this.initDB();
        return this.db!.getAll('samples');
    }

    /**
     * Remove all sample records from IndexedDB
     */
    async clearSamples() {
        if (!this.db) await this.initDB();
        const tx = this.db!.transaction('samples', 'readwrite');
        await tx.store.clear();
        await tx.done;
    }

    // Assay-related operations
    /**
     * Save multiple assays to IndexedDB
     * Creates or updates assay records in a single transaction
     */
    async saveAssays(assays: Assay[]) {
        if (!this.db) await this.initDB();
        const tx = this.db!.transaction('assays', 'readwrite');
        await Promise.all([
            ...assays.map(assay => tx.store.put(assay)),
            tx.done
        ]);
    }

    /**
     * Retrieve all assays from IndexedDB
     */
    async getAssays(): Promise<Assay[]> {
        if (!this.db) await this.initDB();
        return this.db!.getAll('assays');
    }

    /**
     * Retrieve a specific assay by its sample ID
     * Returns undefined if no matching assay is found
     */
    async getAssayBySampleId(sampleId: string): Promise<Assay | undefined> {
        if (!this.db) await this.initDB();
        return this.db!.get('assays', sampleId);
    }

    /**
     * Remove all assay records from IndexedDB
     */
    async clearAssays() {
        if (!this.db) await this.initDB();
        const tx = this.db!.transaction('assays', 'readwrite');
        await tx.store.clear();
        await tx.done;
    }
}

// Export a singleton instance of the service
export const indexedDBService = new IndexedDBService();