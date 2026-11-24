const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

let pool = null;
let pgliteInstance = null;
let isPGlite = false;

// Initialize Database Connection
async function initDb() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString && connectionString.startsWith('postgres')) {
    console.log('[Database] Connecting to PostgreSQL via pg.Pool (Neon / Remote DB)...');
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' || connectionString.includes('neon.tech') 
        ? { rejectUnauthorized: false } 
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[Database Pool Error]:', err.message);
    });

    // Test connection
    const client = await pool.connect();
    client.release();
    console.log('[Database] PostgreSQL connected successfully.');
  } else {
    console.log('[Database] DATABASE_URL not set or local. Initializing embedded PostgreSQL engine (PGlite)...');
    const { PGlite } = require('@electric-sql/pglite');
    const dataDir = path.resolve(__dirname, '../data/pglite_db');
    if (!fs.existsSync(path.dirname(dataDir))) {
      fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    }
    pgliteInstance = new PGlite(dataDir);
    await pgliteInstance.waitReady;
    isPGlite = true;
    console.log(`[Database] Embedded PostgreSQL (PGlite) ready at ${dataDir}`);
  }
}

// Execute multi-statement SQL scripts (DDL / migrations)
async function exec(sql) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  try {
    if (isPGlite) {
      await pgliteInstance.exec(sql);
    } else {
      await pool.query(sql);
    }
  } catch (err) {
    console.error('[Database Exec Error]:', err.message);
    throw err;
  }
}

// Unified query function
async function query(text, params = []) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  try {
    if (isPGlite) {
      const res = await pgliteInstance.query(text, params);
      return {
        rows: res.rows || [],
        rowCount: res.rows ? res.rows.length : (res.affectedRows || 0),
        fields: res.fields || []
      };
    } else {
      const res = await pool.query(text, params);
      return res;
    }
  } catch (err) {
    console.error('[Database Query Error]:', err.message, '\nQuery:', text.slice(0, 150), '\nParams:', params);
    throw err;
  }
}

// Transaction client helper
async function getClient() {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (isPGlite) {
    // PGlite transaction emulation wrapper
    await pgliteInstance.query('BEGIN');
    let inTransaction = true;

    return {
      query: async (text, params = []) => {
        const res = await pgliteInstance.query(text, params);
        return {
          rows: res.rows || [],
          rowCount: res.rows ? res.rows.length : (res.affectedRows || 0),
          fields: res.fields || []
        };
      },
      release: async () => {
        if (inTransaction) {
          try {
            await pgliteInstance.query('ROLLBACK');
          } catch (_) {}
          inTransaction = false;
        }
      },
      commit: async () => {
        await pgliteInstance.query('COMMIT');
        inTransaction = false;
      },
      rollback: async () => {
        await pgliteInstance.query('ROLLBACK');
        inTransaction = false;
      }
    };
  } else {
    const client = await pool.connect();
    await client.query('BEGIN');
    let inTransaction = true;

    return {
      query: (text, params) => client.query(text, params),
      release: () => {
        if (inTransaction) {
          client.query('ROLLBACK').catch(() => {});
          inTransaction = false;
        }
        client.release();
      },
      commit: async () => {
        await client.query('COMMIT');
        inTransaction = false;
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK');
        inTransaction = false;
        client.release();
      }
    };
  }
}

module.exports = {
  initDb,
  query,
  exec,
  getClient
};
