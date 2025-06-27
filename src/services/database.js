// src/services/database.js - Updated for Multiple Auth Providers
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

class Database {
  constructor() {
    this.db = null;
    this.initializeDatabase();
  }

  async initializeDatabase() {
    // Ensure database directory exists
    const dbDir = path.join(__dirname, "../../database");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create database connection
    const dbPath = path.join(dbDir, "cloudtransfer.db");
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error opening database:", err.message);
      } else {
        console.log("📊 Connected to SQLite database");
        this.createTables();
      }
    });
  }

  createTables() {
    // Main users table - provider-agnostic
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        display_name TEXT,
        avatar_url TEXT,
        subscription_tier TEXT DEFAULT 'free',
        usage_quota INTEGER DEFAULT 1073741824,
        usage_current INTEGER DEFAULT 0,
        email_verified BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Authentication providers table - supports multiple auth methods per user
    const createAuthProvidersTable = `
      CREATE TABLE IF NOT EXISTS user_auth_providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider_type TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        provider_email TEXT,
        provider_data TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at DATETIME,
        password_hash TEXT,
        is_primary BOOLEAN DEFAULT 0,
        is_verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(provider_type, provider_id),
        UNIQUE(provider_type, provider_email)
      )
    `;

    // Sessions table for JWT and OAuth session management
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        provider_type TEXT NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        user_agent TEXT,
        expires_at DATETIME NOT NULL,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // Cloud accounts table (unchanged - already well designed)
    const createCloudAccountsTable = `
      CREATE TABLE IF NOT EXISTS cloud_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        account_name TEXT NOT NULL,
        encrypted_credentials TEXT NOT NULL,
        connection_status TEXT DEFAULT 'pending',
        last_sync DATETIME,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, account_name)
      )
    `;

    // Transfers table (unchanged)
    const createTransfersTable = `
      CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        source_account_id INTEGER NOT NULL,
        destination_account_id INTEGER NOT NULL,
        source_path TEXT NOT NULL,
        destination_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        status TEXT DEFAULT 'queued',
        progress INTEGER DEFAULT 0,
        transferred_bytes INTEGER DEFAULT 0,
        transfer_speed INTEGER DEFAULT 0,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        priority INTEGER DEFAULT 0,
        scheduled_at DATETIME,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (source_account_id) REFERENCES cloud_accounts(id),
        FOREIGN KEY (destination_account_id) REFERENCES cloud_accounts(id)
      )
    `;

    // Create indexes for better performance
    const createIndexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
      "CREATE INDEX IF NOT EXISTS idx_auth_providers_user_id ON user_auth_providers(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_auth_providers_type_id ON user_auth_providers(provider_type, provider_id)",
      "CREATE INDEX IF NOT EXISTS idx_auth_providers_email ON user_auth_providers(provider_email)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)",
      "CREATE INDEX IF NOT EXISTS idx_cloud_accounts_user_id ON cloud_accounts(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status)",
      "CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at)",
    ];

    // Execute table creation
    this.db.serialize(() => {
      this.db.run(createUsersTable);
      this.db.run(createAuthProvidersTable);
      this.db.run(createSessionsTable);
      this.db.run(createCloudAccountsTable);
      this.db.run(createTransfersTable);

      // Create indexes
      createIndexes.forEach((indexSQL) => {
        this.db.run(indexSQL);
      });

      console.log(
        "✅ Database tables created successfully with multi-auth support"
      );
    });
  }

  // User management methods - updated for multi-auth
  async createUser(
    email,
    displayName = null,
    firstName = null,
    lastName = null,
    avatarUrl = null
  ) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO users (email, display_name, first_name, last_name, avatar_url)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        [email, displayName, firstName, lastName, avatarUrl],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  // Create or update auth provider for user
  async createAuthProvider(
    userId,
    providerType,
    providerId,
    providerData = {}
  ) {
    return new Promise((resolve, reject) => {
      const {
        email,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        passwordHash,
        isPrimary = false,
        isVerified = true,
      } = providerData;

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_auth_providers 
        (user_id, provider_type, provider_id, provider_email, provider_data, 
         access_token, refresh_token, token_expires_at, password_hash, is_primary, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        [
          userId,
          providerType,
          providerId,
          email,
          JSON.stringify(providerData),
          accessToken,
          refreshToken,
          tokenExpiresAt,
          passwordHash,
          isPrimary,
          isVerified,
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  // Find user by email (works across all providers)
  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // Find user by provider (Google ID, Okta ID, etc.)
  async getUserByProvider(providerType, providerId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT u.*, ap.provider_type, ap.provider_id, ap.access_token, ap.refresh_token
        FROM users u
        JOIN user_auth_providers ap ON u.id = ap.user_id
        WHERE ap.provider_type = ? AND ap.provider_id = ?
      `;

      this.db.get(query, [providerType, providerId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get auth provider for login verification
  async getAuthProvider(providerType, identifier) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT ap.*, u.email, u.first_name, u.last_name, u.is_active
        FROM user_auth_providers ap
        JOIN users u ON ap.user_id = u.id
        WHERE ap.provider_type = ? AND (ap.provider_id = ? OR ap.provider_email = ?)
      `;

      this.db.get(query, [providerType, identifier, identifier], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Create session for JWT management
  async createSession(userId, sessionToken, providerType, deviceInfo = {}) {
    return new Promise((resolve, reject) => {
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const stmt = this.db.prepare(`
      INSERT INTO user_sessions 
      (user_id, session_token, provider_type, device_info, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

      stmt.run(
        [
          userId,
          sessionToken,
          providerType,
          JSON.stringify(deviceInfo),
          deviceInfo.ip,
          deviceInfo.userAgent,
          expiresAt,
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  // Validate session token
  async validateSession(sessionToken) {
    return new Promise((resolve, reject) => {
      const checkQuery = `
      SELECT s.*, u.id as user_id, u.email, u.first_name, u.last_name, u.is_active
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ?
    `;

      this.db.get(checkQuery, [sessionToken], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          // Check if session is active and not expired
          const now = new Date();
          const expiresAt = new Date(row.expires_at);
          const isNotExpired = expiresAt > now;

          if (row.is_active == 1 && isNotExpired) {
            resolve(row);
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id, email, first_name, last_name, display_name, avatar_url, 
                subscription_tier, usage_quota, usage_current, email_verified, created_at 
         FROM users WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }
  async cleanupExpiredSessions() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(0);
        return;
      }

      const stmt = this.db.prepare(`
      DELETE FROM user_sessions WHERE expires_at < datetime('now')
    `);

      stmt.run(function (err) {
        if (err) {
          console.error("Error cleaning up sessions:", err);
          resolve(0);
        } else {
          console.log(`🧹 Cleaned up ${this.changes} expired sessions`);
          resolve(this.changes);
        }
      });

      stmt.finalize();
    });
  }
  // Create or update auth provider for user
  async createAuthProvider(
    userId,
    providerType,
    providerId,
    providerData = {}
  ) {
    return new Promise((resolve, reject) => {
      const {
        email,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        passwordHash,
        isPrimary = false,
        isVerified = true,
      } = providerData;

      const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_auth_providers 
      (user_id, provider_type, provider_id, provider_email, provider_data, 
       access_token, refresh_token, token_expires_at, password_hash, is_primary, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

      stmt.run(
        [
          userId,
          providerType,
          providerId,
          email,
          JSON.stringify(providerData),
          accessToken,
          refreshToken,
          tokenExpiresAt,
          passwordHash,
          isPrimary,
          isVerified,
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  // Get auth provider for login verification
  async getAuthProvider(providerType, identifier) {
    return new Promise((resolve, reject) => {
      const query = `
      SELECT ap.*, u.email, u.first_name, u.last_name, u.is_active
      FROM user_auth_providers ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.provider_type = ? AND (ap.provider_id = ? OR ap.provider_email = ?)
    `;

      this.db.get(query, [providerType, identifier, identifier], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Update user's last login
  async updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `);

      stmt.run([userId], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });

      stmt.finalize();
    });
  }

  // Deactivate session (logout)
  async deactivateSession(sessionToken) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
      UPDATE user_sessions SET is_active = 0 WHERE session_token = ?
    `);

      stmt.run([sessionToken], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });

      stmt.finalize();
    });
  }

  // Update getUserById method to include more fields
  async getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id, email, first_name, last_name, display_name, avatar_url, 
              subscription_tier, usage_quota, usage_current, email_verified, created_at 
       FROM users WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }
  // Get user's auth providers
  async getUserAuthProviders(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT provider_type, provider_id, provider_email, is_primary, is_verified, created_at FROM user_auth_providers WHERE user_id = ?",
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Cloud Account Management Methods

  // Create cloud account
  async createCloudAccount(
    userId,
    provider,
    accountName,
    encryptedCredentials
  ) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
      INSERT INTO cloud_accounts (user_id, provider, account_name, encrypted_credentials)
      VALUES (?, ?, ?, ?)
    `);

      stmt.run(
        [userId, provider, accountName, encryptedCredentials],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  // Get cloud accounts by user
  async getCloudAccountsByUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, provider, account_name, connection_status, last_sync, 
              error_message, created_at 
       FROM cloud_accounts 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Get specific cloud account by ID (with credentials)
  async getCloudAccountById(accountId, userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM cloud_accounts 
       WHERE id = ? AND user_id = ?`,
        [accountId, userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // Update cloud account
  async updateCloudAccount(accountId, userId, updates) {
    return new Promise((resolve, reject) => {
      const allowedFields = [
        "account_name",
        "encrypted_credentials",
        "connection_status",
        "last_sync",
        "error_message",
      ];

      const updateFields = [];
      const values = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updateFields.length === 0) {
        return resolve(false);
      }

      values.push(accountId, userId);

      const stmt = this.db.prepare(`
      UPDATE cloud_accounts 
      SET ${updateFields.join(", ")} 
      WHERE id = ? AND user_id = ?
    `);

      stmt.run(values, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });

      stmt.finalize();
    });
  }

  // Delete cloud account
  async deleteCloudAccount(accountId, userId) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
      DELETE FROM cloud_accounts 
      WHERE id = ? AND user_id = ?
    `);

      stmt.run([accountId, userId], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });

      stmt.finalize();
    });
  }

  // Check if account name exists for user (to prevent duplicates)
  async checkAccountNameExists(userId, accountName, excludeId = null) {
    return new Promise((resolve, reject) => {
      let query =
        "SELECT id FROM cloud_accounts WHERE user_id = ? AND account_name = ?";
      const params = [userId, accountName];

      if (excludeId) {
        query += " AND id != ?";
        params.push(excludeId);
      }

      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  // Get account statistics for user
  async getAccountStats(userId) {
    return new Promise((resolve, reject) => {
      const query = `
      SELECT 
        COUNT(*) as total_accounts,
        SUM(CASE WHEN connection_status = 'active' THEN 1 ELSE 0 END) as active_accounts,
        SUM(CASE WHEN connection_status = 'error' THEN 1 ELSE 0 END) as error_accounts,
        provider,
        COUNT(*) as count
      FROM cloud_accounts 
      WHERE user_id = ? 
      GROUP BY provider
    `;

      this.db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Also get total counts
          this.db.get(
            "SELECT COUNT(*) as total FROM cloud_accounts WHERE user_id = ?",
            [userId],
            (err2, totalRow) => {
              if (err2) {
                reject(err2);
              } else {
                resolve({
                  total: totalRow.total,
                  byProvider: rows,
                });
              }
            }
          );
        }
      });
    });
  }

  // Transfer Management Methods

  // Create transfer job
  async createTransferJob(transferData) {
    return new Promise((resolve, reject) => {
      const {
        userId,
        sourceAccountId,
        destinationAccountId,
        sourceFilePath,
        destinationFilePath,
        fileName,
        fileSize = 0
      } = transferData;

      const stmt = this.db.prepare(`
        INSERT INTO transfers 
        (user_id, source_account_id, destination_account_id, source_path, 
         destination_path, file_name, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        [userId, sourceAccountId, destinationAccountId, sourceFilePath, 
         destinationFilePath, fileName, fileSize],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  // Get transfer by ID
  async getTransferById(transferId, userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM transfers 
         WHERE id = ? AND user_id = ?`,
        [transferId, userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // Get transfers by user
  async getTransfersByUser(userId, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT t.*, 
                sa.account_name as source_account_name, sa.provider as source_provider,
                da.account_name as dest_account_name, da.provider as dest_provider
         FROM transfers t
         LEFT JOIN cloud_accounts sa ON t.source_account_id = sa.id
         LEFT JOIN cloud_accounts da ON t.destination_account_id = da.id
         WHERE t.user_id = ?
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Update transfer job
  async updateTransferJob(transferId, updates) {
    return new Promise((resolve, reject) => {
      const allowedFields = [
        'status', 'progress', 'transferred_bytes', 'transfer_speed',
        'error_message', 'retry_count', 'started_at', 'completed_at'
      ];

      const updateFields = [];
      const values = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updateFields.length === 0) {
        return resolve(false);
      }

      values.push(transferId);

      const stmt = this.db.prepare(`
        UPDATE transfers 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `);

      stmt.run(values, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });

      stmt.finalize();
    });
  }

  // Get transfer statistics
  async getTransferStats(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_transfers,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
          SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
          SUM(file_size) as total_bytes_transferred
        FROM transfers 
        WHERE user_id = ?
      `;

      this.db.get(query, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error("Error closing database:", err.message);
        } else {
          console.log("📊 Database connection closed");
        }
      });
    }
  }
}

module.exports = new Database();
