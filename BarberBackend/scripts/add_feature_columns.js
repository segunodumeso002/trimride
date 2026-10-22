const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/database');

async function migrate() {
  try {
    console.log('Running feature columns migration...');
    await pool.query(`
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
    `);
    console.log('Migration successful: bookings columns and favorite_barbers table created.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    pool.end();
  }
}

migrate();
