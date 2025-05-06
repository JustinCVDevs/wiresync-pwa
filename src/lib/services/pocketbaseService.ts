import PocketBase from 'pocketbase';
import { indexedDBService } from './indexedDBService';
import type { Train } from '../types/train';
import type { Wagon } from '$lib/types/wagon';
import type { Sample } from '../types/sample';
import type { Assay } from '../types/assay';

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL; 
// make sure you have VITE_POCKETBASE_URL set in your .env

/**
 * A generic PocketBase wrapper for read/write operations.
 */
class PocketBaseService {
  private pb: PocketBase;

  constructor() {
    this.pb = new PocketBase(POCKETBASE_URL);
  }

  /** Fetch a paginated list from any collection */
  async list<T = any>(
    collection: string,
    query: Record<string, any> = {},
    expand: string[] = [],
    page = 1,
    perPage = 20
  ) {
    return this.pb
      .collection<T>(collection)
      .getList(page, perPage, {
        filter: Object.entries(query)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' && '),
        expand: expand.join(',')
      });
  }

  /** Fetch a single record by ID */
  async getOne<T = any>(
    collection: string,
    id: string,
    expand: string[] = []
  ) {
    return this.pb
      .collection<T>(collection)
      .getOne(id, { expand: expand.join(',') });
  }

  /** Create a new record */
  async create<T = any>(
    collection: string,
    data: Record<string, any>
  ) {
    return this.pb
      .collection<T>(collection)
      .create(data);
  }

  /** Update an existing record */
  async update<T = any>(
    collection: string,
    id: string,
    data: Record<string, any>
  ) {
    return this.pb
      .collection<T>(collection)
      .update(id, data);
  }

  /** Delete a record */
  async delete(
    collection: string,
    id: string
  ) {
    return this.pb
      .collection(collection)
      .delete(id);
  }

  /** Sync trains data with local IndexedDB */
  async syncTrains() {
      try {
          const response = await this.list<Train>('trains');
          await indexedDBService.saveTrains(response.items);
          return response.items;
      } catch (error) {
          console.error('Failed to sync trains:', error);
          // If offline or error, return local data
          return indexedDBService.getTrains();
      }
  }

  /** Sync wagons data with local IndexedDB */
  async syncWagons() {
      try {
          const response = await this.list<Wagon>('wagons');
          await indexedDBService.saveWagons(response.items);
          return response.items;
      } catch (error) {
          console.error('Failed to sync wagons:', error);
          // If offline or error, return local data
          return indexedDBService.getWagons();
      }
  }

  /** Sync samples data with local IndexedDB */
  async syncSamples() {
      try {
          const response = await this.list<Sample>('samples');
          await indexedDBService.saveSamples(response.items);
          return response.items;
      } catch (error) {
          console.error('Failed to sync samples:', error);
          // If offline or error, return local data
          return indexedDBService.getSamples();
      }
  }

  /** Sync assays data with local IndexedDB */
  async syncAssays() {
      try {
          const response = await this.list<Assay>('assays');
          await indexedDBService.saveAssays(response.items);
          return response.items;
      } catch (error) {
          console.error('Failed to sync assays:', error);
          // If offline or error, return local data
          return indexedDBService.getAssays();
      }
  }
}

export const pocketbaseService = new PocketBaseService();
