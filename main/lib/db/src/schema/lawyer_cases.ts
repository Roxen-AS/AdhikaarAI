import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { lawyerProfiles } from "./lawyer_profiles";

export const lawyerCases = pgTable("lawyer_cases", {
  id: serial("id").primaryKey(),
  lawyerProfileId: integer("lawyer_profile_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  court: text("court"),
  year: integer("year"),
  outcome: text("outcome").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLawyerCaseSchema = createInsertSchema(lawyerCases).omit({ id: true, createdAt: true });
export type LawyerCase = typeof lawyerCases.$inferSelect;
export type InsertLawyerCase = z.infer<typeof insertLawyerCaseSchema>;
