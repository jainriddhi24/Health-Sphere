-- HealthSphere Database Schema
-- PostgreSQL Database Schema for HealthSphere Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE chronic_condition_type AS ENUM ('diabetes', 'hypertension', 'heart_disease', 'obesity', 'none');
CREATE TYPE workout_type_enum AS ENUM ('cardio', 'strength', 'yoga', 'pilates', 'cycling', 'running', 'swimming', 'walking', 'other');
CREATE TYPE intensity_type AS ENUM ('low', 'medium', 'high');
CREATE TYPE risk_trend_type AS ENUM ('increasing', 'decreasing', 'stable');
CREATE TYPE warning_type_enum AS ENUM ('diet', 'exercise', 'health_metric', 'chronic_condition');
CREATE TYPE severity_type AS ENUM ('low', 'medium', 'high', 'critical');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 13 AND age <= 120),
    gender gender_type NOT NULL,
    height DECIMAL(5, 2) NOT NULL CHECK (height >= 100 AND height <= 250), -- in cm
    weight DECIMAL(5, 2) NOT NULL CHECK (weight >= 30 AND weight <= 300), -- in kg
    chronic_condition chronic_condition_type DEFAULT 'none',
    premium_unlocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workouts table
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_type workout_type_enum NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    intensity intensity_type NOT NULL,
    calories_burned DECIMAL(8, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community challenges table
CREATE TABLE community_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date > start_date)
);

-- Challenge participants table
CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES community_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    progress_metric DECIMAL(10, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, user_id)
);

-- Meals table
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_label VARCHAR(200) NOT NULL,
    calories DECIMAL(8, 2) NOT NULL CHECK (calories >= 0),
    sodium DECIMAL(8, 2) NOT NULL CHECK (sodium >= 0), -- in mg
    sugar DECIMAL(8, 2) NOT NULL CHECK (sugar >= 0), -- in g
    unhealthy_score DECIMAL(5, 2) NOT NULL CHECK (unhealthy_score >= 0 AND unhealthy_score <= 100),
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1), -- ML model confidence
    image_url VARCHAR(500), -- Optional: URL to stored food image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Risk scores table
CREATE TABLE risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_value DECIMAL(5, 2) NOT NULL CHECK (risk_value >= 0 AND risk_value <= 100),
    next_30_days_prediction JSONB, -- Stores prediction details, factors, recommendations
    risk_trend risk_trend_type,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chatbot usage table
CREATE TABLE chatbot_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    queries_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    daily_query_count INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_premium ON users(premium_unlocked) WHERE premium_unlocked = TRUE;

-- Workouts indexes
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_created_at ON workouts(created_at DESC);
CREATE INDEX idx_workouts_user_created ON workouts(user_id, created_at DESC);

-- Meals indexes
CREATE INDEX idx_meals_user_id ON meals(user_id);
CREATE INDEX idx_meals_created_at ON meals(created_at DESC);
CREATE INDEX idx_meals_user_created ON meals(user_id, created_at DESC);
CREATE INDEX idx_meals_unhealthy_score ON meals(unhealthy_score);

-- Risk scores indexes
CREATE INDEX idx_risk_scores_user_id ON risk_scores(user_id);
CREATE INDEX idx_risk_scores_generated_at ON risk_scores(generated_at DESC);
CREATE INDEX idx_risk_scores_user_generated ON risk_scores(user_id, generated_at DESC);

-- Challenge participants indexes
CREATE INDEX idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user_id ON challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_progress ON challenge_participants(challenge_id, progress_metric DESC);

-- Chatbot usage indexes
CREATE INDEX idx_chatbot_usage_user_id ON chatbot_usage(user_id);
CREATE INDEX idx_chatbot_usage_last_used ON chatbot_usage(last_used DESC);

-- Community challenges indexes
CREATE INDEX idx_community_challenges_dates ON community_challenges(start_date, end_date);
CREATE INDEX idx_community_challenges_active ON community_challenges(start_date, end_date) 
    WHERE start_date <= CURRENT_TIMESTAMP AND end_date >= CURRENT_TIMESTAMP;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_participants_updated_at BEFORE UPDATE ON challenge_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatbot_usage_updated_at BEFORE UPDATE ON chatbot_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to reset daily query count
CREATE OR REPLACE FUNCTION reset_daily_chatbot_queries()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_reset_date < CURRENT_DATE THEN
        NEW.daily_query_count = 0;
        NEW.last_reset_date = CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER reset_chatbot_daily_count BEFORE UPDATE ON chatbot_usage
    FOR EACH ROW EXECUTE FUNCTION reset_daily_chatbot_queries();

-- Create view for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    COUNT(DISTINCT w.id) AS total_workouts,
    COALESCE(SUM(w.calories_burned), 0) AS total_calories_burned,
    COUNT(DISTINCT m.id) AS total_meals,
    COALESCE(SUM(m.calories), 0) AS total_calories_consumed,
    COALESCE(AVG(m.unhealthy_score), 0) AS avg_unhealthy_score,
    (SELECT risk_value FROM risk_scores WHERE user_id = u.id ORDER BY generated_at DESC LIMIT 1) AS latest_risk_score
FROM users u
LEFT JOIN workouts w ON u.id = w.user_id
LEFT JOIN meals m ON u.id = m.user_id
GROUP BY u.id, u.name, u.email;

-- Create view for challenge leaderboard
CREATE OR REPLACE VIEW challenge_leaderboard AS
SELECT 
    cp.challenge_id,
    cc.title AS challenge_title,
    cp.user_id,
    u.name AS user_name,
    cp.progress_metric,
    ROW_NUMBER() OVER (PARTITION BY cp.challenge_id ORDER BY cp.progress_metric DESC) AS rank,
    cp.updated_at
FROM challenge_participants cp
JOIN community_challenges cc ON cp.challenge_id = cc.id
JOIN users u ON cp.user_id = u.id
ORDER BY cp.challenge_id, cp.progress_metric DESC;
