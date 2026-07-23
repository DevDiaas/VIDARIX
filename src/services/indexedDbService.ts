import { UserProfile, UserWatchlistItem, RouletteSpinHistory } from '../types';

const DB_NAME = 'vidarix-local-db';
const DB_VERSION = 1;

const STORES = {
  PROFILE: 'profile',
  AVATAR: 'avatar',
  WATCHLIST: 'watchlist',
  HISTORY: 'roulette_history',
};

export class IndexedDbService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          reject(new Error('IndexedDB não é suportado neste navegador.'));
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORES.PROFILE)) {
            db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.AVATAR)) {
            db.createObjectStore(STORES.AVATAR, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORES.WATCHLIST)) {
            db.createObjectStore(STORES.WATCHLIST, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.HISTORY)) {
            db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('Erro ao abrir IndexedDB:', request.error);
          reject(request.error);
        };
      });
    }
    return this.dbPromise;
  }

  // --- AVATAR ---
  public static async saveAvatar(dataUrl: string): Promise<string> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.AVATAR, 'readwrite');
        const store = tx.objectStore(STORES.AVATAR);
        const req = store.put({ key: 'user_avatar', dataUrl, updatedAt: Date.now() });
        req.onsuccess = () => resolve(dataUrl);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Erro IndexedDB saveAvatar, usando fallback local:', err);
      return dataUrl;
    }
  }

  public static async getAvatar(): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.AVATAR, 'readonly');
        const store = tx.objectStore(STORES.AVATAR);
        const req = store.get('user_avatar');
        req.onsuccess = () => {
          resolve(req.result ? req.result.dataUrl : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public static async removeAvatar(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.AVATAR, 'readwrite');
        const store = tx.objectStore(STORES.AVATAR);
        const req = store.delete('user_avatar');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // Soft fallback
    }
  }

  // --- WATCHLIST ---
  public static async getWatchlist(): Promise<UserWatchlistItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.WATCHLIST, 'readonly');
        const store = tx.objectStore(STORES.WATCHLIST);
        const req = store.getAll();
        req.onsuccess = () => {
          resolve(req.result || []);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public static async saveWatchlist(items: UserWatchlistItem[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORES.WATCHLIST, 'readwrite');
      const store = tx.objectStore(STORES.WATCHLIST);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
    } catch (err) {
      console.warn('Erro ao salvar watchlist no IndexedDB:', err);
    }
  }

  // --- ROULETTE HISTORY ---
  public static async getRouletteHistory(): Promise<RouletteSpinHistory[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.HISTORY, 'readonly');
        const store = tx.objectStore(STORES.HISTORY);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          // Sort descending date
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public static async saveRouletteHistory(items: RouletteSpinHistory[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORES.HISTORY, 'readwrite');
      const store = tx.objectStore(STORES.HISTORY);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
    } catch (err) {
      console.warn('Erro ao salvar histórico da roleta no IndexedDB:', err);
    }
  }

  // --- PROFILE ---
  public static async getProfile(): Promise<UserProfile | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.PROFILE, 'readonly');
        const store = tx.objectStore(STORES.PROFILE);
        const req = store.get('main_user_profile');
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public static async saveProfile(profile: UserProfile): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORES.PROFILE, 'readwrite');
      const store = tx.objectStore(STORES.PROFILE);
      store.put({ id: 'main_user_profile', data: profile, updatedAt: Date.now() });
    } catch (err) {
      console.warn('Erro ao salvar perfil no IndexedDB:', err);
    }
  }
}
