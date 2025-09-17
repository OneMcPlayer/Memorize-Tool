const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure the database directory exists
const dbDir = path.join(__dirname, '../db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create or open the database
const db = new sqlite3.Database(path.join(dbDir, 'passkeys.db'));

// Initialize the database with required tables
db.serialize(() => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT,
      created_at INTEGER NOT NULL,
      last_login INTEGER
    )
  `);

  // Create passkeys table
  db.run(`
    CREATE TABLE IF NOT EXISTS passkeys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credential TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_used INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create user settings table (stores optional preferences like API keys)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      openai_api_key TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('Database initialized successfully');
});

// User functions
const userDb = {
  // Create a new user
  createUser: (username, email = null) => {
    return new Promise((resolve, reject) => {
      const userId = crypto.randomBytes(16).toString('hex');
      const now = Date.now();
      
      db.run(
        'INSERT INTO users (id, username, email, created_at) VALUES (?, ?, ?, ?)',
        [userId, username, email, now],
        function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return reject(err);
          }
          resolve({ id: userId, username, email, created_at: now });
        }
      );
    });
  },

  // Get user by ID
  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) {
            console.error('Error getting user by ID:', err);
            return reject(err);
          }
          resolve(row);
        }
      );
    });
  },

  // Get user by username
  getUserByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) {
            console.error('Error getting user by username:', err);
            return reject(err);
          }
          resolve(row);
        }
      );
    });
  },

  // Update last login time
  updateLastLogin: (userId) => {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      db.run(
        'UPDATE users SET last_login = ? WHERE id = ?',
        [now, userId],
        function(err) {
          if (err) {
            console.error('Error updating last login:', err);
            return reject(err);
          }
          resolve({ userId, last_login: now });
        }
      );
    });
  }
};

// User settings functions
const userSettingsDb = {
  // Get settings for a user
  getSettings: (userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM user_settings WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) {
            console.error('Error getting user settings:', err);
            return reject(err);
          }
          resolve(row);
        }
      );
    });
  },

  // Upsert the OpenAI API key for a user
  setOpenAiApiKey: (userId, apiKey) => {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      db.run(
        `INSERT INTO user_settings (user_id, openai_api_key, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET openai_api_key = excluded.openai_api_key, updated_at = excluded.updated_at`,
        [userId, apiKey, now],
        function(err) {
          if (err) {
            console.error('Error saving OpenAI API key:', err);
            return reject(err);
          }
          resolve({ userId, openai_api_key: apiKey, updated_at: now });
        }
      );
    });
  },

  // Remove the OpenAI API key for a user
  clearOpenAiApiKey: (userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_settings WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) {
            console.error('Error clearing OpenAI API key:', err);
            return reject(err);
          }
          resolve({ removed: this.changes > 0 });
        }
      );
    });
  }
};

// Passkey functions
const passkeyDb = {
  // Store a new passkey
  storePasskey: (userId, credentialId, credential) => {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const credentialJson = JSON.stringify(credential);
      
      db.run(
        'INSERT INTO passkeys (id, user_id, credential, created_at) VALUES (?, ?, ?, ?)',
        [credentialId, userId, credentialJson, now],
        function(err) {
          if (err) {
            console.error('Error storing passkey:', err);
            return reject(err);
          }
          resolve({ id: credentialId, user_id: userId, created_at: now });
        }
      );
    });
  },

  // Get passkey by ID
  getPasskeyById: (credentialId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM passkeys WHERE id = ?',
        [credentialId],
        (err, row) => {
          if (err) {
            console.error('Error getting passkey by ID:', err);
            return reject(err);
          }
          
          if (row) {
            try {
              // Parse the credential JSON
              row.credential = JSON.parse(row.credential);
            } catch (parseErr) {
              console.error('Error parsing credential JSON:', parseErr);
              return reject(parseErr);
            }
          }
          
          resolve(row);
        }
      );
    });
  },

  // Update last used time
  updateLastUsed: (credentialId) => {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      db.run(
        'UPDATE passkeys SET last_used = ? WHERE id = ?',
        [now, credentialId],
        function(err) {
          if (err) {
            console.error('Error updating last used:', err);
            return reject(err);
          }
          resolve({ id: credentialId, last_used: now });
        }
      );
    });
  },

  // Get all passkeys for a user
  getPasskeysByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM passkeys WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) {
            console.error('Error getting passkeys by user ID:', err);
            return reject(err);
          }
          
          // Parse credential JSON for each row
          const passkeys = rows.map(row => {
            try {
              row.credential = JSON.parse(row.credential);
            } catch (parseErr) {
              console.error('Error parsing credential JSON:', parseErr);
              row.credential = null;
            }
            return row;
          });
          
          resolve(passkeys);
        }
      );
    });
  }
};

// Token functions
const tokenDb = {
  // Create a new token
  createToken: (userId, expiresInMs = 24 * 60 * 60 * 1000) => { // Default: 24 hours
    return new Promise((resolve, reject) => {
      const tokenId = crypto.randomBytes(16).toString('hex');
      const token = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      const expiresAt = now + expiresInMs;
      
      db.run(
        'INSERT INTO tokens (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
        [tokenId, userId, token, now, expiresAt],
        function(err) {
          if (err) {
            console.error('Error creating token:', err);
            return reject(err);
          }
          resolve({ 
            id: tokenId, 
            user_id: userId, 
            token, 
            created_at: now, 
            expires_at: expiresAt 
          });
        }
      );
    });
  },

  // Validate a token
  validateToken: (token) => {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      
      db.get(
        'SELECT * FROM tokens WHERE token = ? AND expires_at > ?',
        [token, now],
        (err, row) => {
          if (err) {
            console.error('Error validating token:', err);
            return reject(err);
          }
          resolve(row);
        }
      );
    });
  },

  // Delete expired tokens
  deleteExpiredTokens: () => {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      
      db.run(
        'DELETE FROM tokens WHERE expires_at <= ?',
        [now],
        function(err) {
          if (err) {
            console.error('Error deleting expired tokens:', err);
            return reject(err);
          }
          resolve({ deleted: this.changes });
        }
      );
    });
  },

  // Delete a specific token
  deleteToken: (token) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM tokens WHERE token = ?',
        [token],
        function(err) {
          if (err) {
            console.error('Error deleting token:', err);
            return reject(err);
          }
          resolve({ deleted: this.changes > 0 });
        }
      );
    });
  },

  // Delete all tokens for a user
  deleteUserTokens: (userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM tokens WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) {
            console.error('Error deleting user tokens:', err);
            return reject(err);
          }
          resolve({ deleted: this.changes });
        }
      );
    });
  }
};

// Clean up expired tokens periodically (every hour)
setInterval(() => {
  tokenDb.deleteExpiredTokens()
    .then(result => {
      if (result.deleted > 0) {
        console.log(`Cleaned up ${result.deleted} expired tokens`);
      }
    })
    .catch(err => {
      console.error('Error cleaning up expired tokens:', err);
    });
}, 60 * 60 * 1000);

// Export the database functions
module.exports = {
  user: userDb,
  passkey: passkeyDb,
  token: tokenDb,
  userSettings: userSettingsDb,
  
  // Close the database connection
  close: () => {
    return new Promise((resolve, reject) => {
      db.close(err => {
        if (err) {
          console.error('Error closing database:', err);
          return reject(err);
        }
        resolve();
      });
    });
  }
};
