require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  try {
    console.log('Adding columns to barber_profiles...');
    await pool.query(`
      ALTER TABLE barber_profiles 
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'USA',
      ADD COLUMN IF NOT EXISTS shop_image VARCHAR(255);
    `);
    console.log('Columns added successfully.');
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    pool.end();
  }
}

run();
