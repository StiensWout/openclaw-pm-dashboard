import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/openclaw-pm.db');
const DATA_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Enable verbose mode in development
const sqlite = process.env.NODE_ENV === 'development' ? sqlite3.verbose() : sqlite3;

class Database {
  private static instance: Database;
  private db: sqlite3.Database;

  private constructor() {
    this.db = new sqlite.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        throw err;
      }
      console.log('Connected to SQLite database:', DB_PATH);
    });

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getDatabase(): sqlite3.Database {
    return this.db;
  }

  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create agents table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('frontend', 'backend', 'design', 'testing', 'deployment', 'coordination', 'analysis')),
            status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('active', 'idle', 'busy', 'offline', 'error')),
            capabilities TEXT, -- JSON array
            current_task TEXT,
            socket_id TEXT,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
            tasks_completed INTEGER DEFAULT 0,
            average_task_time REAL DEFAULT 0,
            success_rate REAL DEFAULT 100,
            last_task_completion_time DATETIME,
            error_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create projects table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled', 'on-hold')),
            priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            assigned_agents TEXT, -- JSON array of agent IDs
            tasks TEXT, -- JSON array of task IDs
            progress REAL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
            start_date DATETIME,
            due_date DATETIME,
            completed_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT -- JSON object
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create tasks table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled')),
            priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            assigned_agent_id TEXT,
            dependencies TEXT, -- JSON array of task IDs
            estimated_duration INTEGER, -- in minutes
            actual_duration INTEGER, -- in minutes
            started_at DATETIME,
            completed_at DATETIME,
            due_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT, -- JSON object
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_agent_id) REFERENCES agents (id) ON DELETE SET NULL
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create communications table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS communications (
            id TEXT PRIMARY KEY,
            from_agent_id TEXT,
            to_agent_id TEXT,
            type TEXT NOT NULL CHECK (type IN ('task_assignment', 'status_update', 'error_report', 'coordination', 'notification', 'user_message')),
            message TEXT NOT NULL,
            metadata TEXT, -- JSON object
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            read INTEGER DEFAULT 0,
            project_id TEXT,
            task_id TEXT,
            FOREIGN KEY (from_agent_id) REFERENCES agents (id) ON DELETE SET NULL,
            FOREIGN KEY (to_agent_id) REFERENCES agents (id) ON DELETE SET NULL,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
            FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create indexes for better performance
        this.db.run('CREATE INDEX IF NOT EXISTS idx_agents_status ON agents (status)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_agents_type ON agents (type)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent_id ON tasks (assigned_agent_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_communications_timestamp ON communications (timestamp)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_communications_type ON communications (type)');

        // Create triggers to update updated_at timestamp
        this.db.run(`
          CREATE TRIGGER IF NOT EXISTS agents_updated_at
          AFTER UPDATE ON agents
          BEGIN
            UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END
        `);

        this.db.run(`
          CREATE TRIGGER IF NOT EXISTS projects_updated_at
          AFTER UPDATE ON projects
          BEGIN
            UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END
        `);

        this.db.run(`
          CREATE TRIGGER IF NOT EXISTS tasks_updated_at
          AFTER UPDATE ON tasks
          BEGIN
            UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database tables initialized successfully');
            resolve();
          }
        });
      });
    });
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }

  // Utility methods for database operations
  public run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  public get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  public all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

export default Database;