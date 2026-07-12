const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';
const connectionString = isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

if (isTest && !process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required when NODE_ENV=test. Refusing to run tests against the development database.');
}

if (isTest && process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be different from DATABASE_URL. Refusing to run tests against the development database.');
}

const pool = new Pool({
  connectionString,
});

module.exports = pool;
