-- Add photo support for 3-step registration
-- Run this in pgAdmin to update your database

-- Add shop_images field to barber_profiles for multiple shop photos
ALTER TABLE barber_profiles ADD COLUMN IF NOT EXISTS shop_images JSONB DEFAULT '[]';

-- Update existing barber profiles with empty array for shop_images
UPDATE barber_profiles SET shop_images = '[]' WHERE shop_images IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN barber_profiles.shop_images IS 'Array of shop photo URLs in JSON format';
COMMENT ON COLUMN users.profile_image IS 'Profile photo URL';