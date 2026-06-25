-- Add gender field to users table
-- Run this in pgAdmin to update your database

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Update existing users with default value
UPDATE users SET gender = 'prefer_not_to_say' WHERE gender IS NULL;