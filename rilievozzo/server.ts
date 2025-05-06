import http from 'http';
import url from 'url';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import fileUpload from 'express-fileupload';
import path from 'path';
import multer from 'multer';
import bcrypt from 'bcryptjs';

const jwt = require('jsonwebtoken');
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const app = express();

// Assicurati che la cartella uploads esista
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads', { recursive: true });
}

// Estensione dell'interfaccia Request per includere il campo "user"
declare global {
  namespace Express {
    interface Request {
      user?: { username: string, userId?: string, role?: string };
    }
  }
}

// Configurazione ambiente
const connectionString = process.env.connectionStringLocal;
const DB_NAME = process.env.dbName;
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;


let paginaErr: string;

http.createServer(app).listen(PORT, () => {
  console.log('Server listening on port: ' + PORT);
  init();
});

function init() {
  fs.readFile('./static/error.html', (err, data) => {
    paginaErr = !err ? data.toString() : '<h1>Not Found</h1>';
  });
}

// Middleware
app.use((req, res, next) => {
  console.log(`${req.method}: ${req.originalUrl}`);
  next();
});

app.use('/', express.static('./static'));
app.use('/uploads', express.static('./uploads'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
  if (req.query && Object.keys(req.query).length > 0)
    console.log('--> parametri GET: ' + JSON.stringify(req.query));
  if (req.body && Object.keys(req.body).length > 0)
    console.log('--> parametri BODY: ' + JSON.stringify(req.body));
  next();
});

app.use(cors({
  origin: true, // Consente richieste da qualsiasi origine
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'admin-password', 'Admin-Password']
}));


function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Token ricevuto:', token);

  if (!token) {
    return res.status(401).json({ message: 'Token mancante' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ message: 'JWT_SECRET is not defined' });
  }
  
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.error('Errore di verifica token:', err);
      return res.status(403).json({ message: 'Token non valido o scaduto' });
    }
    
    console.log('Token verificato con successo:', user);
    req.user = user;
    next();
  });
}

// Configurazione multer per caricare file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => res.redirect('/login.html'));

app.post('/api/login', async (req : any, res : any) => {
  const { username, password } = req.body;

  const client = new MongoClient(connectionString!);
  try {
    await client.connect();
    const user = await client.db(DB_NAME).collection('utenti').findOne({ username });

    if (!user) return res.status(401).send({ message: 'Utente non trovato' });

    const match = user.password.startsWith('$2')
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (!match) return res.status(401).send({ message: 'Credenziali errate' });

    const token = jwt.sign({
      userId: user._id,
      username: user.username,
      role: user.ruolo || 'operatore'
    }, JWT_SECRET!, { expiresIn: '1h' });

    res.send({ 
      message: 'Login riuscito', 
      token, 
      username: user.username,
      deveCambiarePassword: user.deveCambiarePassword || false  // Aggiungiamo questa informazione
    });
  } catch (err) {
    res.status(500).send({ message: 'Errore nel login', err });
  } finally {
    client.close();
  }
});

// Nuovo endpoint per cambiare la password
app.post('/api/cambiaPassword', authenticateToken, async (req: any, res: any) => {
  const { nuovaPassword, vecchiaPassword } = req.body;
  const userId = req.user.userId;
  
  console.log('Received password change request:', { userId });
  
  // Validate inputs
  if (!nuovaPassword || !vecchiaPassword) {
    return res.status(400).json({ message: 'Vecchia e nuova password sono obbligatorie' });
  }
  
  if (nuovaPassword.length < 6) {
    return res.status(400).json({ message: 'La nuova password deve contenere almeno 6 caratteri' });
  }

  if (!userId) {
    return res.status(400).json({ message: 'Utente non identificato' });
  }
  
  const client = new MongoClient(connectionString!);
  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection('utenti');
    
    // Find the user
    const user = await collection.findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Verify old password
    const match = user.password.startsWith('$2')
      ? await bcrypt.compare(vecchiaPassword, user.password)
      : vecchiaPassword === user.password;
      
    if (!match) {
      return res.status(401).json({ message: 'Password attuale non corretta' });
    }
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nuovaPassword, saltRounds);
    
    // Update the password
    await collection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          password: hashedPassword,
          deveCambiarePassword: false
        } 
      }
    );
    
    res.status(200).json({ message: 'Password aggiornata con successo' });
  } catch (err) {
    console.error('Errore nella modifica della password:', err);
    res.status(500).json({ message: 'Errore nella modifica della password' });
  } finally {
    await client.close();
  }
});

// Endpoint per registrare un nuovo utente
app.post('/api/register', async (req: any, res: any) => {
  try {
    const { username, password, role, deveCambiarePassword } = req.body;
    
    // Validazione
    if (!username || !password) {
      return res.status(400).send({ message: 'Username e password sono richiesti' });
    }
    
    if (password.length < 6) {
      return res.status(400).send({ message: 'La password deve essere di almeno 6 caratteri' });
    }
    
    if(!connectionString) {
      return res.status(500).send({ message: 'Database connection string non definita' });
    }
    
    const client = new MongoClient(connectionString);
    await client.connect();
    const collection = client.db(DB_NAME).collection('utenti');
    
    // Controlla se l'utente esiste già
    const existingUser = await collection.findOne({ username });
    if (existingUser) {
      client.close();
      return res.status(400).send({ message: 'Username già in uso' });
    }
    
    // Crea il nuovo utente
    const result = await collection.insertOne({
      username,
      password, // In produzione, dovresti hashare la password
      role: role || 'operatore',
      deveCambiarePassword: deveCambiarePassword || true,
      createdAt: new Date()
    });
    
    client.close();
    
    res.status(201).send({
      message: 'Utente creato con successo',
      userId: result.insertedId
    });
  } catch (err) {
    console.error('Errore nella registrazione:', err);
    res.status(500).send({ message: 'Errore interno del server' });
  }
});

// Endpoint per ottenere tutti gli utenti (solo per admin)
app.get('/api/users', authenticateToken, async (req: any, res: any) => {
  // Solo gli admin possono vedere tutti gli utenti
  if (req.user.role !== 'admin') {
    return res.status(403).send({ message: 'Non autorizzato' });
  }

  try {
    // Opzionale: filtraggio per ruolo
    const roleFilter = req.query.role ? { role: req.query.role } : {};
       
    if (!connectionString) {
      return res.status(500).send({ err: 'Errore di configurazione del server' });
    }
    const client = new MongoClient(connectionString);
    await client.connect();
    const collection = client.db(DB_NAME).collection('utenti');
    
    const users = await collection.find(roleFilter, { projection: { password: 0 } }).toArray();
    
    client.close();
    res.status(200).json(users);
  } catch (err) {
    console.error('Errore nel recupero degli utenti:', err);
    res.status(500).send({ message: 'Errore interno del server' });
  }
});

// Endpoint per creare un nuovo utente (solo per admin)
app.post('/api/users', authenticateToken, async (req: any, res: any) => {
  // Solo gli admin possono creare nuovi utenti
  if (req.user.role !== 'admin') {
    return res.status(403).send({ message: 'Non autorizzato' });
  }

  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).send({ message: 'Username e password sono obbligatori' });
    }
    
    // Verifica che il ruolo sia valido
    if (role !== 'operatore' && role !== 'admin') {
      return res.status(400).send({ message: 'Ruolo non valido' });
    }
       
    if (!connectionString) {
      return res.status(500).send({ err: 'Errore di configurazione del server' });
    }
    const client = new MongoClient(connectionString);
    await client.connect();
    const collection = client.db(DB_NAME).collection('utenti');
    
    // Controlla se l'utente esiste già
    const existingUser = await collection.findOne({ username });
    if (existingUser) {
      client.close();
      return res.status(409).send({ message: 'Username già in uso' });
    }
    
    // Crea il nuovo utente
    const result = await collection.insertOne({
      username,
      password, // In produzione, dovresti hashare la password
      role: role || 'user',
      createdAt: new Date()
    });
    
    client.close();
    
    res.status(201).json({
      message: 'Utente creato con successo',
      userId: result.insertedId
    });
  } catch (err) {
    console.error('Errore nella creazione dell\'utente:', err);
    res.status(500).send({ message: 'Errore interno del server' });
  }
});

// Endpoint per ottenere tutte le perizie (con accesso per admin e operatori)
app.get('/api/perizie', authenticateToken, async (req: any, res: any) => {
  if (!connectionString) {
    return res.status(500).send({ message: 'Database connection string non definita' });
  }

  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection('perizie');
    
    let perizie;
    
    // Se l'utente è admin, ottiene tutte le perizie
    if (req.user.role === 'admin') {
      perizie = await collection.find({}).toArray();
    } else {
      // Gli utenti normali vedono solo le proprie perizie
      perizie = await collection.find({ operatore: req.user.username }).toArray();
    }
    
    console.log(`Recuperate ${perizie.length} perizie`);
    res.send(perizie);
  } catch (err) {
    console.error('Errore nel recupero delle perizie:', err);
    res.status(500).send({ message: 'Errore interno del server', error: err });
  } finally {
    client.close();
  }
});

// Endpoint per ottenere i dettagli di una perizia specifica
app.get('/api/perizie/:id', authenticateToken, async (req: any, res: any) => {
  if (!connectionString) {
    return res.status(500).send({ message: 'Database connection string non definita' });
  }

  const { id } = req.params;
  
  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection('perizie');
    
    const perizia = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!perizia) {
      return res.status(404).send({ message: 'Perizia non trovata' });
    }
    
    // Controlla i permessi: solo admin o l'operatore che ha creato la perizia possono vederla
    if (req.user.role !== 'admin' && perizia.operatore !== req.user.username) {
      return res.status(403).send({ message: 'Non hai i permessi per visualizzare questa perizia' });
    }

    
    res.send(perizia);
  } catch (err) {
    console.error('Errore nel recupero della perizia:', err);
    res.status(500).send({ message: 'Errore interno del server', error: err });
  } finally {
    client.close();
  }
});

// Endpoint per creare una nuova perizia con immagini
app.post('/api/perizie', authenticateToken, (upload.array('immagini', 10) as any), async (req: any, res: any) => {
  try {
    const { descrizione, cliente, stato, indirizzo } = req.body;
    let coordinate = [];
    
    try {
      coordinate = JSON.parse(req.body.coordinate);
    } catch (e) {
      return res.status(400).send({ message: 'Formato coordinate non valido' });
    }
    
    if (!descrizione) {
      return res.status(400).send({ message: 'La descrizione è obbligatoria' });
    }
    
    // Gestione delle immagini caricate
    const immagini: { _id: ObjectId; url: string; commento: string }[] = [];
    const commenti = Array.isArray(req.body.commenti) ? req.body.commenti : [req.body.commenti];
    
    if (req.files && req.files.length > 0) {
      // @ts-ignore - req.files è un array quando usi upload.array()
      req.files.forEach((file: Express.Multer.File, index: number) => {
        immagini.push({
          _id: new ObjectId(), // <-- aggiungi questo
          url: `/uploads/${file.filename}`,
          commento: commenti[index] || ''
        });
      });
    }
    
    const nuovaPerizia = {
      descrizione,
      cliente: cliente || 'N/D',
      stato: stato || 'In attesa',
      indirizzo: indirizzo || '',
      coordinate,
      immagini,
      createdAt: new Date(),
      operatore: req.user.username
    };
    
    if(!connectionString) {
      return res.status(500).send({ message: 'Database connection string non definita' });
    }
    
    const client = new MongoClient(connectionString);
    await client.connect();
    const collection = client.db(DB_NAME).collection('perizie');
    
    const result = await collection.insertOne(nuovaPerizia);
    client.close();
    
    res.status(201).send({
      message: 'Perizia creata con successo',
      periziaId: result.insertedId
    });
  } catch (err) {
    console.error('Errore nella creazione della perizia:', err);
    res.status(500).send({ message: 'Errore interno del server' });
  }
});

// Endpoint per aggiornare una perizia
app.put('/api/perizie/:id', authenticateToken, upload.array('immagini') as any, async (req:any, res:any) => {
  try {
    const { id } = req.params;
    const { descrizione, cliente, indirizzo, stato, operatore } = req.body;
    const coordinate = req.body.coordinate ? JSON.parse(req.body.coordinate) : null;
    
    // Trova la perizia da modificare
    const client = new MongoClient(connectionString!);
    await client.connect();
    const collection = client.db(DB_NAME).collection('perizie');
    
    const perizia = await collection.findOne({ _id: new ObjectId(id) });
    if (!perizia) {
      client.close();
      return res.status(404).send('Perizia non trovata');
    }
    
    // Aggiorna i campi di testo
    const updateDoc: any = {
      descrizione,
      cliente,
      indirizzo,
      stato,
      updatedAt: new Date()
    };
    if (operatore) updateDoc.operatore = operatore;
    if (coordinate) updateDoc.coordinate = coordinate;
    
    // Gestisci l'eliminazione delle immagini
    if (req.body.immaginiDaEliminare) {
      const immaginiDaEliminareArray = JSON.parse(req.body.immaginiDaEliminare);
      
      for (const imgData of immaginiDaEliminareArray) {
        // Ottieni l'ID dell'immagine
        const imgId = typeof imgData === 'object' ? imgData.id : imgData;
        
        // Trova l'immagine nell'array della perizia
        const immagineIndex = perizia.immagini.findIndex(img => 
          img._id.toString() === imgId.toString()
        );
        
        if (immagineIndex !== -1) {
          // Ottieni il filename dell'immagine
          const imgFilename = perizia.immagini[immagineIndex].url.split('/').pop();
          
          // Elimina il file fisico se abbiamo il filename
          if (imgFilename) {
            const filePath = path.join('./uploads', imgFilename);
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Errore nell'eliminazione del file ${imgFilename}:`, err);
              } else {
                console.log(`File ${imgFilename} eliminato con successo`);
              }
            });
          }
          
          // Rimuovi l'immagine dall'array
          perizia.immagini.splice(immagineIndex, 1);
        }
      }
    }
    
    // Aggiungi nuove immagini
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const nuoveImmagini = req.files.map((file: any) => ({
        _id: new ObjectId(),
        url: `/uploads/${file.filename}`
      }));
      
      updateDoc.immagini = [...perizia.immagini, ...nuoveImmagini];
    }
    
    // Aggiorna il documento nel database
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
    
    client.close();
    
    res.status(200).json({
      success: true,
      message: 'Perizia aggiornata con successo',
      perizia: updateDoc
    });
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento della perizia:', error);
    res.status(500).send(error instanceof Error ? error.message : 'Errore durante la modifica della perizia');
  }
});

// Endpoint per eliminare una perizia
app.delete('/api/perizie/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const id = req.params.id;
    
    // Se è admin, verifica la password
    if (req.user.role === 'admin') {
      // Controlla sia admin-password che Admin-Password per maggiore tolleranza
      const adminPassword = req.headers['admin-password'] || req.headers['Admin-Password'];
      
      console.log('Password ricevuta:', adminPassword ? 'Presente' : 'Mancante');
      
      if (!adminPassword) {
        return res.status(400).send('Password admin richiesta');
      }
      
      // Verifica la password dell'admin
      if (!connectionString) {
        return res.status(500).send('Database connection string non definita');
      }
      
      const client = new MongoClient(connectionString);
      await client.connect();
      const usersCollection = client.db(DB_NAME).collection('utenti');
      
      // Cerca l'admin sia per username che per ruolo
      const admin = await usersCollection.findOne({ 
        username: req.user.username,
        $or: [
          { ruolo: 'admin' },
          { role: 'admin' }
        ]
      });
      
      console.log('Admin trovato:', admin ? 'Sì' : 'No');
      
      if (!admin) {
        client.close();
        return res.status(404).send('Utente admin non trovato');
      }
      
      // Controlla sia la password hashed che quella in chiaro per compatibilità
      let isPasswordValid = false;
      
      if (admin.password.startsWith('$2')) {
        // Se la password è hashata con bcrypt
        isPasswordValid = await bcrypt.compare(adminPassword, admin.password);
      } else {
        // Fallback su verifica di password in chiaro
        isPasswordValid = adminPassword === admin.password;
      }
      
      console.log('Password valida:', isPasswordValid ? 'Sì' : 'No');
      
      if (!isPasswordValid) {
        client.close();
        return res.status(401).send('Password admin non valida');
      }
      
      // Password valida, procedi con l'eliminazione
      const perizieCollection = client.db(DB_NAME).collection('perizie');
      
      const result = await perizieCollection.deleteOne({ _id: new ObjectId(id) });
      
      client.close();
      
      if (result.deletedCount === 0) {
        return res.status(404).send('Perizia non trovata');
      }
      
      return res.status(200).send({ message: 'Perizia eliminata con successo' });
    } else {
      // Utente normale può eliminare solo le proprie perizie
      if (!connectionString) {
        return res.status(500).send('Database connection string non definita');
      }
      
      const client = new MongoClient(connectionString);
      await client.connect();
      const collection = client.db(DB_NAME).collection('perizie');
      
      // Trova prima la perizia per controllare l'operatore
      const perizia = await collection.findOne({ _id: new ObjectId(id) });
      
      if (!perizia) {
        client.close();
        return res.status(404).send('Perizia non trovata');
      }
      
      // Verifica che l'utente sia il proprietario della perizia
      if (perizia.operatore !== req.user.username) {
        client.close();
        return res.status(403).send('Non hai i permessi per eliminare questa perizia');
      }
      
      // Procedi con l'eliminazione
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      
      client.close();
      
      return res.status(200).send({ message: 'Perizia eliminata con successo' });
    }
  } catch (err) {
    console.error('Errore nell\'eliminazione della perizia:', err);
    res.status(500).send('Errore interno del server');
  }
});

// Nuovo endpoint per aggiornare il nome di un cliente in tutte le perizie
app.put('/api/clienti/aggiorna', authenticateToken, async (req: any, res: any) => {
  try {
    const { nomeOriginale, nuovoNome, note } = req.body;
    
    if (!nomeOriginale || !nuovoNome) {
      return res.status(400).json({ message: 'Nome originale e nuovo nome sono obbligatori' });
    }
    
    console.log(`Aggiornamento cliente da "${nomeOriginale}" a "${nuovoNome}"`);
    
    if (!connectionString) {
      return res.status(500).json({ message: 'Database connection string non definita' });
    }
    
    const client = new MongoClient(connectionString);
    await client.connect();
    const collection = client.db(DB_NAME).collection('perizie');
    
    // Aggiorna tutte le perizie con questo cliente in un'unica operazione
    const result = await collection.updateMany(
      { cliente: nomeOriginale },
      { $set: { cliente: nuovoNome } }
    );
    
    client.close();
    
    console.log(`Aggiornate ${result.modifiedCount} perizie`);
    
    res.status(200).json({
      message: 'Cliente aggiornato con successo',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Errore nell\'aggiornamento del cliente:', err);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

// Add these new endpoints

// API per ottenere il profilo utente
app.get('/api/users/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    
    const client = new MongoClient(connectionString!);
    await client.connect();
    const collection = client.db(DB_NAME).collection('utenti');
    
    // Trova l'utente per ID (escludi il campo password)
    const user = await collection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );
    
    if (!user) {
      return res.status(404).send({ message: 'Utente non trovato' });
    }
    
    // Restituisci i dati del profilo
    res.status(200).json({
      username: user.username,
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      role: user.role || user.ruolo || 'operatore',
      createdAt: user.createdAt || new Date()
    });
  } catch (err) {
    console.error('Errore nel recupero del profilo:', err);
    res.status(500).send({ message: 'Errore interno del server' });
  }
});

// API per le attività dell'utente
app.get('/api/activities', authenticateToken, async (req: any, res: any) => {
  try {
    // Per ora restituiamo un array vuoto o attività simulate
    // In una vera implementazione, recupereresti le attività dal database
    
    interface Activity {
      type: string;
      timestamp: any;
      title: string;
      description: string;
    }
    
    const activities: Activity[] = [];
    
    // Ottieni le ultime perizie modificate dall'utente come attività
    const client = new MongoClient(connectionString!);
    await client.connect();
    const collection = client.db(DB_NAME).collection('perizie');
    
    // Trova perizie recenti dell'utente
    const perizie = await collection
      .find({ operatore: req.user.username })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(5)
      .toArray();
      
    // Converti perizie in attività
    perizie.forEach(p => {
      // Attività di creazione
      activities.push({
        type: 'create',
        timestamp: p.createdAt,
        title: 'Perizia creata',
        description: `Hai creato la perizia "${p.descrizione}" per il cliente ${p.cliente || 'N/D'}`
      });
      
      // Se è stata completata, aggiungi un'attività di completamento
      if (p.stato === 'Completata' && p.updatedAt && p.updatedAt !== p.createdAt) {
        activities.push({
          type: 'update',
          timestamp: p.updatedAt,
          title: 'Perizia completata',
          description: `Hai completato la perizia "${p.descrizione}" per il cliente ${p.cliente || 'N/D'}`
        });
      }
    });
    
    // Ordina per data più recente
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.status(200).json(activities);
  } catch (err) {
    console.error('Errore nel recupero delle attività:', err);
    res.status(500).send({ message: 'Errore interno del server' });
  }
});

// API for updating user profile
app.put('/api/users/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { name, email, phone, address } = req.body;
    
    // Validate input
    if (!name && !email && !phone && !address) {
      return res.status(400).send({ message: 'Nessun dato fornito per l\'aggiornamento' });
    }
    
    const client = new MongoClient(connectionString!);
    await client.connect();
    const collection = client.db(DB_NAME).collection('utenti');
    
    // Prepare update fields
    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (address) updateFields.address = address;
    
    // Update user document
    const result = await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: 'Utente non trovato' });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Profilo aggiornato con successo'
    });
  } catch (err) {
    console.error('Errore nell\'aggiornamento del profilo:', err);
    res.status(500).send({ message: 'Errore interno del server' });
  }
});

// Endpoint per verificare le informazioni utente (incluso il ruolo)
app.get('/api/checkAuth', authenticateToken, (req: any, res: any) => {
  // Il middleware authenticateToken ha già verificato il token
  res.send({
    username: req.user.username,
    role: req.user.role || 'operatore',
    userId: req.user.userId
  });
});

app.get('/api/protectedData', authenticateToken, (req, res) => {
  res.send({ message: 'Accesso ai dati protetti', user: req.user });
});


app.put('/api/perizie/modifica', authenticateToken, upload.array('immagini') as any, async (req: any, res: any): Promise<void> => {
  try {
    const { id, descrizione, cliente, indirizzo, stato, immaginiDaEliminare } = req.body;
    
    if (!connectionString) {
      res.status(500).json({ errore: 'Database connection string non definita' });
      return;
    }
    
    const client = new MongoClient(connectionString);
    try {
      await client.connect();
      const collection = client.db(DB_NAME).collection('perizie');
      
      // Trova la perizia da modificare
      const perizia = await collection.findOne({ _id: new ObjectId(id) });
      if (!perizia) {
        res.status(404).json({ errore: 'Perizia non trovata' });
        return;
      }
      
      // Prepara il documento aggiornato
      const updateDoc: any = {
        descrizione,
        cliente,
        indirizzo,
        stato,
        updatedAt: new Date()
      };
      
      // Gestisci l'eliminazione delle immagini
      if (immaginiDaEliminare) {
        const immaginiDaEliminareArray = JSON.parse(immaginiDaEliminare);
        
        // Filtra l'array delle immagini, rimuovendo quelle da eliminare
        if (perizia.immagini && Array.isArray(perizia.immagini)) {
          updateDoc.immagini = perizia.immagini.filter((img: any) => {
            const deveEliminare = immaginiDaEliminareArray.includes(img._id.toString());
            
            if (deveEliminare) {
              // Estrai il nome del file dall'URL
              const filename = img.url.split('/').pop();
              if (filename) {
                fs.unlink(path.join('./uploads', filename), (err) => {
                  if (err) console.error('Errore eliminazione file:', err);
                });
              }
              return false; // Non mantenerla nell'array
            }
            
            return true; // Mantienila nell'array
          });
        }
      } else {
        updateDoc.immagini = perizia.immagini || [];
      }
      
      // Aggiungi nuove immagini se presenti
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const nuoveImmagini = (req.files as Express.Multer.File[]).map((file: Express.Multer.File) => ({
          _id: new ObjectId(),
          filename: file.filename,
          path: file.path,
          url: `/uploads/${file.filename}`
        }));
        
        updateDoc.immagini = [...updateDoc.immagini, ...nuoveImmagini];
      }
      
      // Aggiorna il documento nel database
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateDoc }
      );
      
      res.json({ successo: true, messaggio: 'Perizia aggiornata con successo' });
    } finally {
      client.close();
    }
  } catch (err) {
    console.error('Errore modifica perizia:', err);
    res.status(500).json({ errore: 'Errore durante la modifica della perizia' });
  }
});