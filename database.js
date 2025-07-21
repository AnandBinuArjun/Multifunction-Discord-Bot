const Database = require('better-sqlite3');
// This will create a file named 'data.sqlite' in your project folder
const db = new Database('data.sqlite');

// Set up the table for temporary roles if it doesn't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS temp_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    roleId TEXT NOT NULL,
    removeAt INTEGER NOT NULL
  )
`).run();

console.log('Database connected and table is ready.');

// Export the database connection
module.exports = db;