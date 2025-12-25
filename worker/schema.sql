DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
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

DROP TABLE IF EXISTS tasks;
CREATE TABLE IF NOT EXISTS tasks (
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

DROP TABLE IF EXISTS logs;
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  task_id TEXT,
  date TEXT,
  remark TEXT,
  images TEXT, -- Stored as JSON string
  completed BOOLEAN,
  timestamp INTEGER
);

DROP TABLE IF EXISTS todos;
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  text TEXT,
  due_date TEXT,
  completed BOOLEAN
);

DROP TABLE IF EXISTS expenses;
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  amount REAL,
  category TEXT,
  description TEXT,
  date TEXT
);

DROP TABLE IF EXISTS journal;
CREATE TABLE IF NOT EXISTS journal (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  subject TEXT,
  content TEXT,
  mood TEXT,
  images TEXT, -- Stored as JSON string
  date TEXT,
  timestamp INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal(user_id);
