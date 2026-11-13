-- ============================================
-- AI TRAVEL & TOURISM DATABASE
-- ============================================

-- ============================================
-- 1. USERS
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- 2. DESTINATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS destinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    description TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    average_budget DECIMAL(10, 2),
    best_month_start INT,
    best_month_end INT,
    climate_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- 3. ATTRACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS attractions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    attraction_type VARCHAR(100),
    average_visit_hours DECIMAL(4, 2),
    entry_fee DECIMAL(10, 2) DEFAULT 0,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON DELETE CASCADE
);


-- ============================================
-- 4. ACTIVITIES
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    activity_type VARCHAR(100),
    estimated_cost DECIMAL(10, 2) DEFAULT 0,
    duration_hours DECIMAL(4, 2),
    weather_dependency VARCHAR(50),

    FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON DELETE CASCADE
);


-- ============================================
-- 5. HOTELS
-- ============================================

CREATE TABLE IF NOT EXISTS hotels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    price_per_night DECIMAL(10, 2),
    rating DECIMAL(2, 1),
    amenities TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON DELETE CASCADE
);


-- ============================================
-- 6. SEASONS
-- ============================================

CREATE TABLE IF NOT EXISTS destination_seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    season_name VARCHAR(50) NOT NULL,
    start_month INT NOT NULL,
    end_month INT NOT NULL,
    suitability VARCHAR(50),
    description TEXT,

    FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON DELETE CASCADE
);


-- ============================================
-- 7. CLIMATE
-- ============================================

CREATE TABLE IF NOT EXISTS climate_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    month INT NOT NULL,
    average_temperature DECIMAL(5, 2),
    min_temperature DECIMAL(5, 2),
    max_temperature DECIMAL(5, 2),
    average_rainfall DECIMAL(8, 2),
    humidity DECIMAL(5, 2),

    FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON DELETE CASCADE,

    UNIQUE(destination_id, month)
);


-- ============================================
-- 8. WEATHER CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS weather_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    weather_date DATE NOT NULL,
    temperature DECIMAL(5, 2),
    feels_like DECIMAL(5, 2),
    humidity DECIMAL(5, 2),
    rainfall DECIMAL(8, 2),
    weather_condition VARCHAR(100),
    wind_speed DECIMAL(6, 2),
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON DELETE CASCADE,

    UNIQUE(destination_id, weather_date)
);


-- ============================================
-- 9. TRIPS
-- ============================================

CREATE TABLE IF NOT EXISTS trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    destination_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget DECIMAL(10, 2),
    number_of_travelers INT DEFAULT 1,
    travel_type VARCHAR(50),
    interests TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON DELETE CASCADE
);


-- ============================================
-- 10. ITINERARIES
-- ============================================

CREATE TABLE IF NOT EXISTS itineraries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    day_number INT NOT NULL,
    title VARCHAR(200),
    description TEXT,

    FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE
);


-- ============================================
-- 11. ITINERARY ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS itinerary_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    itinerary_id INT NOT NULL,
    attraction_id INT,
    activity_id INT,
    start_time TIME,
    end_time TIME,
    estimated_cost DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,

    FOREIGN KEY (itinerary_id)
        REFERENCES itineraries(id)
        ON DELETE CASCADE,

    FOREIGN KEY (attraction_id)
        REFERENCES attractions(id)
        ON DELETE SET NULL,

    FOREIGN KEY (activity_id)
        REFERENCES activities(id)
        ON DELETE SET NULL
);


-- ============================================
-- 12. FAVORITES
-- ============================================

CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    destination_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON DELETE CASCADE,

    UNIQUE(user_id, destination_id)
);


-- ============================================
-- 13. REVIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    destination_id INT NOT NULL,
    rating INT NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON DELETE CASCADE,

    CHECK (rating >= 1 AND rating <= 5)
);