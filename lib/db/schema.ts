import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

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
