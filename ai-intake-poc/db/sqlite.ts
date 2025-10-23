const Database = require("better-sqlite3");
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data", "leads");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function writeMirror(id: string, payload: any) {
  const file = path.join(dataDir, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
}
// Ensure the /db folder exists
const dbDir = path.join(process.cwd(), "db");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const dbPath = path.join(dbDir, "leads.db");
export const db = new Database(dbPath);

// Create leads table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export function saveLead(id: string, leadObj: any) {
  const stmt = db.prepare(`
    INSERT INTO leads (id, payload, created_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(
    id,
    JSON.stringify(leadObj),
    new Date().toISOString()
  );
  writeMirror(id, leadObj); 
}
export function getLead(id: string): { id: string; payload: any; created_at: string } | null {
  const row = db.prepare(`SELECT id, payload, created_at FROM leads WHERE id = ?`).get(id);
  if (!row) return null;
  return {
    id: row.id,
    payload: JSON.parse(row.payload),
    created_at: row.created_at,
  };
}

export function updateLead(id: string, payload: any) {
  const stmt = db.prepare(`UPDATE leads SET payload = ? WHERE id = ?`);
  const info = stmt.run(JSON.stringify(payload), id);
  if (info.changes !== 1) {
    throw new Error(`Update failed for lead ${id}`);
  }
  writeMirror(id, payload);
}