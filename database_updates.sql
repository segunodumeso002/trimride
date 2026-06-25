-- Enhanced user registration schema
-- Run this in pgAdmin to update your database

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS zipcode VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'USA';
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Update existing users with default values
UPDATE users SET username = LOWER(first_name || last_name) WHERE username IS NULL;
UPDATE users SET country = 'USA' WHERE country IS NULL;
UPDATE users SET currency = 'USD' WHERE currency IS NULL;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Currency mapping table for future use
CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    country VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    currency_symbol VARCHAR(10) NOT NULL,
    exchange_rate DECIMAL(10, 4) DEFAULT 1.0000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common currencies
INSERT INTO currencies (country, currency_code, currency_symbol) VALUES
('USA', 'USD', '$'),
('Canada', 'CAD', 'C$'),
('United Kingdom', 'GBP', '£'),
('European Union', 'EUR', '€'),
('Australia', 'AUD', 'A$'),
('Nigeria', 'NGN', '₦'),
('South Africa', 'ZAR', 'R'),
('India', 'INR', '₹'),
('Japan', 'JPY', '¥'),
('China', 'CNY', '¥')
ON CONFLICT DO NOTHING;

-- Push notification token storage
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    platform VARCHAR(20) NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios')),
    device_id VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
