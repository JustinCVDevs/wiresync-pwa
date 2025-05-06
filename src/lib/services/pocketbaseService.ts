import PocketBase from 'pocketbase';

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
}

export const pocketbaseService = new PocketBaseService();
