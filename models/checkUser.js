// models/checkUser.js
const con = require('../config/db_connect');

async function checkUser(email) {
  try {
    const [rows] = await con.execute(`SELECT * FROM users WHERE email = ?`, [email]);
    if (rows.length > 0) {
      return rows[0]; // Return the full user object (including id)
    }
    return null;
  } catch (error) {
    console.error('Error checking user:', error);
    throw error;
  }
}

module.exports = checkUser;