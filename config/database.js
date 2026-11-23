require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * MySQL 8.4 Connection Pool
 * - 다중 요청 처리를 위한 커넥션 풀 구성
 * - utf8mb4 및 이모지 완벽 지원
 * - 준비된 명령문(Prepared Statements) 지원
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamecafe',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true
});

module.exports = pool;
