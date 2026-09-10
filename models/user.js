const con = require('../config/db_connect');
const { randomUUID } = require('crypto');

async function createUser(name, username, email) {
  const id = randomUUID();
  const query = 'INSERT INTO users (id, display_name, username, email) VALUES (?, ?, ?, ?)';
  try {
    await con.execute(query, [id, name, username, email]);
    console.log('User created');
    return { id, display_name: name, username, email };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function getUserById(id) {
  const query = 'SELECT id, email, username, display_name, avatar_url FROM users WHERE id = ?';
  try {
    const [rows] = await con.execute(query, [id]);
    return rows[0] || null;
  } catch (e) {
    console.error("Error retrieving user:", e);
    throw e;
  }
}

async function updateUser(id, fullname, username) {
  const query = 'UPDATE users SET display_name = ?, username = ? WHERE id = ?';
  try {
    await con.execute(query, [fullname, username, id]);
    return getUserById(id); // return the fresh row
  } catch (e) {
    console.error("Error updating user:", e);
    throw e;
  }
}

async function deleteUser(id) {
  const query = 'DELETE FROM users WHERE id = ?';
  try {
    const [result] = await con.execute(query, [id]);
    return result;
  } catch (e) {
    console.error("Error deleting user:", e);
    throw e;
  }
}

async function searchUsersByUsername(query, excludeUserId) {
  const [rows] = await con.execute(
    `SELECT id, username, display_name, avatar_url
     FROM users
     WHERE username LIKE ? AND id != ?
     LIMIT 20`,
    [`%${query}%`, excludeUserId]
  );
  return rows;
}

module.exports = { createUser, getUserById, updateUser, deleteUser, searchUsersByUsername };