import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Serverless-safe connection cache for Mongoose
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '') {
    return false;
  }

  if (cached.conn && mongoose.connection.readyState >= 1) {
    return true;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    }).then((m) => {
      console.log('Successfully connected to MongoDB Cluster.');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    return true;
  } catch (err) {
    cached.promise = null;
    console.warn('MongoDB Connection Warning:', err.message, '- Falling back to local storage.');
    return false;
  }
}

// Safe query helper: only queries _id when id is a valid Mongo ObjectId to prevent CastError
export function getKitQuery(id) {
  if (!id) return { id: '' };
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { $or: [{ id: id }, { _id: id }] };
  }
  return { id: String(id) };
}

// In-memory fallback store if file system is read-only
let memoryStore = { users: [], kits: [], practice: [] };

function getStoragePath() {
  try {
    const localDataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
    }
    const filePath = path.join(localDataDir, 'db.json');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(memoryStore, null, 2));
    }
    return filePath;
  } catch (e) {
    // Read-only filesystem detected (e.g. Vercel Serverless) -> Try OS tmpdir
    try {
      const tmpDir = path.join(os.tmpdir(), 'prepkit-data');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      const tmpFile = path.join(tmpDir, 'db.json');
      if (!fs.existsSync(tmpFile)) {
        fs.writeFileSync(tmpFile, JSON.stringify(memoryStore, null, 2));
      }
      return tmpFile;
    } catch (err) {
      return null; // fallback to in-memory store
    }
  }
}

// Fallback File DB Helpers (Never throws on read-only environments)
export class FileDB {
  static getDB() {
    const filePath = getStoragePath();
    if (!filePath) return memoryStore;

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return memoryStore;
    }
  }

  static saveDB(data) {
    memoryStore = data;
    const filePath = getStoragePath();
    if (filePath) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      } catch (e) {
        // Silently preserve in memoryStore
      }
    }
  }

  // Users
  static findUserByEmail(email) {
    const db = this.getDB();
    return (db.users || []).find(u => u.email === (email || '').toLowerCase());
  }

  static createUser(userObj) {
    const db = this.getDB();
    if (!db.users) db.users = [];
    db.users.push(userObj);
    this.saveDB(db);
    return userObj;
  }

  // Kits
  static getUserKits(userId) {
    const db = this.getDB();
    return (db.kits || []).filter(k => k.userId === userId || !k.userId);
  }

  static getKitById(id) {
    const db = this.getDB();
    return (db.kits || []).find(k => k.id === id || k._id === id);
  }

  static saveKit(kitObj) {
    const db = this.getDB();
    if (!db.kits) db.kits = [];
    const idx = db.kits.findIndex(k => k.id === kitObj.id || k._id === kitObj.id);
    if (idx >= 0) {
      db.kits[idx] = { ...db.kits[idx], ...kitObj, updatedAt: new Date().toISOString() };
    } else {
      db.kits.push({ ...kitObj, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.saveDB(db);
    return kitObj;
  }

  static deleteKit(id) {
    const db = this.getDB();
    if (!db.kits) db.kits = [];
    db.kits = db.kits.filter(k => k.id !== id && k._id !== id);
    this.saveDB(db);
    return true;
  }

  // Practice progress
  static getPracticeState(kitId) {
    const db = this.getDB();
    return (db.practice || []).find(p => p.kitId === kitId) || null;
  }

  static savePracticeState(stateObj) {
    const db = this.getDB();
    if (!db.practice) db.practice = [];
    const idx = db.practice.findIndex(p => p.kitId === stateObj.kitId);
    if (idx >= 0) {
      db.practice[idx] = { ...db.practice[idx], ...stateObj, updatedAt: new Date().toISOString() };
    } else {
      db.practice.push({ ...stateObj, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.saveDB(db);
    return stateObj;
  }
}
