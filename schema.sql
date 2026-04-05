-- FIX-R Database Schema
-- Run this against a PostgreSQL database before starting the application.
-- psql -U <user> -d <dbname> -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'active',
  banned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  used_by INTEGER REFERENCES users(id),
  used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  badge VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(45),
  login_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_configs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT,
  api_key TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  server_id INTEGER REFERENCES server_configs(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_connections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  secret_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_models (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  object_path TEXT NOT NULL,
  file_size BIGINT,
  format TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS object_storage_configs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 's3',
  endpoint TEXT,
  bucket TEXT NOT NULL,
  region TEXT,
  access_key_id TEXT,
  secret_access_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session table (created automatically by connect-pg-simple, included here for reference)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
