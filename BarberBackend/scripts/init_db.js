const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function initDb() {
  try {
    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, '..', 'models', 'schema.sql');
    try {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
    } catch (_tableExistsErr) {
      // Base tables already created
    }

    console.log('Applying idempotent column migrations...');
    await pool.query(`
      ALTER TABLE barber_profiles 
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'USA',
      ADD COLUMN IF NOT EXISTS shop_image VARCHAR(255);

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS country VARCHAR(100);

      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS reference_photo VARCHAR(500),
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS verification_pin VARCHAR(6);

      CREATE TABLE IF NOT EXISTS favorite_barbers (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        barber_id INTEGER REFERENCES barber_profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, barber_id)
      );

      CREATE INDEX IF NOT EXISTS idx_favorite_barbers_customer ON favorite_barbers(customer_id);
    `);
    
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    pool.end();
  }
}

initDb();
