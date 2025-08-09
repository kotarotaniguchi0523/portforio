import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

// データベースファイルのパス (プロジェクトルートに 'data.db' を作成)
const dbPath = path.resolve(process.cwd(), 'data.db')

// データベースインスタンスを作成
const db = new Database(dbPath)

// 初回起動時にテーブルを作成する
try {
  const schema = fs.readFileSync(path.resolve(process.cwd(), 'src/db/schema.sql'), 'utf8')
  db.exec(schema)
  console.log('Database tables are ready.')
} catch (error) {
  console.error('Error initializing database:', error)
}

// データベース操作関数

/**
 * ユーザーIDでユーザーを検索する
 * @param {string} id - LINEのユーザーID
 * @returns {object|undefined} ユーザーオブジェクト or undefined
 */
export function findUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  return stmt.get(id)
}

/**
 * 新しいユーザーを作成する
 * @param {string} id - LINEのユーザーID
 * @param {string} displayName - LINEの表示名
 * @returns {object} 作成されたユーザーオブジェクト
 */
export function createUser(id, displayName) {
  const stmt = db.prepare('INSERT INTO users (id, displayName) VALUES (?, ?)')
  stmt.run(id, displayName)
  // 2回目のデータベースクエリを避けるために、引数からユーザーオブジェクトを構築します。
  return { id, displayName }
}

/**
 * ユーザーのスタンプセットを取得する
 * @param {string} userId - LINEのユーザーID
 * @returns {Set<string>} スタンプが押された日付 (YYYY-MM-DD) のセット
 */
export function getUserStamps(userId) {
  const stmt = db.prepare('SELECT date FROM stamps WHERE userId = ?')
  const rows = stmt.all(userId)
  const dates = rows.map(row => row.date)
  return new Set(dates)
}

/**
 * ユーザーのスタンプ情報を取得する（講義情報付き）
 * @param {string} userId - LINEのユーザーID
 * @returns {Array<{date: string, lectureType: string}>} スタンプ情報の配列
 */
export function getUserStampsWithLecture(userId) {
  const stmt = db.prepare('SELECT date, lectureType FROM stamps WHERE userId = ?')
  return stmt.all(userId)
}

/**
 * スタンプを追加または更新する
 * @param {string} userId - LINEのユーザーID
 * @param {string} date - YYYY-MM-DD形式の日付
 * @param {string} lectureType - 講義の種類
 */
export function addStamp(userId, date, lectureType) {
  // REPLACE INTOは、PRIMARY KEYが競合した場合にUPDATEを行う
  const stmt = db.prepare('REPLACE INTO stamps (userId, date, lectureType) VALUES (?, ?, ?)')
  stmt.run(userId, date, lectureType)
}

// アプリケーション終了時にデータベース接続を閉じる
process.on('exit', () => db.close())
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))
