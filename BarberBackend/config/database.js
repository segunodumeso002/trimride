const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || process.env.RDS_USERNAME || 'postgres',
  host: process.env.DB_HOST || process.env.RDS_HOSTNAME || 'localhost',
  database: process.env.DB_NAME || process.env.RDS_DB_NAME || 'barber_app',
  password: process.env.DB_PASSWORD || process.env.RDS_PASSWORD || '',
  port: process.env.DB_PORT || process.env.RDS_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('Connected to PostgreSQL database');
    release();
  }
});

module.exports = pool;