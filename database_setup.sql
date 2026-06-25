-- Copy and paste this entire script into pgAdmin Query Tool for barber_app database

-- Users table (both customers and barbers)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('customer', 'barber')),
    profile_image VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Barber profiles
CREATE TABLE IF NOT EXISTS barber_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    shop_address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    description TEXT,
    services JSONB,
    working_hours JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    queue_count INTEGER DEFAULT 0,
    estimated_wait_time INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services offered by barbers
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    barber_id INTEGER REFERENCES barber_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    is_active BOOLEAN DEFAULT TRUE
);

-- Bookings/Queue management
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    barber_id INTEGER REFERENCES barber_profiles(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id),
    booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('appointment', 'queue')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    scheduled_time TIMESTAMP,
    queue_position INTEGER,
    estimated_wait_time INTEGER,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    total_amount DECIMAL(10, 2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('card', 'cash')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews and ratings
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    barber_id INTEGER REFERENCES barber_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    stripe_payment_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_barber_location ON barber_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_date ON bookings(barber_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert sample data for testing
INSERT INTO users (email, password_hash, first_name, last_name, user_type, phone) VALUES
('mike@barbershop.com', '$2a$10$example', 'Mike', 'Johnson', 'barber', '+1234567890'),
('john@customer.com', '$2a$10$example', 'John', 'Doe', 'customer', '+1234567891');

INSERT INTO barber_profiles (user_id, shop_name, shop_address, latitude, longitude, description, rating, queue_count, estimated_wait_time) VALUES
(1, 'Mike''s Classic Cuts', '123 Main St, City, State', 40.7128, -74.0060, 'Professional barber with 10+ years experience', 4.8, 2, 25);

INSERT INTO services (barber_id, name, description, price, duration) VALUES
(1, 'Classic Haircut', 'Traditional men''s haircut', 25.00, 30),
(1, 'Beard Trim', 'Professional beard trimming and shaping', 15.00, 15),
(1, 'Hair Wash & Style', 'Wash, dry and style', 20.00, 20),
(1, 'Full Service', 'Haircut + Beard Trim + Wash', 35.00, 45);