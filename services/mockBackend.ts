import { User, Task, TaskLog, Todo, Expense, JournalEntry, AppData } from '../types';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
  updateEmail,
  sendEmailVerification,
  User as FirebaseUser
} from "firebase/auth";

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCxz9DyLfrdh21laP3H2OwPqLQSBfZl25I",
  authDomain: "life-tracker-71b6a.firebaseapp.com",
  projectId: "life-tracker-71b6a",
  storageBucket: "life-tracker-71b6a.firebasestorage.app",
  messagingSenderId: "895144544294",
  appId: "1:895144544294:web:3a9a1964f4daf7d1383ee7",
  measurementId: "G-E32X53PLHC"
};

// Initialize Firebase (Auth Only)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// --- UUID Polyfill ---
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- Local Database Simulator (Replacing Firestore) ---
// In a real scenario, this class would make fetch() calls to your MongoDB/SQL API.
class LocalStorageDB {
    private USERS_INDEX_KEY = 'gh_db_users_index'; // Maps username -> userId, email -> userId
    private DATA_PREFIX = 'gh_db_data_';

    constructor() {
        if (!localStorage.getItem(this.USERS_INDEX_KEY)) {
            localStorage.setItem(this.USERS_INDEX_KEY, JSON.stringify({ usernames: {}, emails: {} }));
        }
    }

    private getIndex() {
        return JSON.parse(localStorage.getItem(this.USERS_INDEX_KEY) || '{ "usernames": {}, "emails": {} }');
    }

    private saveIndex(index: any) {
        localStorage.setItem(this.USERS_INDEX_KEY, JSON.stringify(index));
    }

    // Check if username is taken
    isUsernameTaken(username: string): boolean {
        const index = this.getIndex();
        return !!index.usernames[username.toLowerCase()];
    }

    // Register user in local DB
    createUser(userId: string, userData: User) {
        const index = this.getIndex();
        const lowerUser = userData.username.toLowerCase();
        
        if (index.usernames[lowerUser]) {
            throw new Error("Username already taken locally");
        }

        // Update Index
        index.usernames[lowerUser] = userId;
        index.emails[userData.email] = userId;
        this.saveIndex(index);

        // Save User Profile
        const initialData: AppData & { user: User } = {
            user: userData,
            tasks: [],
            logs: [],
            todos: [],
            expenses: [],
            journal: []
        };
        this.saveUserDB(userId, initialData);
    }

    // Get entire DB for user
    getUserDB(userId: string): AppData & { user: User } | null {
        const data = localStorage.getItem(this.DATA_PREFIX + userId);
        return data ? JSON.parse(data) : null;
    }

    // Save entire DB for user
    saveUserDB(userId: string, data: AppData & { user: User }) {
        localStorage.setItem(this.DATA_PREFIX + userId, JSON.stringify(data));
    }

    // Update just the user profile
    updateUserProfile(userId: string, updates: Partial<User>) {
        const db = this.getUserDB(userId);
        if (!db) throw new Error("Database not found for user");
        
        // Handle Email Change in Index
        if (updates.email && updates.email !== db.user.email) {
            const index = this.getIndex();
            delete index.emails[db.user.email]; // Remove old
            index.emails[updates.email] = userId; // Add new
            this.saveIndex(index);
        }

        db.user = { ...db.user, ...updates };
        this.saveUserDB(userId, db);
        return db.user;
    }
}

const localDB = new LocalStorageDB();


class BackendService {

  // --- Auth ---

  subscribeToAuth(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
          // Fetch user data from LocalDB using the Firebase UID
          const dbData = localDB.getUserDB(firebaseUser.uid);
          if (dbData) {
              callback(dbData.user);
          } else {
              // Fallback if auth exists but local DB is wiped
              callback(null);
          }
      } else {
        callback(null);
      }
    });
  }

  async register(userData: Omit<User, 'id' | 'theme' | 'points'>, password: string): Promise<User> {
    
    // 1. Pre-check username uniqueness in our DB
    if (localDB.isUsernameTaken(userData.username)) {
        throw new Error("Username is already taken. Please choose another.");
    }

    try {
        // 2. Create Auth User in Firebase
        const cred = await createUserWithEmailAndPassword(auth, userData.email, password);
        const uid = cred.user.uid;

        // 3. Send Verification Email
        await sendEmailVerification(cred.user);

        const newUser: User = { 
            ...userData, 
            id: uid, 
            theme: 'dark', 
            points: 0 
        };

        // 4. Create User in Local DB (MongoDB simulation)
        localDB.createUser(uid, newUser);

        return newUser;
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("Email is already registered with another account.");
        }
        throw error;
    }
  }

  async login(usernameOrEmail: string, password: string): Promise<User> {
    try {
        // We only support Email login with Firebase directly for security
        // But we can look up email via username if we had a server. 
        // With LocalDB, we can find the email if a username is provided.
        
        let emailToUse = usernameOrEmail;
        const isEmail = usernameOrEmail.includes('@');

        if (!isEmail) {
            // Lookup email from username
            const index = JSON.parse(localStorage.getItem('gh_db_users_index') || '{}');
            const userId = index.usernames?.[usernameOrEmail.toLowerCase()];
            if (userId) {
                const db = localDB.getUserDB(userId);
                if (db) emailToUse = db.user.email;
            } else {
                throw new Error("Username not found.");
            }
        }

        const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
        
        // Fetch Profile from Data Store
        const dbData = localDB.getUserDB(cred.user.uid);
        if (!dbData) throw new Error("User profile corrupted or missing.");
        
        return dbData.user;
    } catch (error: any) {
        console.error(error);
        if(error.message.includes("Username")) throw error;
        throw new Error("Invalid credentials");
    }
  }

  async logout(): Promise<void> {
      await signOut(auth);
  }
  
  async resetPassword(email: string): Promise<void> {
      await sendPasswordResetEmail(auth, email);
  }
  
  async updateUser(updatedUser: User): Promise<User> {
      // If email changed, update Firebase Auth too
      const currentUser = auth.currentUser;
      if (currentUser && updatedUser.email !== currentUser.email) {
          await updateEmail(currentUser, updatedUser.email);
      }

      return localDB.updateUserProfile(updatedUser.id, updatedUser);
  }

  async resetData(userId: string, secretKeyAnswer: string): Promise<boolean> {
    const db = localDB.getUserDB(userId);
    if (!db || db.user.secretKeyAnswer !== secretKeyAnswer) {
      throw new Error("Invalid Secret Key");
    }

    // Reset arrays but keep user profile
    db.tasks = [];
    db.logs = [];
    db.todos = [];
    db.expenses = [];
    db.journal = [];
    db.user.points = 0;
    
    localDB.saveUserDB(userId, db);
    return true;
  }

  // --- Data Access (Simulating MongoDB calls) ---

  async getData(userId: string): Promise<AppData> {
    const db = localDB.getUserDB(userId);
    if (!db) throw new Error("Database not initialized");
    
    // Return clean copies
    return {
        tasks: db.tasks || [],
        logs: db.logs || [],
        todos: db.todos || [],
        expenses: db.expenses || [],
        journal: db.journal || []
    };
  }

  // --- Generic CRUD helpers ---

  async addItem<T extends { id: string }>(userId: string, collectionName: keyof AppData, item: T): Promise<T> {
    const db = localDB.getUserDB(userId);
    if (!db) throw new Error("DB Error");

    const collection = db[collectionName] as unknown as T[];
    collection.push(item);
    localDB.saveUserDB(userId, db);
    return item;
  }

  async updateItem<T extends { id: string }>(userId: string, collectionName: keyof AppData, item: T): Promise<T> {
    const db = localDB.getUserDB(userId);
    if (!db) throw new Error("DB Error");

    const collection = db[collectionName] as unknown as T[];
    const index = collection.findIndex(i => i.id === item.id);
    if (index !== -1) {
        collection[index] = item;
        localDB.saveUserDB(userId, db);
    }
    return item;
  }

  async deleteItem(userId: string, collectionName: keyof AppData, itemId: string): Promise<void> {
    const db = localDB.getUserDB(userId);
    if (!db) throw new Error("DB Error");

    const collection = db[collectionName] as any[];
    db[collectionName] = collection.filter(i => i.id !== itemId) as any;
    localDB.saveUserDB(userId, db);
  }
  
  async checkTaskCompletedToday(userId: string, taskId: string, date: string): Promise<boolean> {
      const db = localDB.getUserDB(userId);
      if(!db) return false;
      return db.logs.some(l => l.taskId === taskId && l.date === date && l.completed);
  }
  
  async importData(userId: string, jsonData: string): Promise<void> {
      try {
          const parsed: AppData = JSON.parse(jsonData);
          const db = localDB.getUserDB(userId);
          if(!db) throw new Error("User not found");

          // Merge data
          db.tasks = [...db.tasks, ...parsed.tasks];
          db.todos = [...db.todos, ...parsed.todos];
          db.expenses = [...db.expenses, ...parsed.expenses];
          db.journal = [...db.journal, ...parsed.journal];
          db.logs = [...db.logs, ...parsed.logs];

          // Deduplicate based on IDs
          db.tasks = Array.from(new Map(db.tasks.map(item => [item.id, item])).values());
          db.todos = Array.from(new Map(db.todos.map(item => [item.id, item])).values());
          // ... (others if needed)
          
          localDB.saveUserDB(userId, db);

      } catch (e) {
          console.error(e);
          throw new Error("Import failed");
      }
  }
}

export const backend = new BackendService();