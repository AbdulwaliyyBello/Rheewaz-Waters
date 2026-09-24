CREATE TYPE "public"."ai_verification_status" AS ENUM('not_verified', 'verified', 'review_required');--> statement-breakpoint
CREATE TYPE "public"."prediction_source" AS ENUM('manual', 'model');--> statement-breakpoint
CREATE TYPE "public"."training_error_type" AS ENUM('missed_bag', 'false_bag', 'wrong_row_count', 'wrong_incomplete_row_count', 'wrong_top_bag_count', 'wrong_arrival_count', 'wrong_departure_count', 'wrong_truck', 'wrong_object_classification', 'excluded_drinking_water', 'excluded_nylon', 'other');--> statement-breakpoint
CREATE TYPE "public"."training_run_status" AS ENUM('collecting', 'training', 'evaluating', 'promoted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('arrived', 'loading', 'loading_complete', 'departed', 'ai_review', 'boss_reviewed');--> statement-breakpoint
CREATE TYPE "public"."truck_type" AS ENUM('dyna', 'hijet');--> statement-breakpoint
CREATE TABLE "ai_model_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_type" "truck_type" NOT NULL,
	"version" integer NOT NULL,
	"training_run_id" uuid,
	"is_production" boolean DEFAULT false NOT NULL,
	"evaluation_score" real,
	"evaluation_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promoted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_training_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"truck_type" "truck_type" NOT NULL,
	"ai_predicted_bags" integer NOT NULL,
	"boss_actual_bags" integer NOT NULL,
	"error_type" "training_error_type" NOT NULL,
	"boss_note" text,
	"model_version_id" uuid,
	"training_run_id" uuid,
	"reviewed_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_training_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_type" "truck_type" NOT NULL,
	"status" "training_run_status" DEFAULT 'collecting' NOT NULL,
	"resulting_model_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_training_at" timestamp with time zone,
	"evaluated_at" timestamp with time zone,
	"promoted_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "debt_repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"source_week_id" uuid NOT NULL,
	"previous_outstanding" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"remaining_outstanding" numeric(12, 2) NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discrepancy_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"date" date NOT NULL,
	"verified_bags" integer NOT NULL,
	"worker_reported_bags" integer NOT NULL,
	"resolution_note" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_footage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"label" varchar(120),
	"url" text NOT NULL,
	"captured_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"truck_id" uuid NOT NULL,
	"date" date NOT NULL,
	"arrival_time" timestamp with time zone,
	"loading_started_at" timestamp with time zone,
	"loading_completed_at" timestamp with time zone,
	"departed_at" timestamp with time zone,
	"physical_arrival_bags" integer,
	"physical_departure_bags" integer,
	"new_bags_loaded" integer,
	"bonus_bags" integer,
	"company_bags" integer,
	"ai_arrival_bags" integer,
	"ai_departure_bags" integer,
	"ai_new_bags" integer,
	"ai_bonus_bags" integer,
	"ai_company_bags" integer,
	"ai_confidence" real,
	"ai_model_version_id" uuid,
	"boss_final_bags" integer,
	"status" "trip_status" DEFAULT 'arrived' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "truck_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"truck_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone,
	"assigned_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "trucks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "truck_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"bags_across" integer NOT NULL,
	"bag_lines" integer NOT NULL,
	"bonus_bags" integer NOT NULL,
	"bonus_threshold" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nylon_roll_expenses" DROP CONSTRAINT "nylon_roll_expenses_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "nylon_roll_expenses" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_training_examples" ADD CONSTRAINT "ai_training_examples_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_training_examples" ADD CONSTRAINT "ai_training_examples_model_version_id_ai_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."ai_model_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_training_examples" ADD CONSTRAINT "ai_training_examples_training_run_id_ai_training_runs_id_fk" FOREIGN KEY ("training_run_id") REFERENCES "public"."ai_training_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_training_examples" ADD CONSTRAINT "ai_training_examples_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_training_runs" ADD CONSTRAINT "ai_training_runs_resulting_model_version_id_ai_model_versions_id_fk" FOREIGN KEY ("resulting_model_version_id") REFERENCES "public"."ai_model_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_repayments" ADD CONSTRAINT "debt_repayments_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_repayments" ADD CONSTRAINT "debt_repayments_source_week_id_weeks_id_fk" FOREIGN KEY ("source_week_id") REFERENCES "public"."weeks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_repayments" ADD CONSTRAINT "debt_repayments_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancy_reviews" ADD CONSTRAINT "discrepancy_reviews_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancy_reviews" ADD CONSTRAINT "discrepancy_reviews_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_footage" ADD CONSTRAINT "trip_footage_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "truck_assignments" ADD CONSTRAINT "truck_assignments_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "truck_assignments" ADD CONSTRAINT "truck_assignments_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "truck_assignments" ADD CONSTRAINT "truck_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_model_versions_truck_version_unique" ON "ai_model_versions" USING btree ("truck_type","version");--> statement-breakpoint
CREATE INDEX "ai_model_versions_truck_idx" ON "ai_model_versions" USING btree ("truck_type");--> statement-breakpoint
CREATE INDEX "ai_training_examples_trip_idx" ON "ai_training_examples" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "ai_training_examples_truck_idx" ON "ai_training_examples" USING btree ("truck_type");--> statement-breakpoint
CREATE INDEX "ai_training_examples_run_idx" ON "ai_training_examples" USING btree ("training_run_id");--> statement-breakpoint
CREATE INDEX "ai_training_runs_truck_idx" ON "ai_training_runs" USING btree ("truck_type");--> statement-breakpoint
CREATE INDEX "debt_repayments_worker_idx" ON "debt_repayments" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "debt_repayments_week_idx" ON "debt_repayments" USING btree ("source_week_id");--> statement-breakpoint
CREATE INDEX "debt_repayments_amount_idx" ON "debt_repayments" USING btree ("amount");--> statement-breakpoint
CREATE UNIQUE INDEX "discrepancy_reviews_worker_date_unique" ON "discrepancy_reviews" USING btree ("worker_id","date");--> statement-breakpoint
CREATE INDEX "trip_footage_trip_idx" ON "trip_footage" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trips_worker_idx" ON "trips" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "trips_truck_idx" ON "trips" USING btree ("truck_id");--> statement-breakpoint
CREATE INDEX "trips_date_idx" ON "trips" USING btree ("date");--> statement-breakpoint
CREATE INDEX "trips_status_idx" ON "trips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "truck_assignments_worker_idx" ON "truck_assignments" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "truck_assignments_truck_idx" ON "truck_assignments" USING btree ("truck_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trucks_name_unique" ON "trucks" USING btree ("name");--> statement-breakpoint
ALTER TABLE "nylon_roll_expenses" ADD CONSTRAINT "nylon_roll_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;