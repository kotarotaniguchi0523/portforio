import crypto from 'crypto'
import { findUserById, createUser, getUserStampsWithLecture, addStamp as dbAddStamp } from '../db/index.js'

// インメモリのセッションストア。セッションIDとユーザーIDをマッピングします。
// 本番環境ではRedisやデータベースを使った永続的なセッションストアを使用するべきです。
const sessions = {}

/**
 * 指定されたユーザーIDの新しいセッションを作成します。
 * @param {string} userId - データベース内のユーザーの永続的なID。
 * @returns {string} 新しいセッションID。
 */
export function createSession(userId) {
  const sessionId = crypto.randomUUID()
  sessions[sessionId] = { userId }
  return sessionId
}

/**
 * セッションIDに基づいてユーザーとスタンプのデータを取得します。
 * @param {string} sessionId - セッションのID。
 * @returns {{user: object, stamps: Array<{date: string, lectureType: string}>} | undefined}
 */
export function getSessionData(sessionId) {
  const session = sessions[sessionId]
  if (!session) {
    return undefined
  }

  const user = findUserById(session.userId)
  if (!user) {
    // ユーザーがDBから削除されたが、セッションがメモリに残っている場合に発生する可能性がある
    delete sessions[sessionId]
    return undefined
  }

  const stamps = getUserStampsWithLecture(user.id)

  return {
    user: {
      id: user.id,
      username: user.displayName, // 既存コンポーネントとの互換性のために `username` を維持
    },
    stamps,
  }
}

/**
 * LINEユーザーIDでユーザーを検索し、存在しない場合は新規作成します。
 * @param {string} id - LINEユーザーID。
 * @param {string} displayName - LINE表示名。
 * @returns {object} 発見または作成されたユーザーオブジェクト。
 */
export function findOrCreateUser(id, displayName) {
  let user = findUserById(id)
  if (!user) {
    user = createUser(id, displayName)
    console.log(`New user created: ${displayName} (ID: ${id})`)
  }
  return user
}

/**
 * 指定されたユーザーのスタンプをデータベースに追加します。
 * @param {string} userId - ユーザーのID。
 * @param {string} date - ISO日付文字列 (YYYY-MM-DD)。
 * @param {string} lectureType - 講義の種類。
 */
export function addStamp(userId, date, lectureType) {
  dbAddStamp(userId, date, lectureType)
}

/**
 * セッションIDに関連付けられたユーザーIDを取得します。
 * @param {string} sessionId - セッションID。
 * @returns {string | undefined} ユーザーIDまたはundefined。
 */
export function getUserIdFromSession(sessionId) {
    return sessions[sessionId]?.userId
}
