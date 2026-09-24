import {
  pgTable, pgEnum, uuid, text, varchar, boolean, date, integer, numeric,
  timestamp, uniqueIndex, index, jsonb, real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ============================================================
   PHASE 1 — EXISTING ENUMS
   ============================================================ */
export const userRoleEnum = pgEnum("user_role", ["boss", "admin", "worker"]);
export const weekStatusEnum = pgEnum("week_status", ["open", "closed"]);
export const weekdayEnum = pgEnum("weekday", ["mon", "tue", "wed", "thu", "fri", "sat"]);

/* ============================================================
   PHASE 2 — NEW ENUMS
   ============================================================ */
export const truckTypeEnum = pgEnum("truck_type", ["dyna", "hijet"]);
export const tripStatusEnum = pgEnum("trip_status", [
  "arrived", "loading", "loading_complete", "departed", "ai_review", "boss_reviewed",
]);
export const predictionSourceEnum = pgEnum("prediction_source", ["manual", "model"]);
export const aiVerificationStatusEnum = pgEnum("ai_verification_status", [
  "not_verified", "verified", "review_required",
]);
export const trainingErrorTypeEnum = pgEnum("training_error_type", [
  "missed_bag", "false_bag", "wrong_row_count", "wrong_incomplete_row_count",
  "wrong_top_bag_count", "wrong_arrival_count", "wrong_departure_count",
  "wrong_truck", "wrong_object_classification", "excluded_drinking_water",
  "excluded_nylon", "other",
]);
export const trainingRunStatusEnum = pgEnum("training_run_status", [
  "collecting", "training", "evaluating", "promoted", "rejected",
]);

/* ============================================================
   PHASE 1 — USERS
   ============================================================ */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailUnique: uniqueIndex("users_email_unique").on(t.email),
  roleIdx: index("users_role_idx").on(t.role),
  activeIdx: index("users_active_idx").on(t.active),
}));

/* ============================================================
   PHASE 1 — WEEKS
   ============================================================ */
export const weeks = pgTable("weeks", {
  id: uuid("id").defaultRandom().primaryKey(),
  weekStart: date("week_start", { mode: "date" }).notNull(),
  weekEnd: date("week_end", { mode: "date" }).notNull(),
  status: weekStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
}, (t) => ({
  weekStartUnique: uniqueIndex("weeks_week_start_unique").on(t.weekStart),
  statusIdx: index("weeks_status_idx").on(t.status),
}));

/* ============================================================
   PHASE 1 — DAILY WORKER RECORDS
   Phase 2 adds submission immutability: once `submitted` is true, the
   server rejects further worker-initiated updates (see /api/records POST).
   ============================================================ */
export const dailyRecords = pgTable("daily_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  weekId: uuid("week_id").notNull().references(() => weeks.id, { onDelete: "restrict" }),
  workerId: uuid("worker_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  weekday: weekdayEnum("weekday").notNull(),
  date: date("date", { mode: "date" }).notNull(),
  bags: integer("bags").notNull().default(0),
  cash: numeric("cash", { precision: 12, scale: 2 }).notNull().default("0"),
  transfer: numeric("transfer", { precision: 12, scale: 2 }).notNull().default("0"),
  roadExpenses: numeric("road_expenses", { precision: 12, scale: 2 }).notNull().default("0"),
  submitted: boolean("submitted").notNull().default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  oneRowPerWorkerPerDay: uniqueIndex("daily_records_week_worker_day_unique").on(t.weekId, t.workerId, t.weekday),
  weekIdx: index("daily_records_week_idx").on(t.weekId),
  workerIdx: index("daily_records_worker_idx").on(t.workerId),
}));

/* ============================================================
   PHASE 1 — FACTORY / NYLON EXPENSES
   ============================================================ */
export const factoryExpenses = pgTable("factory_expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  weekId: uuid("week_id").notNull().references(() => weeks.id, { onDelete: "restrict" }),
  weekday: weekdayEnum("weekday").notNull(),
  date: date("date", { mode: "date" }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  submitted: boolean("submitted").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  oneRowPerDay: uniqueIndex("factory_expenses_week_day_unique").on(t.weekId, t.weekday),
  weekIdx: index("factory_expenses_week_idx").on(t.weekId),
}));

export const nylonRollExpenses = pgTable("nylon_roll_expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  weekId: uuid("week_id").notNull().references(() => weeks.id, { onDelete: "restrict" }),
  weekday: weekdayEnum("weekday").notNull(),
  date: date("date", { mode: "date" }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ weekIdx: index("nylon_roll_expenses_week_idx").on(t.weekId) }));

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  userAgent: text("user_agent"),
}, (t) => ({ userIdx: index("sessions_user_idx").on(t.userId) }));

/* ============================================================
   PHASE 2 — DEBT REPAYMENTS
   Dedicated, append-only entity. Never edited or deleted; multiple
   partial repayments accumulate against a week's outstanding balance.
   ============================================================ */
export const debtRepayments = pgTable("debt_repayments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerId: uuid("worker_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  // The week whose finalized outstanding this repayment is reducing.
  sourceWeekId: uuid("source_week_id").notNull().references(() => weeks.id, { onDelete: "restrict" }),
  previousOutstanding: numeric("previous_outstanding", { precision: 12, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  remainingOutstanding: numeric("remaining_outstanding", { precision: 12, scale: 2 }).notNull(),
  submittedByUserId: uuid("submitted_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workerIdx: index("debt_repayments_worker_idx").on(t.workerId),
  weekIdx: index("debt_repayments_week_idx").on(t.sourceWeekId),
  amountPositive: index("debt_repayments_amount_idx").on(t.amount),
}));

/* ============================================================
   PHASE 2 — TRUCKS
   ============================================================ */
export const trucks = pgTable("trucks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(), // "Toyota Dyna", "Daihatsu Hijet"
  type: truckTypeEnum("type").notNull(),
  active: boolean("active").notNull().default(true),
  // Counting geometry, kept in the DB rather than hard-coded so a new truck
  // can be added later without a code change.
  bagsAcross: integer("bags_across").notNull(),
  bagLines: integer("bag_lines").notNull(),
  bonusBags: integer("bonus_bags").notNull(),
  bonusThreshold: integer("bonus_threshold").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ nameUnique: uniqueIndex("trucks_name_unique").on(t.name) }));

/* One active assignment per worker at a time; history is preserved because
   rows are never deleted, only closed out with unassignedAt. */
export const truckAssignments = pgTable("truck_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerId: uuid("worker_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  truckId: uuid("truck_id").notNull().references(() => trucks.id, { onDelete: "restrict" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  unassignedAt: timestamp("unassigned_at", { withTimezone: true }),
  assignedByUserId: uuid("assigned_by_user_id").references(() => users.id, { onDelete: "set null" }),
}, (t) => ({
  workerIdx: index("truck_assignments_worker_idx").on(t.workerId),
  truckIdx: index("truck_assignments_truck_idx").on(t.truckId),
}));

/* ============================================================
   PHASE 2 — TRIPS
   ============================================================ */
export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerId: uuid("worker_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  truckId: uuid("truck_id").notNull().references(() => trucks.id, { onDelete: "restrict" }),
  date: date("date", { mode: "date" }).notNull(),

  arrivalTime: timestamp("arrival_time", { withTimezone: true }),
  loadingStartedAt: timestamp("loading_started_at", { withTimezone: true }),
  loadingCompletedAt: timestamp("loading_completed_at", { withTimezone: true }),
  departedAt: timestamp("departed_at", { withTimezone: true }),

  physicalArrivalBags: integer("physical_arrival_bags"),
  physicalDepartureBags: integer("physical_departure_bags"),
  newBagsLoaded: integer("new_bags_loaded"),
  bonusBags: integer("bonus_bags"),
  companyBags: integer("company_bags"),

  aiArrivalBags: integer("ai_arrival_bags"),
  aiDepartureBags: integer("ai_departure_bags"),
  aiNewBags: integer("ai_new_bags"),
  aiBonusBags: integer("ai_bonus_bags"),
  aiCompanyBags: integer("ai_company_bags"),
  aiConfidence: real("ai_confidence"),
  aiModelVersionId: uuid("ai_model_version_id"), // FK added below via .references after modelVersions declared

  bossFinalBags: integer("boss_final_bags"),

  status: tripStatusEnum("status").notNull().default("arrived"),

  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workerIdx: index("trips_worker_idx").on(t.workerId),
  truckIdx: index("trips_truck_idx").on(t.truckId),
  dateIdx: index("trips_date_idx").on(t.date),
  statusIdx: index("trips_status_idx").on(t.status),
}));

/* Recorded evidence tied to a specific trip — separate from the live feed. */
export const tripFootage = pgTable("trip_footage", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 120 }), // e.g. "Final load frame", "Departure clip"
  url: text("url").notNull(), // storage URL (S3/Cloudflare R2/etc.) — no fake stream, must be a real asset
  capturedAt: timestamp("captured_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ tripIdx: index("trip_footage_trip_idx").on(t.tripId) }));

/* ============================================================
   PHASE 2 — AI MODEL VERSIONS & TRAINING
   ============================================================ */
export const aiModelVersions = pgTable("ai_model_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  truckType: truckTypeEnum("truck_type").notNull(),
  version: integer("version").notNull(), // 1, 2, 3... per truck type
  trainingRunId: uuid("training_run_id"), // set once the run that produced it exists
  isProduction: boolean("is_production").notNull().default(false),
  evaluationScore: real("evaluation_score"),
  evaluationNotes: text("evaluation_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  promotedAt: timestamp("promoted_at", { withTimezone: true }),
}, (t) => ({
  truckVersionUnique: uniqueIndex("ai_model_versions_truck_version_unique").on(t.truckType, t.version),
  truckIdx: index("ai_model_versions_truck_idx").on(t.truckType),
}));

export const aiTrainingRuns = pgTable("ai_training_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  truckType: truckTypeEnum("truck_type").notNull(),
  status: trainingRunStatusEnum("status").notNull().default("collecting"),
  resultingModelVersionId: uuid("resulting_model_version_id").references(() => aiModelVersions.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedTrainingAt: timestamp("started_training_at", { withTimezone: true }),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
  promotedAt: timestamp("promoted_at", { withTimezone: true }),
  notes: text("notes"),
}, (t) => ({ truckIdx: index("ai_training_runs_truck_idx").on(t.truckType) }));

/* Every Boss correction becomes a labelled training example automatically —
   no separate "save to training" step. */
export const aiTrainingExamples = pgTable("ai_training_examples", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "restrict" }),
  truckType: truckTypeEnum("truck_type").notNull(),
  aiPredictedBags: integer("ai_predicted_bags").notNull(),
  bossActualBags: integer("boss_actual_bags").notNull(),
  errorType: trainingErrorTypeEnum("error_type").notNull(),
  bossNote: text("boss_note"),
  modelVersionId: uuid("model_version_id").references(() => aiModelVersions.id, { onDelete: "set null" }),
  trainingRunId: uuid("training_run_id").references(() => aiTrainingRuns.id, { onDelete: "set null" }), // null until batched into a run
  reviewedBy: uuid("reviewed_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tripIdx: index("ai_training_examples_trip_idx").on(t.tripId),
  truckIdx: index("ai_training_examples_truck_idx").on(t.truckType),
  runIdx: index("ai_training_examples_run_idx").on(t.trainingRunId),
}));

/* ============================================================
   PHASE 2 — AI vs WORKER DISCREPANCY (derived/cached view row)
   Recomputed on read in most cases; this table lets the Boss persist a
   note/resolution against a specific day+worker discrepancy.
   ============================================================ */
export const discrepancyReviews = pgTable("discrepancy_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerId: uuid("worker_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  date: date("date", { mode: "date" }).notNull(),
  verifiedBags: integer("verified_bags").notNull(),
  workerReportedBags: integer("worker_reported_bags").notNull(),
  resolutionNote: text("resolution_note"),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workerDateUnique: uniqueIndex("discrepancy_reviews_worker_date_unique").on(t.workerId, t.date),
}));

/* ============================================================
   RELATIONS
   ============================================================ */
export const usersRelations = relations(users, ({ many }) => ({
  dailyRecords: many(dailyRecords),
  sessions: many(sessions),
  debtRepayments: many(debtRepayments),
  trips: many(trips),
}));
export const weeksRelations = relations(weeks, ({ many }) => ({
  dailyRecords: many(dailyRecords), factoryExpenses: many(factoryExpenses), nylonRollExpenses: many(nylonRollExpenses),
}));
export const dailyRecordsRelations = relations(dailyRecords, ({ one }) => ({
  week: one(weeks, { fields: [dailyRecords.weekId], references: [weeks.id] }),
  worker: one(users, { fields: [dailyRecords.workerId], references: [users.id] }),
}));
export const trucksRelations = relations(trucks, ({ many }) => ({
  assignments: many(truckAssignments), trips: many(trips),
}));
export const tripsRelations = relations(trips, ({ one, many }) => ({
  worker: one(users, { fields: [trips.workerId], references: [users.id] }),
  truck: one(trucks, { fields: [trips.truckId], references: [trucks.id] }),
  footage: many(tripFootage),
}));
export const debtRepaymentsRelations = relations(debtRepayments, ({ one }) => ({
  worker: one(users, { fields: [debtRepayments.workerId], references: [users.id] }),
  sourceWeek: one(weeks, { fields: [debtRepayments.sourceWeekId], references: [weeks.id] }),
}));

/* ============================================================
   TYPES
   ============================================================ */
export type User = typeof users.$inferSelect;
export type Week = typeof weeks.$inferSelect;
export type DailyRecord = typeof dailyRecords.$inferSelect;
export type Truck = typeof trucks.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type DebtRepayment = typeof debtRepayments.$inferSelect;
export type AiTrainingExample = typeof aiTrainingExamples.$inferSelect;
export type AiTrainingRun = typeof aiTrainingRuns.$inferSelect;
export type AiModelVersion = typeof aiModelVersions.$inferSelect;
