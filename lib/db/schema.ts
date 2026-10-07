import { pgTable, uuid, text, integer, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';

export const subscriptionScores = pgTable('subscription_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  totalScore: integer('total_score').notNull(),
  housingScore: integer('housing_score').notNull(),
  dependentScore: integer('dependent_score').notNull(),
  subscriptionScore: integer('subscription_score').notNull(),
  tier: text('tier').notNull(),
  specialSupply: jsonb('special_supply').notNull(),
  inputSnapshot: jsonb('input_snapshot').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SubscriptionScore = typeof subscriptionScores.$inferSelect;
export type NewSubscriptionScore = typeof subscriptionScores.$inferInsert;

export const favorites = pgTable('favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  houseManageNo: text('house_manage_no').notNull(),
  complexName: text('complex_name').notNull(),
  region: text('region'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.houseManageNo)]);

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
