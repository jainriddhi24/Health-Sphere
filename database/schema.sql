-- HealthSphere Database Schema
-- PostgreSQL Database Schema for HealthSphere Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE chronic_condition_type AS ENUM ('diabetes', 'hypertension', 'heart_disease', 'obesity', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workout_type_enum AS ENUM ('cardio', 'strength', 'yoga', 'pilates', 'cycling', 'running', 'swimming', 'walking', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE intensity_type AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_trend_type AS ENUM ('increasing', 'decreasing', 'stable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE warning_type_enum AS ENUM ('diet', 'exercise', 'health_metric', 'chronic_condition');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_type AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 13 AND age <= 120),
    gender gender_type NOT NULL,
    height DECIMAL(5, 2) NOT NULL CHECK (height >= 100 AND height <= 250), -- in cm
    weight DECIMAL(5, 2) NOT NULL CHECK (weight >= 30 AND weight <= 300), -- in kg
    chronic_condition chronic_condition_type DEFAULT 'none',
    medical_report_url VARCHAR(500),
    processing_result JSONB, -- AI-generated summary, diet plan, danger flags from ML service
    lifestyle JSONB,
    personal_goals TEXT[],
    premium_unlocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_type workout_type_enum NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    intensity intensity_type NOT NULL,
    calories_burned DECIMAL(8, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community challenges table
CREATE TABLE IF NOT EXISTS community_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    category VARCHAR(50),
    difficulty VARCHAR(20) DEFAULT 'medium',
    goal VARCHAR(300),
    prize VARCHAR(300),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date > start_date)
);

-- Challenge participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES community_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    progress_metric DECIMAL(10, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, user_id)
);

-- Community groups table
CREATE TABLE IF NOT EXISTS community_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    max_members INTEGER,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community group members table
CREATE TABLE IF NOT EXISTS community_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Social posts table
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type VARCHAR(50) DEFAULT 'general',
    image_url VARCHAR(500),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Social post likes table
CREATE TABLE IF NOT EXISTS social_post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- Social post comments table
CREATE TABLE IF NOT EXISTS social_post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
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

-- Meal corrections table (user feedback for model corrections)
CREATE TABLE IF NOT EXISTS meal_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    image_path VARCHAR(500),
    original_label VARCHAR(200),
    corrected_label VARCHAR(200) NOT NULL,
    confidence DECIMAL(3, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat logs table for chatbot interactions
CREATE TABLE IF NOT EXISTS chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    generated_json JSONB,
    model VARCHAR(200) DEFAULT 'mock',
    confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Risk scores table
CREATE TABLE IF NOT EXISTS risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_value DECIMAL(5, 2) NOT NULL CHECK (risk_value >= 0 AND risk_value <= 100),
    next_30_days_prediction JSONB, -- Stores prediction details, factors, recommendations
    risk_trend risk_trend_type,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chatbot usage table
CREATE TABLE IF NOT EXISTS chatbot_usage (
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
CREATE INDEX idx_community_challenges_category ON community_challenges(category);

-- Community groups indexes
CREATE INDEX idx_community_groups_name ON community_groups(name);
CREATE INDEX idx_community_groups_category ON community_groups(category);
CREATE INDEX idx_community_groups_created_by ON community_groups(created_by);

-- Community group members indexes
CREATE INDEX idx_community_group_members_group_id ON community_group_members(group_id);
CREATE INDEX idx_community_group_members_user_id ON community_group_members(user_id);

-- Social posts indexes
CREATE INDEX idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX idx_social_posts_type ON social_posts(post_type);
CREATE INDEX idx_social_posts_created_at ON social_posts(created_at DESC);

-- Social post likes indexes
CREATE INDEX idx_social_post_likes_post_id ON social_post_likes(post_id);
CREATE INDEX idx_social_post_likes_user_id ON social_post_likes(user_id);

-- Social post comments indexes
CREATE INDEX idx_social_post_comments_post_id ON social_post_comments(post_id);
CREATE INDEX idx_social_post_comments_user_id ON social_post_comments(user_id);

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
