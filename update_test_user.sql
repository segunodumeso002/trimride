-- Update test user with proper password hash
UPDATE users 
SET password_hash = '$2a$10$Q2kWa/LUnO6lFZMP4tRb2.sXOD4CRG6JjOcFLPg4GSVm7t0rzj4ae' 
WHERE email = 'mike@barbershop.com';

-- Add a customer test user
INSERT INTO users (email, password_hash, first_name, last_name, user_type, phone) 
VALUES ('customer@test.com', '$2a$10$Q2kWa/LUnO6lFZMP4tRb2.sXOD4CRG6JjOcFLPg4GSVm7t0rzj4ae', 'Test', 'Customer', 'customer', '+1234567892')
ON CONFLICT (email) DO NOTHING;