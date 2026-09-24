-- Rheewaz Waters — Phase 2 migration
-- Additive only. Does not alter or drop any Phase 1 table/column.
-- Apply after 0000_init.sql, via `npm run db:migrate` or pasted into the
-- Neon SQL editor.

CREATE TYPE "truck_type" AS ENUM ('dyna', 'hijet');
CREATE TYPE "trip_status" AS ENUM ('arrived', 'loading', 'loading_complete', 'departed', 'ai_review', 'boss_reviewed');
CREATE TYPE "prediction_source" AS ENUM ('manual', 'model');
CREATE TYPE "ai_verification_status" AS ENUM ('not_verified', 'verified', 'review_required');
CREATE TYPE "training_error_type" AS ENUM (
  'missed_bag', 'false_bag', 'wrong_row_count', 'wrong_incomplete_row_count',
  'wrong_top_bag_count', 'wrong_arrival_count', 'wrong_departure_count',
  'wrong_truck', 'wrong_object_classification', 'excluded_drinking_water',
  'excluded_nylon', 'other'
);
CREATE TYPE "training_run_status" AS ENUM ('collecting', 'training', 'evaluating', 'promoted', 'rejected');

-- ============================================================
-- DEBT REPAYMENTS — append-only, dedicated entity (never mixed
-- with daily sales records).
-- ============================================================
CREATE TABLE "debt_repayments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "worker_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "source_week_id" uuid NOT NULL REFERENCES "weeks"("id") ON DELETE RESTRICT,
  "previous_outstanding" numeric(12,2) NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "remaining_outstanding" numeric(12,2) NOT NULL,
  "submitted_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "submitted_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "debt_repayments_worker_idx" ON "debt_repayments" ("worker_id");
CREATE INDEX "debt_repayments_week_idx" ON "debt_repayments" ("source_week_id");
ALTER TABLE "debt_repayments" ADD CONSTRAINT "debt_repayments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "debt_repayments" ADD CONSTRAINT "debt_repayments_remaining_nonneg" CHECK ("remaining_outstanding" >= 0);

-- ============================================================
-- TRUCKS + ASSIGNMENTS
-- ============================================================
CREATE TABLE "trucks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(120) NOT NULL,
  "type" "truck_type" NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "bags_across" integer NOT NULL,
  "bag_lines" integer NOT NULL,
  "bonus_bags" integer NOT NULL,
  "bonus_threshold" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "trucks_name_unique" ON "trucks" ("name");

CREATE TABLE "truck_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "worker_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "truck_id" uuid NOT NULL REFERENCES "trucks"("id") ON DELETE RESTRICT,
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  "unassigned_at" timestamptz,
  "assigned_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "truck_assignments_worker_idx" ON "truck_assignments" ("worker_id");
CREATE INDEX "truck_assignments_truck_idx" ON "truck_assignments" ("truck_id");

-- ============================================================
-- TRIPS + FOOTAGE
-- ============================================================
CREATE TABLE "trips" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "worker_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "truck_id" uuid NOT NULL REFERENCES "trucks"("id") ON DELETE RESTRICT,
  "date" date NOT NULL,
  "arrival_time" timestamptz,
  "loading_started_at" timestamptz,
  "loading_completed_at" timestamptz,
  "departed_at" timestamptz,
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
  "status" "trip_status" NOT NULL DEFAULT 'arrived',
  "reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "trips_worker_idx" ON "trips" ("worker_id");
CREATE INDEX "trips_truck_idx" ON "trips" ("truck_id");
CREATE INDEX "trips_date_idx" ON "trips" ("date");
CREATE INDEX "trips_status_idx" ON "trips" ("status");

CREATE TABLE "trip_footage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "label" varchar(120),
  "url" text NOT NULL,
  "captured_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "trip_footage_trip_idx" ON "trip_footage" ("trip_id");

-- ============================================================
-- AI MODEL VERSIONS + TRAINING
-- ============================================================
CREATE TABLE "ai_model_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "truck_type" "truck_type" NOT NULL,
  "version" integer NOT NULL,
  "training_run_id" uuid,
  "is_production" boolean NOT NULL DEFAULT false,
  "evaluation_score" real,
  "evaluation_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "promoted_at" timestamptz
);
CREATE UNIQUE INDEX "ai_model_versions_truck_version_unique" ON "ai_model_versions" ("truck_type", "version");
CREATE INDEX "ai_model_versions_truck_idx" ON "ai_model_versions" ("truck_type");

CREATE TABLE "ai_training_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "truck_type" "truck_type" NOT NULL,
  "status" "training_run_status" NOT NULL DEFAULT 'collecting',
  "resulting_model_version_id" uuid REFERENCES "ai_model_versions"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "started_training_at" timestamptz,
  "evaluated_at" timestamptz,
  "promoted_at" timestamptz,
  "notes" text
);
CREATE INDEX "ai_training_runs_truck_idx" ON "ai_training_runs" ("truck_type");

CREATE TABLE "ai_training_examples" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE RESTRICT,
  "truck_type" "truck_type" NOT NULL,
  "ai_predicted_bags" integer NOT NULL,
  "boss_actual_bags" integer NOT NULL,
  "error_type" "training_error_type" NOT NULL,
  "boss_note" text,
  "model_version_id" uuid REFERENCES "ai_model_versions"("id") ON DELETE SET NULL,
  "training_run_id" uuid REFERENCES "ai_training_runs"("id") ON DELETE SET NULL,
  "reviewed_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "ai_training_examples_trip_idx" ON "ai_training_examples" ("trip_id");
CREATE INDEX "ai_training_examples_truck_idx" ON "ai_training_examples" ("truck_type");
CREATE INDEX "ai_training_examples_run_idx" ON "ai_training_examples" ("training_run_id");

-- ============================================================
-- DISCREPANCY REVIEWS
-- ============================================================
CREATE TABLE "discrepancy_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "worker_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "date" date NOT NULL,
  "verified_bags" integer NOT NULL,
  "worker_reported_bags" integer NOT NULL,
  "resolution_note" text,
  "resolved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "discrepancy_reviews_worker_date_unique" ON "discrepancy_reviews" ("worker_id", "date");
