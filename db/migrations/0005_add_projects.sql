CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "company" text,
  "city" varchar(100),
  "assigned_to" varchar(100),
  "start_date" date NOT NULL,
  "end_date" date,
  "notes" text,
  "color" varchar(7) DEFAULT '#6366f1',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);