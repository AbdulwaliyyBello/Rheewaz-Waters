CREATE TYPE "public"."user_role" AS ENUM('boss', 'admin', 'worker');--> statement-breakpoint
CREATE TYPE "public"."week_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."weekday" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat');--> statement-breakpoint
CREATE TABLE "daily_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"weekday" "weekday" NOT NULL,
	"date" date NOT NULL,
	"bags" integer DEFAULT 0 NOT NULL,
	"cash" numeric(12, 2) DEFAULT '0' NOT NULL,
	"transfer" numeric(12, 2) DEFAULT '0' NOT NULL,
	"road_expenses" numeric(12, 2) DEFAULT '0' NOT NULL,
	"submitted" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"weekday" "weekday" NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"submitted" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nylon_roll_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"weekday" "weekday" NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"verification_token" text,
	"verification_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"week_end" date NOT NULL,
	"status" "week_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_expenses" ADD CONSTRAINT "factory_expenses_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_expenses" ADD CONSTRAINT "factory_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nylon_roll_expenses" ADD CONSTRAINT "nylon_roll_expenses_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nylon_roll_expenses" ADD CONSTRAINT "nylon_roll_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_records_week_worker_day_unique" ON "daily_records" USING btree ("week_id","worker_id","weekday");--> statement-breakpoint
CREATE INDEX "daily_records_week_idx" ON "daily_records" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "daily_records_worker_idx" ON "daily_records" USING btree ("worker_id");--> statement-breakpoint
CREATE UNIQUE INDEX "factory_expenses_week_day_unique" ON "factory_expenses" USING btree ("week_id","weekday");--> statement-breakpoint
CREATE INDEX "factory_expenses_week_idx" ON "factory_expenses" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "nylon_roll_expenses_week_idx" ON "nylon_roll_expenses" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_active_idx" ON "users" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "weeks_week_start_unique" ON "weeks" USING btree ("week_start");--> statement-breakpoint
CREATE INDEX "weeks_status_idx" ON "weeks" USING btree ("status");