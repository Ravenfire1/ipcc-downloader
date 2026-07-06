CREATE TABLE IF NOT EXISTS bikes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_push_token TEXT,
  registration_code TEXT NOT NULL,
  owner_secret_hash TEXT NOT NULL,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  make TEXT,
  model TEXT,
  color TEXT,
  serial_number TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bike_id TEXT NOT NULL REFERENCES bikes(id),
  lat REAL,
  lng REAL,
  accuracy REAL,
  location_source TEXT,
  ip TEXT,
  ip_city TEXT,
  ip_region TEXT,
  ip_country TEXT,
  user_agent TEXT,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scans_bike_id ON scans(bike_id);
