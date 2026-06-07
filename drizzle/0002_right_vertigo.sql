CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'ended');--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "status" "match_status" DEFAULT 'scheduled';