import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const lawyerProfiles = pgTable("lawyer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  barId: text("bar_id"),
  barCouncil: text("bar_council"),
  verified: boolean("verified").default(false).notNull(),
  yearsPractice: integer("years_practice").default(0).notNull(),
  profilePicUrl: text("profile_pic_url"),
  consultationFee: integer("consultation_fee").default(5000).notNull(),
  bio: text("bio"),
  city: text("city"),
  state: text("state"),
  practiceAreas: text("practice_areas").array().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLawyerProfileSchema = createInsertSchema(lawyerProfiles).omit({ id: true, createdAt: true });
export type LawyerProfile = typeof lawyerProfiles.$inferSelect;
export type InsertLawyerProfile = z.infer<typeof insertLawyerProfileSchema>;
