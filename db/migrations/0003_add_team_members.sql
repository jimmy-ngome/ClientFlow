CREATE TABLE IF NOT EXISTS "team_members" (
  "id" serial PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "created_at" timestamp DEFAULT now()
);
