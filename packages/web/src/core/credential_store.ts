/** SQLite 凭证持久化存储 */

import { Credential } from "@qqmusic-api/sdk";
import initSqlJs from "sql.js";
import type { Database } from "sql.js";

export class CredentialStore {
  private db: Database | null = null;

  constructor(private dbPath: string) {}

  async initialize(): Promise<void> {
    const SQL = await initSqlJs();
    try {
      const fs = await import("node:fs");
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
      }
    } catch {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS credentials (
        musicid INTEGER PRIMARY KEY,
        credential_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        valid INTEGER DEFAULT 1
      )
    `);
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    import("node:fs").then((fs) => {
      fs.writeFileSync(this.dbPath, buffer);
    });
  }

  randomCredentials(): Credential[] {
    if (!this.db) return [];
    const stmt = this.db.prepare("SELECT credential_json FROM credentials WHERE valid = 1 ORDER BY RANDOM()");
    const creds: Credential[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      creds.push(new Credential(JSON.parse(row.credential_json as string)));
    }
    stmt.free();
    return creds;
  }

  get(musicid: number): Credential | null {
    if (!this.db) return null;
    const stmt = this.db.prepare("SELECT credential_json FROM credentials WHERE musicid = ?");
    stmt.bind([musicid]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return new Credential(JSON.parse(row.credential_json as string));
    }
    stmt.free();
    return null;
  }

  update(credential: Credential): void {
    if (!this.db) return;
    this.db.run(
      "INSERT OR REPLACE INTO credentials (musicid, credential_json, updated_at, valid) VALUES (?, ?, ?, 1)",
      [credential.musicid, JSON.stringify(credential), Math.floor(Date.now() / 1000)],
    );
    this.save();
  }

  markInvalid(musicid: number): void {
    if (!this.db) return;
    this.db.run("UPDATE credentials SET valid = 0 WHERE musicid = ?", [musicid]);
    this.save();
  }

  syncAccounts(accounts: { musicid: number; credential: Record<string, unknown> }[]): void {
    if (!this.db) return;
    const validIds = new Set(accounts.map((a) => a.musicid));
    const existingIds = new Set<number>();
    const stmt = this.db.prepare("SELECT musicid FROM credentials");
    while (stmt.step()) {
      existingIds.add(stmt.getAsObject().musicid as number);
    }
    stmt.free();

    for (const account of accounts) {
      this.db.run(
        "INSERT OR REPLACE INTO credentials (musicid, credential_json, updated_at, valid) VALUES (?, ?, ?, 1)",
        [account.musicid, JSON.stringify(account.credential), Math.floor(Date.now() / 1000)],
      );
    }

    for (const id of existingIds) {
      if (!validIds.has(id)) {
        this.db.run("DELETE FROM credentials WHERE musicid = ?", [id]);
      }
    }
    this.save();
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
