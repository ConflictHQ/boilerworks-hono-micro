-- Migration: create events table
-- Generic event store with soft deletes

CREATE TABLE events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'received',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_events_type ON events (type);
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_deleted_at ON events (deleted_at);
