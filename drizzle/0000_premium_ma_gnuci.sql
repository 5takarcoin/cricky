CREATE TYPE "public"."user_role" AS ENUM('player', 'manager', 'both');--> statement-breakpoint
CREATE TYPE "public"."bowl_type" AS ENUM('seam', 'spin');--> statement-breakpoint
CREATE TYPE "public"."hand" AS ENUM('right', 'left');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('bat', 'bowl', 'all', 'wk');--> statement-breakpoint
CREATE TYPE "public"."tournament_type" AS ENUM('invite', 'fc', 'application');--> statement-breakpoint
CREATE TYPE "public"."team_tournament_status" AS ENUM('pending', 'requested', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."match_result" AS ENUM('team1_win', 'team2_win', 'tie', 'no_result', 'pending');--> statement-breakpoint
CREATE TYPE "public"."extra_type" AS ENUM('none', 'wide', 'no_ball', 'bye', 'leg_bye', 'penalty');--> statement-breakpoint
CREATE TYPE "public"."wicket_type" AS ENUM('bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'obstructing', 'timed_out', 'handled_ball');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'player' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"image_url" text,
	"video_url" text,
	"role" "role" NOT NULL,
	"bat_hand" "hand",
	"bowl_type" "bowl_type",
	"bowl_hand" "hand",
	"card1" text,
	"card2" text,
	"card3" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "players_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"bio" text,
	"location" text,
	"captain_id" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "teams_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "player_teams" (
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	CONSTRAINT "player_teams_player_id_team_id_pk" PRIMARY KEY("player_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"venue" text,
	"overs" integer NOT NULL,
	"type" "tournament_type" NOT NULL,
	"description" text,
	"rules" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tournament_managers" (
	"tournament_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tournament_managers_tournament_id_player_id_pk" PRIMARY KEY("tournament_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_teams" (
	"tournament_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"status" "team_tournament_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tournament_teams_tournament_id_team_id_pk" PRIMARY KEY("tournament_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"team1_id" integer NOT NULL,
	"team2_id" integer NOT NULL,
	"result" "match_result" DEFAULT 'pending',
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"delivery_number" integer NOT NULL,
	"inning" integer NOT NULL,
	"over" integer NOT NULL,
	"ball" integer NOT NULL,
	"striker_id" integer,
	"non_striker_id" integer,
	"bowler_id" integer,
	"runs_from_bat" integer DEFAULT 0 NOT NULL,
	"extra_runs" integer DEFAULT 0 NOT NULL,
	"extra_type" "extra_type" DEFAULT 'none' NOT NULL,
	"is_legal_ball" boolean DEFAULT true NOT NULL,
	"wicket_type" "wicket_type",
	"player_dismissed_id" integer,
	"fielder_id" integer,
	"next_batter_id" integer,
	"commentary" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"venue" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_id_players_id_fk" FOREIGN KEY ("captain_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_teams" ADD CONSTRAINT "player_teams_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_teams" ADD CONSTRAINT "player_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_managers" ADD CONSTRAINT "tournament_managers_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_managers" ADD CONSTRAINT "tournament_managers_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team1_id_teams_id_fk" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team2_id_teams_id_fk" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_striker_id_players_id_fk" FOREIGN KEY ("striker_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_non_striker_id_players_id_fk" FOREIGN KEY ("non_striker_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_bowler_id_players_id_fk" FOREIGN KEY ("bowler_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_player_dismissed_id_players_id_fk" FOREIGN KEY ("player_dismissed_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_fielder_id_players_id_fk" FOREIGN KEY ("fielder_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_next_batter_id_players_id_fk" FOREIGN KEY ("next_batter_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;