-- ==========================================
-- CHAT SERVICE — Schema Definition
-- Schema: chat (search_path: chat, public)
--
-- Owns: chat_groups, chat_group_members,
--       chat_messages, chat_attachments
-- Reads: users (public)
-- ==========================================

CREATE SCHEMA IF NOT EXISTS chat;
SET search_path TO chat, public;

-- Chat Groups
CREATE TABLE IF NOT EXISTS chat_groups (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(20) NOT NULL CHECK (type IN ('department', 'batch', 'custom', 'broadcast')),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Group Members
CREATE TABLE IF NOT EXISTS chat_group_members (
    group_id BIGINT REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (group_id, user_id)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    content TEXT,
    type VARCHAR(20) DEFAULT 'text',
    status VARCHAR(20) DEFAULT 'sent',
    metadata JSONB DEFAULT '{}',
    read_by JSONB DEFAULT '[]',
    reply_to_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    deleted_for JSONB DEFAULT '[]',
    forwarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Attachments
CREATE TABLE IF NOT EXISTS chat_attachments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id BIGINT REFERENCES chat_messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
