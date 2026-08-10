// Force Vercel bundler (@vercel/nft) to include database drivers in serverless bundle
try { require('pg'); } catch (e) {}
try { require('sqlite3'); } catch (e) {}

const app = require('../backend/server');

module.exports = app;
