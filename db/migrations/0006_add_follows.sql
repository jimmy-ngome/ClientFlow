CREATE TABLE IF NOT EXISTS "follows" (
  "id" serial PRIMARY KEY NOT NULL,
  "follower_id" integer NOT NULL,
  "following_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_team_members_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_team_members_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
