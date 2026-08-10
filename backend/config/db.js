require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Explicitly require database drivers so bundlers & Sequelize resolve them statically
let pgDriver = null;
let sqliteDriver = null;
try { pgDriver = require('pg'); } catch (e) {}
try { sqliteDriver = require('sqlite3'); } catch (e) {}

const getDialect = () => {
  if (process.env.VERCEL) {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
      return 'postgres';
    }
    return 'sqlite';
  }
  return process.env.DB_DIALECT || (process.env.DATABASE_URL ? 'postgres' : 'sqlite');
};

const createSequelizeInstance = () => {
  const dialect = getDialect();
  if (dialect === 'sqlite') {
    const sqliteDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..');
    if (!fs.existsSync(sqliteDir)) {
      try { fs.mkdirSync(sqliteDir, { recursive: true }); } catch (e) {}
    }
    const sqlitePath = path.join(sqliteDir, 'database.sqlite');

    const opts = {
      dialect: 'sqlite',
      storage: sqlitePath,
      logging: false,
    };
    if (sqliteDriver) opts.dialectModule = sqliteDriver;
    return new Sequelize(opts);
  } else if (process.env.DATABASE_URL) {
    const opts = {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.PG_SSL === 'false' ? false : { require: true, rejectUnauthorized: false },
      },
    };
    if (pgDriver) opts.dialectModule = pgDriver;
    return new Sequelize(process.env.DATABASE_URL, opts);
  } else {
    const opts = {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      dialect: 'postgres',
      logging: false,
    };
    if (pgDriver) opts.dialectModule = pgDriver;
    return new Sequelize(
      process.env.PG_DATABASE || 'login_page',
      process.env.PG_USER || 'postgres',
      process.env.PG_PASSWORD || 'postgres',
      opts
    );
  }
};

let sequelize = createSequelizeInstance();

// Auto-create PostgreSQL database if missing (only for local standalone postgres, skip for remote DATABASE_URL or sqlite)
const autoCreatePostgresDB = async () => {
  if (getDialect() === 'sqlite' || process.env.DATABASE_URL || !pgDriver) return;
  const host = process.env.PG_HOST || 'localhost';
  const port = parseInt(process.env.PG_PORT || '5432', 10);
  const user = process.env.PG_USER || 'postgres';
  const password = process.env.PG_PASSWORD || 'postgres';
  const dbName = process.env.PG_DATABASE || 'login_page';

  try {
    const client = new pgDriver.Client({ host, port, user, password, database: 'postgres' });
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database '${dbName}' created automatically in PostgreSQL!`);
    }
    await client.end();
  } catch (err) {
    // If PostgreSQL server isn't running or auth fails, ignore here
  }
};

let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (isConnected) return;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    const currentDialect = getDialect();
    try {
      if (currentDialect === 'postgres') {
        await autoCreatePostgresDB();
      }

      await sequelize.authenticate();
      console.log(`Database Connected Successfully (${currentDialect.toUpperCase()}) via Sequelize`);

      await sequelize.sync({ alter: false });
      console.log('Database Models Synchronized Successfully');
      isConnected = true;
    } catch (error) {
      console.error(`\n❌ ${currentDialect.toUpperCase()} Connection Error: ${error.message}`);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
};

module.exports = { sequelize, connectDB };
