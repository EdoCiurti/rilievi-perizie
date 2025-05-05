import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqliteConnection!: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isNative = Capacitor.isNativePlatform();

  constructor() {
    this.init();
  }

  async init() {
    if (this.isNative) {
      try {
        this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);
        this.db = await this.sqliteConnection.createConnection(
          'rilievi_perizie_db',
          false,
          'no-encryption',
          1,
          false
        );
        await this.db.open();
        console.log('SQLite database initialized');
      } catch (err) {
        console.error('Error initializing database', err);
      }
    } else {
      console.log('Using web storage (not SQLite) as not on native platform');
    }
  }

  // Add methods to interact with the database here
}