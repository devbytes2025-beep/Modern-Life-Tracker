import { User, AppData, TaskLog, JournalEntry, Todo, Expense, Task } from '../types';

// Use environment variable or default to local worker
const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8787/api";

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

class BackendService {
  private token: string | null = null;

  constructor() {
      this.token = localStorage.getItem('glasshabit_token');
  }

  // --- Helper: Secure Fetch ---
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
     if (!this.token) throw new Error("Not authenticated");

     const headers = {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${this.token}`,
         ...options.headers
     };

     const response = await fetch(`${API_URL}${endpoint}`, {
         ...options,
         headers
     });

     const data = await response.json();

     if (!response.ok) {
         if (response.status === 401) {
             // Token expired or invalid
             this.logout();
             throw new Error("Session expired. Please login again.");
         }
         throw new Error(data.error || 'API Request Failed');
     }

     return data;
  }

  // --- Auth Management ---

  // Check if user is logged in on app load
  async checkSession(): Promise<User | null> {
      if (!this.token) return null;
      try {
          // Verify token by fetching profile
          return await this.fetchWithAuth('/user/me');
      } catch (e) {
          console.error("Session check failed", e);
          this.logout();
          return null;
      }
  }

  subscribeToAuth(callback: (user: User | null) => void): () => void {
      // Run initial check
      this.checkSession().then(user => callback(user));
      
      // We don't have a real-time stream without Firebase/WebSockets, 
      // so this is a one-time check for this simple implementation.
      return () => {}; 
  }

  async register(userData: Partial<User> & { password?: string }, password?: string): Promise<User> {
      // Support both signatures for compatibility
      const pass = password || userData.password;
      if (!pass) throw new Error("Password is required");

      const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...userData, password: pass })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed");

      this.setSession(data.token, data.user);
      return data.user;
  }

  async login(username: string, password: string): Promise<User> {
      const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");

      this.setSession(data.token, data.user);
      return data.user;
  }

  async logout(): Promise<void> {
      this.token = null;
      localStorage.removeItem('glasshabit_token');
      localStorage.removeItem('glasshabit_user');
      // Force reload or callback could be handled by app context
  }

  private setSession(token: string, user: User) {
      this.token = token;
      localStorage.setItem('glasshabit_token', token);
      localStorage.setItem('glasshabit_user', JSON.stringify(user));
  }
  
  async resetPassword(email: string): Promise<void> {
      // Since we don't have an email server in this simple worker setup,
      // we'll simulate it or throw a feature not available error.
      // For a real app, integrate Mailgun/SendGrid here.
      throw new Error("Password reset via email is not configured in this demo environment. Please contact admin.");
  }
  
  async updateUser(updatedUser: User): Promise<User> {
      return await this.fetchWithAuth(`/user/me`, {
          method: 'PUT',
          body: JSON.stringify(updatedUser)
      });
  }

  async resetData(userId: string, secretKeyAnswer: string): Promise<boolean> {
     await this.fetchWithAuth(`/reset-data`, {
         method: 'POST',
         body: JSON.stringify({ secretKeyAnswer })
     });
     return true;
  }

  // --- Data Access ---

  async getData(userId: string): Promise<AppData> {
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
  
  async importData(userId: string, jsonData: string): Promise<void> {
      // Not implemented in this worker version yet, could iterate and add items
      // For now, let's just log
      console.log("Import not fully implemented in backend");
  }
}

export const backend = new BackendService();
