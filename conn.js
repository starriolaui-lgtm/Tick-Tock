const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host:     process.env.DB_HOST     || 'mysql.railway.internal',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'WagFdwJemqfYHrOIlEAbZIDDXdROoYOm',
  database: process.env.DB_NAME     || 'railway',
  port:     process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = db;