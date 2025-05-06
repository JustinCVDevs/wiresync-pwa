import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Assay, Wagon, Sample, Train } from '$lib';

// Extend DBSchema to include queue store
interface AppDB extends DBSchema {
    trains: { key: string; value: Train };
    wagons: { key: string; value: Wagon };
    samples: { key: string; value: Sample };
    assays: { key: string; value: Assay };
    operationQueue: { key: string; value: any };
}

class IndexedDBService {
    private dbName = 'wiresync-db';
    private version = 2;
    private db: IDBPDatabase<AppDB> | null = null;

    private async initDB() {
        if (this.db) return;
        this.db = await openDB<AppDB>(this.dbName, this.version, {
            upgrade(db, oldVersion) {
                if (!db.objectStoreNames.contains('trains')) {
                    db.createObjectStore('trains', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('wagons')) {
                db.createObjectStore('wagons', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('samples')) {
                db.createObjectStore('samples', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('assays')) {
                db.createObjectStore('assays', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('operationQueue')) {
                db.createObjectStore('operationQueue', { keyPath: 'id' });
            }
        },
    });
  }

    // Generic record operations
    async saveRecord<K extends keyof AppDB>(store: K, record: AppDB[K]['value']) {
        await this.initDB();
        const tx = this.db!.transaction(store, 'readwrite');
        await tx.store.put(record);
        await tx.done;
    }

    async updateRecord<K extends keyof AppDB>(
        store: K,
        key: AppDB[K]['key'],
        updates: Partial<AppDB[K]['value']>
    ) {
        await this.initDB();
        const tx = this.db!.transaction(store, 'readwrite');
        const existing = await tx.store.get(key as any);
        if (existing) {
            const merged = { ...existing, ...updates };
            await tx.store.put(merged as any);
    }
      await tx.done;
  }

    async deleteRecord<K extends keyof AppDB>(store: K, key: AppDB[K]['key']) {
        await this.initDB();
        const tx = this.db!.transaction(store, 'readwrite');
        await tx.store.delete(key as any);
        await tx.done;
    }

    async addItem<K extends keyof AppDB>(store: K, item: AppDB[K]['value']) {
        await this.initDB();
        const tx = this.db!.transaction(store, 'readwrite');
        await tx.store.put(item);
        await tx.done;
    }

    async getAllItems<K extends keyof AppDB>(store: K): Promise<AppDB[K]['value'][]> {
        await this.initDB();
        return this.db!.getAll(store as any) as Promise<T[]>;
    }

    async deleteItem<K extends keyof AppDB>(store: K, key: AppDB[K]['key']) {
        await this.initDB();
        const tx = this.db!.transaction(store, 'readwrite');
        await tx.store.delete(key as any);
        await tx.done;
    }

    // Domain-specific batch operations
    async saveTrains(trains: Train[]) {
        const tx = (await this.initDB(), this.db)!.transaction('trains', 'readwrite');
        trains.forEach(train => tx.store.put(train));
        await tx.done;
    }
    async getTrains(): Promise<Train[]> {
        await this.initDB(); return this.db!.getAll('trains');
    }
    async clearTrains() { const tx = (await this.initDB(), this.db)!.transaction('trains', 'readwrite'); await tx.store.clear(); await tx.done; }

    async saveWagons(wagons: Wagon[]) {
        const tx = (await this.initDB(), this.db)!.transaction('wagons', 'readwrite');
        wagons.forEach(w => tx.store.put(w)); await tx.done;
    }
    async getWagons(): Promise<Wagon[]> { await this.initDB(); return this.db!.getAll('wagons'); }
    async clearWagons() { const tx = (await this.initDB(), this.db)!.transaction('wagons', 'readwrite'); await tx.store.clear(); await tx.done; }

    async saveSamples(samples: Sample[]) {
        const tx = (await this.initDB(), this.db)!.transaction('samples', 'readwrite'); samples.forEach(s => tx.store.put(s)); await tx.done;
    }
    async getSamples(): Promise<Sample[]> { await this.initDB(); return this.db!.getAll('samples'); }
    async clearSamples() { const tx = (await this.initDB(), this.db)!.transaction('samples', 'readwrite'); await tx.store.clear(); await tx.done; }

    async saveAssays(assays: Assay[]) {
        const tx = (await this.initDB(), this.db)!.transaction('assays', 'readwrite'); assays.forEach(a => tx.store.put(a)); await tx.done;
    }
    async getAssays(): Promise<Assay[]> { await this.initDB(); return this.db!.getAll('assays'); }
    async getAssayById(id: string): Promise<Assay | undefined> { await this.initDB(); return this.db!.get('assays', id); }
    async clearAssays() { const tx = (await this.initDB(), this.db)!.transaction('assays', 'readwrite'); await tx.store.clear(); await tx.done; }
}

export const indexedDBService = new IndexedDBService();
