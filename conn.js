const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host:     process.env.MYSQLHOST     || 'mysql.railway.internal',
  user:     process.env.MYSQLUSER     || 'root',
  password: process.env.MYSQLPASSWORD || 'WagFdwJemqfYHrOIlEAbZIDDXdROoYOm',
  database: process.env.MYSQLDATABASE     || 'railway',
  port:     process.env.MYSQLPORT     || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = db;