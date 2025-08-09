-- ユーザーテーブル
-- LINEのユーザー情報を格納します
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,          -- LINEのユーザーID
  displayName TEXT NOT NULL,    -- LINEの表示名
  createdAt DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- スタンプテーブル
-- ユーザーのスタンプ記録を格納します
CREATE TABLE IF NOT EXISTS stamps (
  userId TEXT NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD形式の日付
  lectureType TEXT NOT NULL,    -- 講義の種類
  createdAt DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
  PRIMARY KEY (userId, date),
  FOREIGN KEY (userId) REFERENCES users(id)
);
