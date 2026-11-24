require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrate() {
  console.log('[Migration] Starting database migration...');
  await db.initDb();
  
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    // Execute schema statements
    await db.exec(schemaSql);
    console.log('[Migration] Schema migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
