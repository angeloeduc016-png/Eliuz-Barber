const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const config = require('../config/env');

function quoteIdentifier(value) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error('Nome de banco inválido.');
  return `\`${value}\``;
}

async function createDatabaseIfMissing() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(config.db.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
}

const sequelize = new Sequelize(config.db.database, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  logging: config.db.logging ? console.log : false,
  timezone: '+00:00',
  define: { underscored: true, timestamps: true },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

async function connectDatabase() {
  if (config.db.createDatabase) await createDatabaseIfMissing();
  await sequelize.authenticate();
  await sequelize.sync({ alter: config.db.syncAlter });
  console.log(`Banco conectado: ${config.db.database}`);
}

module.exports = { sequelize, connectDatabase, createDatabaseIfMissing };
