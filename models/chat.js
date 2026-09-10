// models/chat.js
const con = require('../config/db_connect');

async function getConversationsForUser(userId) {
  const query = `
    SELECT
      c.id AS conversation_id,
      c.updated_at,
      other.id AS other_user_id,
      other.username,
      other.display_name,
      other.avatar_url,
      lm.content AS last_message,
      lm.created_at AS last_message_at,
      lm.sender_id AS last_message_sender_id,
      (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.conversation_id = c.id
          AND m.sender_id != ?
          AND m.deleted_at IS NULL
          AND m.created_at > COALESCE(cu.last_read_at, '1970-01-01')
          AND (cu.cleared_at IS NULL OR lm.created_at > cu.cleared_at)
      ) AS unread_count
    FROM conversations c
    JOIN conversation_users cu ON cu.conversation_id = c.id AND cu.user_id = ?
    JOIN conversation_users other_cu ON other_cu.conversation_id = c.id AND other_cu.user_id != ?
    JOIN users other ON other.id = other_cu.user_id
    LEFT JOIN messages lm ON lm.id = (
      SELECT id FROM messages
      WHERE conversation_id = c.id AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    )
    ORDER BY c.updated_at DESC
  `;
  const [rows] = await con.execute(query, [userId, userId, userId]);
  return rows;
}
const { randomUUID } = require('crypto');

async function getOrCreateConversation(userId, otherUserId) {
  const [existing] = await con.execute(
    `SELECT c.id
     FROM conversations c
     JOIN conversation_users cu1 ON cu1.conversation_id = c.id AND cu1.user_id = ?
     JOIN conversation_users cu2 ON cu2.conversation_id = c.id AND cu2.user_id = ?
     WHERE (SELECT COUNT(*) FROM conversation_users WHERE conversation_id = c.id) = 2
     LIMIT 1`,
    [userId, otherUserId]
  );

  if (existing.length > 0) {
    return { id: existing[0].id, isNew: false };
  }

  const newId = randomUUID();
  await con.execute(`INSERT INTO conversations (id) VALUES (?)`, [newId]);
  await con.execute(
    `INSERT INTO conversation_users (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
    [newId, userId, newId, otherUserId]
  );

  return { id: newId, isNew: true };
}


async function clearConversationForUser(conversationId, userId) {
  await con.execute(
    `UPDATE conversation_users SET cleared_at = NOW() WHERE conversation_id = ? AND user_id = ?`,
    [conversationId, userId]
  );
}

module.exports = { getConversationsForUser, getOrCreateConversation, clearConversationForUser  };