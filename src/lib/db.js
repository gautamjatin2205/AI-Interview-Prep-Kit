import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_DB_PATH = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists for fallback mode
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(FILE_DB_PATH)) {
  fs.writeFileSync(FILE_DB_PATH, JSON.stringify({ users: [], kits: [], practice: [] }, null, 2));
}

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (uri && uri.trim() !== '') {
    try {
      if (mongoose.connection.readyState >= 1) {
        isConnected = true;
        return true;
      }
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log('Successfully connected to MongoDB Cluster.');
      return true;
    } catch (err) {
      console.warn('MongoDB Connection Warning:', err.message, '- Falling back to File Database mode.');
      isConnected = false;
      return false;
    }
  }
  return false;
}

// Fallback File DB Helpers
export class FileDB {
  static getDB() {
    try {
      const data = fs.readFileSync(FILE_DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return { users: [], kits: [], practice: [] };
    }
  }

  static saveDB(data) {
    fs.writeFileSync(FILE_DB_PATH, JSON.stringify(data, null, 2));
  }

  // Users
  static findUserByEmail(email) {
    const db = this.getDB();
    return db.users.find(u => u.email === email.toLowerCase());
  }

  static createUser(userObj) {
    const db = this.getDB();
    db.users.push(userObj);
    this.saveDB(db);
    return userObj;
  }

  // Kits
  static getUserKits(userId) {
    const db = this.getDB();
    return db.kits.filter(k => k.userId === userId || !k.userId);
  }

  static getKitById(id) {
    const db = this.getDB();
    return db.kits.find(k => k.id === id || k._id === id);
  }

  static saveKit(kitObj) {
    const db = this.getDB();
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
    db.kits = db.kits.filter(k => k.id !== id && k._id !== id);
    this.saveDB(db);
    return true;
  }

  // Practice progress
  static getPracticeState(kitId) {
    const db = this.getDB();
    return db.practice.find(p => p.kitId === kitId) || null;
  }

  static savePracticeState(stateObj) {
    const db = this.getDB();
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
