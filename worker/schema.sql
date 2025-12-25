DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS todos;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS journal;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  password TEXT,
  name TEXT,
  bio TEXT,
  avatar TEXT,
  dob TEXT,
  gender TEXT,
  securityQuestion TEXT,
  secretKeyAnswer TEXT,
  theme TEXT DEFAULT 'dark',
  points INTEGER DEFAULT 0,
  created_at INTEGER
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  reason TEXT,
  type TEXT,
  category TEXT,
  penalty TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT,
  is_deleted BOOLEAN DEFAULT 0
);

CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  task_id TEXT,
  date TEXT,
  remark TEXT,
  images TEXT, -- JSON array of base64 strings
  completed BOOLEAN,
  timestamp INTEGER
);

CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  text TEXT,
  due_date TEXT,
  completed BOOLEAN
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  amount REAL,
  category TEXT,
  description TEXT,
  date TEXT
);

CREATE TABLE journal (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  subject TEXT,
  content TEXT,
  mood TEXT,
  images TEXT, -- JSON array
  date TEXT,
  timestamp INTEGER
);

CREATE INDEX idx_logs_user ON logs(user_id);
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_todos_user ON todos(user_id);
CREATE INDEX idx_expenses_user ON expenses(user_id);
