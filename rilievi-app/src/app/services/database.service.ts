import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqliteConnection: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isNative = Capacitor.isNativePlatform();
  private initialized = false;

  constructor() {
    // Non chiamare init() qui per evitare dipendenze circolari
  }

  async checkAndCloseExistingConnection(dbName: string): Promise<void> {
    if (!this.sqliteConnection) {
      console.log('Creating SQLite connection first');
      this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);
    }
    
    try {
      // Verifica se esiste già una connessione e chiudila
      const isConnection = await this.sqliteConnection.isConnection(dbName, false);
      if (isConnection.result) {
        await this.sqliteConnection.closeConnection(dbName, false);
        console.log(`Closed existing connection to ${dbName}`);
      }
    } catch (error) {
      console.error('Error checking/closing connection:', error);
    }
  }

  async init(): Promise<void> {
    if (this.initialized) {
      console.log('Database already initialized');
      return;
    }

    try {
      if (this.isNative) {
        if (!this.sqliteConnection) {
          this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);
        }
        
        // Prima chiudi eventuali connessioni esistenti
        await this.checkAndCloseExistingConnection('rilievi_perizie_db');
        
        try {
          // Ora crea la nuova connessione
          this.db = await this.sqliteConnection.createConnection(
            'rilievi_perizie_db',
            false,
            'no-encryption',
            1,
            false
          );
          await this.db.open();
          this.initialized = true;
          console.log('SQLite database initialized');
        } catch (error) {
          if (error && typeof error === 'object' && 'message' in error &&
              typeof error.message === 'string' && error.message.includes('already exists')) {
            console.log('Database connection already exists, continuing...');
            this.initialized = true;
            return;
          }
          throw error;
        }
      } else {
        console.log('Using web storage (not SQLite) as not on native platform');
        this.initialized = true;
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  // Aggiungi metodi per interagire con il database qui

  // Metodo per eseguire query SQL
  async executeQuery(query: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      await this.init();
      if (!this.db) {
        throw new Error('Database not initialized');
      }
    }
    
    return this.db.query(query, params);
  }
}