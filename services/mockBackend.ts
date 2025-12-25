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
// Automatically use the Production URL from environment variables if available, otherwise localhost
// In Cloudflare Pages settings, add a variable: VITE_API_URL = https://your-worker.workers.dev/api
// Fix: Cast import.meta to any to avoid TypeScript error "Property 'env' does not exist on type 'ImportMeta'"
const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8787/api"; 

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

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

class CloudflareBackendService {

  // --- Helper: Secure Fetch ---
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
     const currentUser = auth.currentUser;
     if (!currentUser) throw new Error("Not authenticated");

     const token = await currentUser.getIdToken();
     
     const headers = {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`,
         ...options.headers
     };

     const response = await fetch(`${API_URL}${endpoint}`, {
         ...options,
         headers
     });

     const data = await response.json();

     if (!response.ok) {
         throw new Error(data.error || 'API Request Failed');
     }

     return data;
  }

  // --- Auth & User Management ---

  subscribeToAuth(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
          try {
              // Get User Profile from Cloudflare D1
              const token = await firebaseUser.getIdToken();
              const response = await fetch(`${API_URL}/user/me`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (response.ok) {
                  const userData = await response.json();
                  callback(userData);
              } else {
                  // User exists in Firebase but not in SQL (rare sync issue)
                  callback(null);
              }
          } catch (e) {
              console.error("Auth Sync Error:", e);
              callback(null);
          }
      } else {
        callback(null);
      }
    });
  }

  async register(userData: Omit<User, 'id' | 'theme' | 'points'>, password: string): Promise<User> {
    // 1. Create Auth User in Firebase
    let cred;
    try {
        cred = await createUserWithEmailAndPassword(auth, userData.email, password);
        await sendEmailVerification(cred.user);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("Email is already registered.");
        }
        throw error;
    }

    try {
        // 2. Create User in Cloudflare D1
        const token = await cred.user.getIdToken();
        const newUser: User = { 
            ...userData, 
            id: cred.user.uid, 
            theme: 'dark', 
            points: 0 
        };

        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newUser)
        });

        if (!response.ok) {
            const err = await response.json();
            // If DB fails, we should probably delete the firebase user to maintain consistency
            // but for now let's just throw
            throw new Error(err.error || "Failed to create user profile");
        }

        return newUser;
    } catch (dbError: any) {
        // Rollback Firebase user if DB creation fails (Optional but recommended)
        await cred.user.delete(); 
        if (dbError.message.includes("UNIQUE")) {
            throw new Error("Username is already taken.");
        }
        throw dbError;
    }
  }

  async login(usernameOrEmail: string, password: string): Promise<User> {
    try {
        let emailToUse = usernameOrEmail;
        
        // If username is provided, we need to fetch the email first.
        // However, Firebase Client SDK doesn't support searching users by custom claims easily.
        // We will call our API to resolve username -> email.
        if (!usernameOrEmail.includes('@')) {
            const response = await fetch(`${API_URL}/resolve-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameOrEmail })
            });
            
            if (!response.ok) throw new Error("Username not found");
            const data = await response.json();
            emailToUse = data.email;
        }

        const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
        
        // Fetch Profile
        const token = await cred.user.getIdToken();
        const response = await fetch(`${API_URL}/user/me`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });

        if(!response.ok) throw new Error("Failed to fetch profile");
        
        return await response.json();
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
      const currentUser = auth.currentUser;
      if (currentUser && updatedUser.email !== currentUser.email) {
          await updateEmail(currentUser, updatedUser.email);
      }

      // Sync to SQL
      return await this.fetchWithAuth(`/user/me`, {
          method: 'PUT',
          body: JSON.stringify(updatedUser)
      });
  }

  async resetData(userId: string, secretKeyAnswer: string): Promise<boolean> {
     // Verify secret key on server side
     await this.fetchWithAuth(`/reset-data`, {
         method: 'POST',
         body: JSON.stringify({ secretKeyAnswer })
     });
     return true;
  }

  // --- Data Access ---

  async getData(userId: string): Promise<AppData> {
    // This fetches all collections in one go from the worker
    return await this.fetchWithAuth(`/data`);
  }

  // --- Generic CRUD ---

  async addItem<T extends { id: string }>(userId: string, collectionName: keyof AppData, item: T): Promise<T> {
    return await this.fetchWithAuth(`/${collectionName}`, {
        method: 'POST',
        body: JSON.stringify(item)
    });
  }

  async updateItem<T extends { id: string }>(userId: string, collectionName: keyof AppData, item: T): Promise<T> {
    return await this.fetchWithAuth(`/${collectionName}/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(item)
    });
  }

  async deleteItem(userId: string, collectionName: keyof AppData, itemId: string): Promise<void> {
    await this.fetchWithAuth(`/${collectionName}/${itemId}`, {
        method: 'DELETE'
    });
  }
  
  async checkTaskCompletedToday(userId: string, taskId: string, date: string): Promise<boolean> {
      // Optimized to check on server
      const res = await this.fetchWithAuth(`/logs/check?taskId=${taskId}&date=${date}`);
      return res.completed;
  }
  
  async importData(userId: string, jsonData: string): Promise<void> {
      const parsed = JSON.parse(jsonData);
      await this.fetchWithAuth(`/import`, {
          method: 'POST',
          body: JSON.stringify(parsed)
      });
  }
}

export const backend = new CloudflareBackendService();