import { User, AppData, TaskLog, JournalEntry, Todo, Expense, Task } from '../types';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

// Use environment variable or default to local worker.
const RAW_API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8787/api";
const API_URL = RAW_API_URL.replace(/\/+$/, "");

const STORAGE_KEY = 'glasshabit_offline_data';

// --- Local Storage Fallback Implementation ---
class LocalStore {
    private getData(): AppData & { users: User[] } {
        const str = localStorage.getItem(STORAGE_KEY);
        if (!str) {
            const init = { users: [], tasks: [], logs: [], todos: [], expenses: [], journal: [] };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
            return init;
        }
        return JSON.parse(str);
    }

    private saveData(data: any) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    syncUser(user: User): User {
        const db = this.getData();
        const existing = db.users.find(u => u.id === user.id);
        if (!existing) {
            db.users.push(user);
            this.saveData(db);
            return user;
        }
        return existing;
    }

    updateUser(user: User): User {
        const db = this.getData();
        const idx = db.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            db.users[idx] = { ...db.users[idx], ...user };
            this.saveData(db);
            return db.users[idx];
        }
        return user;
    }

    getDataForUser(userId: string): AppData {
        const db = this.getData();
        return {
            tasks: db.tasks.filter(i => i.userId === userId),
            logs: db.logs.filter(i => i.taskId && db.tasks.find(t => t.id === i.taskId && t.userId === userId)),
            todos: db.todos.filter(i => i.userId === userId),
            expenses: db.expenses.filter(i => i.userId === userId),
            journal: db.journal.filter(i => i.userId === userId),
        };
    }

    addItem(collection: keyof AppData, item: any) {
        const db = this.getData();
        if (Array.isArray(db[collection])) {
            (db[collection] as any[]).push(item);
            this.saveData(db);
        }
        return item;
    }

    updateItem(collection: keyof AppData, item: any) {
        const db = this.getData();
        if (Array.isArray(db[collection])) {
            const idx = (db[collection] as any[]).findIndex(i => i.id === item.id);
            if (idx !== -1) {
                (db[collection] as any[])[idx] = item;
                this.saveData(db);
            }
        }
        return item;
    }

    deleteItem(collection: keyof AppData, id: string) {
        const db = this.getData();
        if (Array.isArray(db[collection])) {
            (db[collection] as any) = (db[collection] as any[]).filter(i => i.id !== id);
            this.saveData(db);
        }
    }
}

const localStore = new LocalStore();

class BackendService {
  private token: string | null = null;
  private currentUser: User | null = null;
  private offlineMode = false;

  constructor() {
      this.token = localStorage.getItem('glasshabit_token');
  }

  // --- Helper: Secure Fetch to Worker with Fallback ---
  private async fetchWorker(endpoint: string, options: RequestInit = {}) {
     // If we already failed once, stick to offline mode to avoid delays
     if (this.offlineMode) {
         return this.mockResponse(endpoint, options);
     }

     const uid = auth?.currentUser?.uid || this.token;
     if (!uid && !this.offlineMode) {
         // If no auth but trying to fetch, just return null or handle gracefully
         console.warn("No auth token available");
     }

     const headers = {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${uid}`,
         ...options.headers
     };

     const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

     try {
         const response = await fetch(`${API_URL}${safeEndpoint}`, {
             ...options,
             headers
         });

         const data = await response.json();

         if (!response.ok) {
             throw new Error(data.error || data.details || 'API Request Failed');
         }
         return data;
     } catch (err) {
         console.warn("Backend unavailable/unreachable. Switching to Offline Mode (LocalStorage).", err);
         this.offlineMode = true;
         return this.mockResponse(endpoint, options);
     }
  }

  // --- Local Simulation Logic ---
  private async mockResponse(endpoint: string, options: RequestInit) {
      const uid = auth?.currentUser?.uid || this.token || 'guest';
      const method = options.method || 'GET';
      const body = options.body ? JSON.parse(options.body as string) : null;
      
      // Simulate network delay for realism
      await new Promise(r => setTimeout(r, 300));

      // Router
      if (endpoint === '/user/sync' && method === 'POST') {
          return localStore.syncUser({ ...body, points: 0, theme: 'dark' });
      }
      if (endpoint === '/user/me' && method === 'PUT') {
          return localStore.updateUser(body);
      }
      if (endpoint === '/data' && method === 'GET') {
          return localStore.getDataForUser(uid);
      }
      
      // Generic CRUD Pattern: /collection or /collection/id
      const parts = endpoint.split('/').filter(p => p); // remove empty
      const collection = parts[0] as keyof AppData;
      const id = parts[1];

      if (['tasks', 'logs', 'todos', 'expenses', 'journal'].includes(collection)) {
          if (method === 'POST') return localStore.addItem(collection, body);
          if (method === 'PUT') return localStore.updateItem(collection, body);
          if (method === 'DELETE') {
              localStore.deleteItem(collection, id);
              return { success: true };
          }
      }
      
      return {};
  }

  // --- Auth Management (Firebase) ---

  subscribeToAuth(callback: (user: User | null) => void): () => void {
      if (!auth) {
          console.warn("Firebase Auth not initialized.");
          return () => {};
      }

      return onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
              this.token = firebaseUser.uid;
              localStorage.setItem('glasshabit_token', firebaseUser.uid);
              
              try {
                  const dbUser = await this.syncUserWithWorker(firebaseUser);
                  this.currentUser = dbUser;
                  callback(dbUser);
              } catch (e) {
                  // Even if sync fails (e.g. mockResponse error), fallback to mapping
                  console.error("Sync failed, using fallback user mapping", e);
                  const fallbackUser = this.mapFirebaseUser(firebaseUser);
                  callback(fallbackUser);
              }
          } else {
              this.token = null;
              this.currentUser = null;
              localStorage.removeItem('glasshabit_token');
              callback(null);
          }
      });
  }

  private async syncUserWithWorker(firebaseUser: FirebaseUser): Promise<User> {
      const userData = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || ''
      };
      
      // This will trigger fetchWorker -> mockResponse if offline
      return await this.fetchWorker('/user/sync', {
          method: 'POST',
          body: JSON.stringify(userData)
      });
  }

  private mapFirebaseUser(fUser: FirebaseUser): User {
      return {
          id: fUser.uid,
          username: fUser.displayName || 'User',
          email: fUser.email || '',
          points: 0,
          theme: 'dark',
          secretKeyAnswer: ''
      };
  }

  async login(email: string, pass: string): Promise<User> {
      if (!auth) throw new Error("Auth service unavailable");
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      return this.syncUserWithWorker(cred.user);
  }

  async register(data: { email: string; password?: string; username: string }, pass?: string): Promise<User> {
      if (!auth) throw new Error("Auth service unavailable");
      const password = pass || data.password;
      if (!password) throw new Error("Password required");

      const cred = await createUserWithEmailAndPassword(auth, data.email, password);
      await updateProfile(cred.user, { displayName: data.username });
      
      return this.syncUserWithWorker(cred.user);
  }

  async logout(): Promise<void> {
      if (auth) await signOut(auth);
      this.token = null;
      this.currentUser = null;
      localStorage.removeItem('glasshabit_token');
  }

  async resetPassword(email: string): Promise<void> {
      if (!auth) throw new Error("Auth service unavailable");
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
  }

  // --- Data Access ---

  async getData(userId: string): Promise<AppData> {
    return await this.fetchWorker(`/data`);
  }

  async updateUser(updatedUser: User): Promise<User> {
      if (auth?.currentUser && updatedUser.name) {
          await updateProfile(auth.currentUser, { displayName: updatedUser.name });
      }
      return await this.fetchWorker(`/user/me`, {
          method: 'PUT',
          body: JSON.stringify(updatedUser)
      });
  }

  async resetData(userId: string, secretKeyAnswer: string): Promise<boolean> {
     await this.fetchWorker(`/reset-data`, {
         method: 'POST',
         body: JSON.stringify({ secretKeyAnswer })
     });
     return true;
  }

  // --- Generic CRUD ---

  async addItem<T extends { id: string }>(userId: string, collectionName: keyof AppData, item: T): Promise<T> {
    return await this.fetchWorker(`/${collectionName}`, {
        method: 'POST',
        body: JSON.stringify(item)
    });
  }

  async updateItem<T extends { id: string }>(userId: string, collectionName: keyof AppData, item: T): Promise<T> {
    return await this.fetchWorker(`/${collectionName}/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(item)
    });
  }

  async deleteItem(userId: string, collectionName: keyof AppData, itemId: string): Promise<void> {
    await this.fetchWorker(`/${collectionName}/${itemId}`, {
        method: 'DELETE'
    });
  }
  
  async importData(userId: string, jsonData: string): Promise<void> {
      try {
          const parsed = JSON.parse(jsonData);
          // If offline, just load into local store
          if (this.offlineMode) {
              const current = localStore['getData'](); // Access private via casting or helper
              // Simplified merge
              const newData = { ...current, ...parsed };
              localStore['saveData'](newData);
          } else {
              console.log("Cloud import not fully implemented");
          }
      } catch (e) {
          console.error("Import error", e);
          throw new Error("Invalid Data");
      }
  }
}

export const backend = new BackendService();

export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};