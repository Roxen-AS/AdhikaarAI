import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  citizenId: integer("citizen_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lawyerId: integer("lawyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertConnectionSchema = createInsertSchema(connections).omit({ id: true, createdAt: true });
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
