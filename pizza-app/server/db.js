import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// SQLite — Node.js ichida tayyor (node:sqlite), alohida o'rnatish shart emas.
// Kichik va o'rta pitsaxona uchun bitta fayl yetarli.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  first_name  TEXT,
  last_name   TEXT,
  username    TEXT,
  language    TEXT NOT NULL DEFAULT 'uz',
  phone       TEXT,
  slices      INTEGER NOT NULL DEFAULT 0,
  address     TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  group_code        TEXT,
  items             TEXT NOT NULL,
  mode              TEXT NOT NULL,
  address           TEXT,
  phone             TEXT,
  comment           TEXT,
  payment           TEXT NOT NULL,
  paid              INTEGER NOT NULL DEFAULT 0,
  subtotal          INTEGER NOT NULL,
  delivery_fee      INTEGER NOT NULL,
  discount          INTEGER NOT NULL,
  total             INTEGER NOT NULL,
  slices_used       INTEGER NOT NULL DEFAULT 0,
  slices_earned     INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL,
  history           TEXT NOT NULL,
  distance_km       REAL,
  eta_at            INTEGER,
  admin_chat_id     TEXT,
  admin_message_id  INTEGER,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id, id DESC);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS groups (
  code        TEXT PRIMARY KEY,
  host_id     INTEGER NOT NULL,
  status      TEXT NOT NULL,
  order_id    INTEGER,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  code       TEXT NOT NULL,
  user_id    INTEGER NOT NULL,
  name       TEXT NOT NULL,
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (code, user_id)
);

CREATE TABLE IF NOT EXISTS group_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL,
  user_id     INTEGER NOT NULL,
  config      TEXT NOT NULL,
  qty         INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS group_items_code ON group_items(code);

CREATE TABLE IF NOT EXISTS stoplist (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL
);
`;

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  db.exec(SCHEMA);

  // Buyurtma raqamlari #1001 dan boshlansin — mijozga chiroyliroq ko'rinadi
  db.exec(`
    INSERT INTO sqlite_sequence (name, seq)
    SELECT 'orders', 1000
    WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'orders')
  `);

  return db;
}

/** Bir nechta so'rovni bitta tranzaksiyada bajaradi */
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export const json = {
  parse(value, fallback = null) {
    if (value == null) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  stringify(value) {
    return value == null ? null : JSON.stringify(value);
  },
};
