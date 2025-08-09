import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Users table based on LINE profile
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // LINE User ID
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  stamps: many(stamps),
}));

// Lectures table
export const lectures = sqliteTable('lectures', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const lecturesRelations = relations(lectures, ({ many }) => ({
  stamps: many(stamps),
}));

// Sessions table for persistent, DB-backed sessions
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // Session ID
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Stamps table
export const stamps = sqliteTable('stamps', {
  userId: text('user_id').notNull().references(() => users.id),
  lectureId: text('lecture_id').notNull().references(() => lectures.id),
  date: text('date').notNull(), // YYYY-MM-DD
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.date] }),
  };
});

export const stampsRelations = relations(stamps, ({ one }) => ({
  user: one(users, {
    fields: [stamps.userId],
    references: [users.id],
  }),
  lecture: one(lectures, {
    fields: [stamps.lectureId],
    references: [lectures.id],
  }),
}));
