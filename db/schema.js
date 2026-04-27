import { pgTable, serial, text, timestamp, varchar, integer, real, date, primaryKey, boolean } from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }),
  phones: text("phones"),
  company: text("company"),
  city: varchar("city", { length: 100 }),
  status: varchar("status", { length: 30 }).notNull().default("prospect"),
  notes: text("notes"),
  estimatedBudget: real("estimated_budget"),
  firstContactDate: date("first_contact_date"),
  followUpDate: date("follow_up_date"),
  appointmentDate: date("appointment_date"),
  appointmentTime: varchar("appointment_time", { length: 5 }),
  foundBy: varchar("found_by", { length: 100 }),
  contactedBy: varchar("contacted_by", { length: 100 }),
  developedBy: varchar("developed_by", { length: 100 }),
  toCallback: boolean("to_callback"),
  deliveredOnTime: boolean("delivered_on_time"),
  noWebsite: boolean("no_website"),
  uglyWebsite: boolean("ugly_website"),
  reviewCount: integer("review_count"),
  website: text("website"),
  address: text("address"),
  googleMapsUrl: text("google_maps_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientTags = pgTable("client_tags", {
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.clientId, table.tagId] }),
]);

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  city: varchar("city", { length: 100 }),
  assignedTo: varchar("assigned_to", { length: 100 }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scheduleEvents = pgTable("schedule_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to", { length: 100 }).notNull(),
  date: date("date").notNull(),
  startTime: varchar("start_time", { length: 5 }),
  endTime: varchar("end_time", { length: 5 }),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  type: varchar("type", { length: 30 }).default("event"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  summary: text("summary").notNull(),
  date: date("date").notNull(),
  performedBy: varchar("performed_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => teamMembers.id, { onDelete: "cascade" }),
  followingId: integer("following_id").notNull().references(() => teamMembers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});
