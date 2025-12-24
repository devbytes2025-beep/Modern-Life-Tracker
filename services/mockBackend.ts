import { User, Task, TaskLog, Todo, Expense, JournalEntry, AppData } from '../types';

// This service simulates a secure backend by managing data in an async manner.
// In a real production app, you would replace these methods with Firebase SDK calls.

const DELAY = 400; // Simulated network latency

// Helper to simulate async network request
const simulateNetwork = <T>(data: T): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, DELAY);
  });
};

class MockBackendService {
  private getStorage(): { users: User[], data: Record<string, AppData> } {
    const stored = localStorage.getItem('glasshabit_db');
    return stored ? JSON.parse(stored) : { users: [], data: {} };
  }

  private saveStorage(db: { users: User[], data: Record<string, AppData> }) {
    localStorage.setItem('glasshabit_db', JSON.stringify(db));
  }

  // --- Auth ---

  async register(user: Omit<User, 'id' | 'theme' | 'points'>): Promise<User> {
    const db = this.getStorage();
    if (db.users.find(u => u.username === user.username)) {
      throw new Error("Username already exists");
    }
    const newUser: User = { ...user, id: crypto.randomUUID(), theme: 'dark', points: 0 };
    db.users.push(newUser);
    db.data[newUser.id] = { tasks: [], logs: [], todos: [], expenses: [], journal: [] };
    this.saveStorage(db);
    return simulateNetwork(newUser);
  }

  async login(username: string, password: string): Promise<User> {
    // In real app, password would be hashed. simulating check.
    const db = this.getStorage();
    // Simplified login for mock (assuming password check passed in real auth)
    const user = db.users.find(u => u.username === username);
    if (!user) throw new Error("User not found");
    // Password check logic would be here
    return simulateNetwork(user);
  }
  
  async updateUser(updatedUser: User): Promise<User> {
      const db = this.getStorage();
      const index = db.users.findIndex(u => u.id === updatedUser.id);
      if (index === -1) throw new Error("User not found");
      
      db.users[index] = updatedUser;
      this.saveStorage(db);
      return simulateNetwork(updatedUser);
  }

  async resetData(userId: string, secretKeyAnswer: string): Promise<boolean> {
    const db = this.getStorage();
    const user = db.users.find(u => u.id === userId);
    if (!user || user.secretKeyAnswer !== secretKeyAnswer) {
      throw new Error("Invalid Secret Key");
    }
    db.data[userId] = { tasks: [], logs: [], todos: [], expenses: [], journal: [] };
    this.saveStorage(db);
    return simulateNetwork(true);
  }

  // --- Data Access ---

  async getData(userId: string): Promise<AppData> {
    const db = this.getStorage();
    return simulateNetwork(db.data[userId] || { tasks: [], logs: [], todos: [], expenses: [], journal: [] });
  }

  // --- Generic CRUD helpers for specific collections ---

  async addItem<T>(userId: string, collection: keyof AppData, item: T): Promise<T> {
    const db = this.getStorage();
    if (!db.data[userId]) db.data[userId] = { tasks: [], logs: [], todos: [], expenses: [], journal: [] };
    (db.data[userId][collection] as unknown as T[]).push(item);
    this.saveStorage(db);
    return simulateNetwork(item);
  }

  async updateItem<T extends { id: string }>(userId: string, collection: keyof AppData, item: T): Promise<T> {
    const db = this.getStorage();
    const list = db.data[userId][collection] as unknown as T[];
    const index = list.findIndex(i => i.id === item.id);
    if (index !== -1) {
      list[index] = item;
      this.saveStorage(db);
    }
    return simulateNetwork(item);
  }

  async deleteItem(userId: string, collection: keyof AppData, itemId: string): Promise<void> {
    const db = this.getStorage();
    const list = db.data[userId][collection] as any[];
    db.data[userId][collection] = list.filter(i => i.id !== itemId) as any;
    this.saveStorage(db);
    return simulateNetwork(undefined);
  }
  
  // Specific complex checks
  async checkTaskCompletedToday(userId: string, taskId: string, date: string): Promise<boolean> {
    const db = this.getStorage();
    const logs = db.data[userId]?.logs || [];
    return simulateNetwork(logs.some(l => l.taskId === taskId && l.date === date && l.completed));
  }
  
  async importData(userId: string, jsonData: string): Promise<void> {
      try {
          const parsed = JSON.parse(jsonData);
          // Basic validation
          if (!parsed.tasks || !parsed.expenses) throw new Error("Invalid data format");
          
          const db = this.getStorage();
          db.data[userId] = parsed;
          this.saveStorage(db);
          return simulateNetwork(undefined);
      } catch (e) {
          throw new Error("Import failed");
      }
  }
}

export const backend = new MockBackendService();
