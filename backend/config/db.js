require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Client } = require('pg');
const path = require('path');

const getDialect = () => process.env.DB_DIALECT || (process.env.DATABASE_URL ? 'postgres' : 'sqlite');

const createSequelizeInstance = () => {
  const dialect = getDialect();
  if (dialect === 'sqlite') {
    const sqlitePath = process.env.VERCEL 
      ? path.join('/tmp', 'database.sqlite') 
      : path.join(__dirname, '../database.sqlite');

    return new Sequelize({
      dialect: 'sqlite',
      storage: sqlitePath,
      logging: false,
    });
  } else if (process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.PG_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
      },
    });
  } else {
    return new Sequelize(
      process.env.PG_DATABASE || 'login_page',
      process.env.PG_USER || 'postgres',
      process.env.PG_PASSWORD || 'postgres',
      {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT || 5432,
        dialect: 'postgres',
        logging: false,
      }
    );
  }
};

let sequelize = createSequelizeInstance();

// Auto-create PostgreSQL database if missing
const autoCreatePostgresDB = async () => {
  if (getDialect() === 'sqlite') return;
  const host = process.env.PG_HOST || 'localhost';
  const port = parseInt(process.env.PG_PORT || '5432', 10);
  const user = process.env.PG_USER || 'postgres';
  const password = process.env.PG_PASSWORD || 'postgres';
  const dbName = process.env.PG_DATABASE || 'login_page';

  try {
    const client = new Client({ host, port, user, password, database: 'postgres' });
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

const connectDB = async () => {
  if (isConnected) return;
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
    console.error(`👉 Note: If PostgreSQL is not installed or running, set DB_DIALECT=sqlite in backend/.env for instant zero-setup local database testing.\n`);
  }
};

module.exports = { sequelize, connectDB };
