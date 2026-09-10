// models/messages.js
const con = require('../config/db_connect');
const { randomUUID } = require('crypto');

async function isParticipant(conversationId, userId) {
  const [rows] = await con.execute(
    `SELECT 1 FROM conversation_users WHERE conversation_id = ? AND user_id = ?`,
    [conversationId, userId]
  );
  return rows.length > 0;
}

async function getMessages(conversationId, userId) {
  // only return messages the user hasn't cleared/deleted for themselves,
  // and respect conversation_users.cleared_at (per-user clear)
  const [rows] = await con.execute(
    `SELECT m.id, m.sender_id, m.content, m.status, m.is_edited, m.created_at, m.updated_at
     FROM messages m
     JOIN conversation_users cu ON cu.conversation_id = m.conversation_id AND cu.user_id = ?
     LEFT JOIN message_deletions md ON md.message_id = m.id AND md.user_id = ?
     WHERE m.conversation_id = ?
       AND m.deleted_at IS NULL
       AND md.message_id IS NULL
       AND (cu.cleared_at IS NULL OR m.created_at > cu.cleared_at)
     ORDER BY m.created_at ASC`,
    [userId, userId, conversationId]
  );
  return rows;
}

async function createMessage(conversationId, senderId, content) {
  const id = randomUUID();
  await con.execute(
    `INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)`,
    [id, conversationId, senderId, content]
  );
  // bump conversation's updated_at so it sorts to top of the chat list
  await con.execute(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);

  const [rows] = await con.execute(
    `SELECT id, sender_id, content, status, is_edited, created_at, updated_at FROM messages WHERE id = ?`,
    [id]
  );
  return rows[0];
}

async function markAsRead(conversationId, userId) {
  await con.execute(
    `UPDATE conversation_users SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?`,
    [conversationId, userId]
  );
}
// models/messages.js — add these
async function getMessageById(messageId) {
  const [rows] = await con.execute(`SELECT * FROM messages WHERE id = ?`, [messageId]);
  return rows[0] || null;
}

async function deleteForEveryone(messageId, userId) {
  const message = await getMessageById(messageId);
  if (!message) throw Object.assign(new Error('Message not found'), { status: 404 });
  if (message.sender_id !== userId) {
    throw Object.assign(new Error('Not your message'), { status: 403 });
  }
  await con.execute(`UPDATE messages SET deleted_at = NOW() WHERE id = ?`, [messageId]);
}

async function deleteForMe(messageId, userId) {
  await con.execute(
    `INSERT IGNORE INTO message_deletions (message_id, user_id) VALUES (?, ?)`,
    [messageId, userId]
  );
}


module.exports = { isParticipant, getMessages, createMessage, markAsRead , getMessageById, deleteForEveryone, deleteForMe};