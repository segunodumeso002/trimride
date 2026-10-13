require('dotenv').config();
const pool = require('../config/database');

async function migrateRegistrationContactFields() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS state VARCHAR(100),
        ADD COLUMN IF NOT EXISTS country VARCHAR(100);
    `);
    await client.query(`
      ALTER TABLE barber_profiles
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS state VARCHAR(100),
        ADD COLUMN IF NOT EXISTS country VARCHAR(100),
        ADD COLUMN IF NOT EXISTS shop_image VARCHAR(255);
    `);
    await client.query('COMMIT');
    console.log('Registration contact fields are ready.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateRegistrationContactFields().catch(error => {
  console.error('Registration contact migration failed:', error.message);
  process.exitCode = 1;
});
