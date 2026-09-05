-- Rheewaz Waters — initial schema
-- Generated to match src/db/schema.ts. Apply with `npm run db:migrate`,
-- or paste directly into the Neon SQL editor / any Postgres client.

CREATE TYPE "user_role" AS ENUM ('boss', 'admin', 'worker');
CREATE TYPE "week_status" AS ENUM ('open', 'closed');
CREATE TYPE "weekday" AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(120) NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" text NOT NULL,
  "role" "user_role" NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "email_verified" boolean NOT NULL DEFAULT false,
  "verification_token" text,
  "verification_token_expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");
CREATE INDEX "users_role_idx" ON "users" ("role");
CREATE INDEX "users_active_idx" ON "users" ("active");

CREATE TABLE "weeks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "week_start" date NOT NULL,
  "week_end" date NOT NULL,
  "status" "week_status" NOT NULL DEFAULT 'open',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "closed_at" timestamptz
);
CREATE UNIQUE INDEX "weeks_week_start_unique" ON "weeks" ("week_start");
CREATE INDEX "weeks_status_idx" ON "weeks" ("status");

CREATE TABLE "daily_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "week_id" uuid NOT NULL REFERENCES "weeks"("id") ON DELETE RESTRICT,
  "worker_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "weekday" "weekday" NOT NULL,
  "date" date NOT NULL,
  "bags" integer NOT NULL DEFAULT 0,
  "cash" numeric(12,2) NOT NULL DEFAULT 0,
  "transfer" numeric(12,2) NOT NULL DEFAULT 0,
  "road_expenses" numeric(12,2) NOT NULL DEFAULT 0,
  "submitted" boolean NOT NULL DEFAULT false,
  "submitted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "daily_records_week_worker_day_unique" ON "daily_records" ("week_id", "worker_id", "weekday");
CREATE INDEX "daily_records_week_idx" ON "daily_records" ("week_id");
CREATE INDEX "daily_records_worker_idx" ON "daily_records" ("worker_id");
-- Guard rails matching the business rules (bags/money can never go negative):
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_bags_nonneg" CHECK ("bags" >= 0);
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_cash_nonneg" CHECK ("cash" >= 0);
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_transfer_nonneg" CHECK ("transfer" >= 0);
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_road_nonneg" CHECK ("road_expenses" >= 0);

CREATE TABLE "factory_expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "week_id" uuid NOT NULL REFERENCES "weeks"("id") ON DELETE RESTRICT,
  "weekday" "weekday" NOT NULL,
  "date" date NOT NULL,
  "amount" numeric(12,2) NOT NULL DEFAULT 0,
  "submitted" boolean NOT NULL DEFAULT false,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "factory_expenses_week_day_unique" ON "factory_expenses" ("week_id", "weekday");
CREATE INDEX "factory_expenses_week_idx" ON "factory_expenses" ("week_id");
ALTER TABLE "factory_expenses" ADD CONSTRAINT "factory_expenses_amount_nonneg" CHECK ("amount" >= 0);

CREATE TABLE "nylon_roll_expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "week_id" uuid NOT NULL REFERENCES "weeks"("id") ON DELETE RESTRICT,
  "weekday" "weekday" NOT NULL,
  "date" date NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "nylon_roll_expenses_week_idx" ON "nylon_roll_expenses" ("week_id");
ALTER TABLE "nylon_roll_expenses" ADD CONSTRAINT "nylon_roll_expenses_amount_positive" CHECK ("amount" > 0);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "issued_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "user_agent" text
);
CREATE INDEX "sessions_user_idx" ON "sessions" ("user_id");
