import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Auth.js required tables
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp" }),
  image: text("image"),
  passwordHash: text("password_hash"), // Added for Credentials provider
});

export const accounts = sqliteTable("accounts", {
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationTokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// Application tables (D-09, D-10)
export const cases = sqliteTable("cases", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name"), // Nullable -- auto-populated from PDF in Phase 3 (D-10)
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

export const documents = sqliteTable("documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  caseId: text("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "complaint" | "discovery_request"
  filename: text("filename").notNull(),
  blobUrl: text("blob_url").notNull(), // Vercel Blob URL
  mimeType: text("mime_type"),
  subType: text("sub_type"), // "rfp" | "interrogatory" | null
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

export const extractedRequests = sqliteTable("extracted_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  requestNumber: integer("request_number").notNull(),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Drizzle relations for query API (db.query.*)
export const casesRelations = relations(cases, ({ many }) => ({
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id],
  }),
  extractedRequests: many(extractedRequests),
}));

export const generatedResponses = sqliteTable("generated_responses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  requestId: text("request_id")
    .notNull()
    .references(() => extractedRequests.id, { onDelete: "cascade" }),
  pattern: text("pattern").notNull(), // "produced_all" | "no_such_documents" | "objection" | "cross_reference"
  objectionTypes: text("objection_types"), // JSON string: '["privilege","overbroad_irrelevant"]' or null
  responseText: text("response_text").notNull(),
  crossReferenceNumber: integer("cross_reference_number"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

export const extractedRequestsRelations = relations(extractedRequests, ({ one, many }) => ({
  document: one(documents, {
    fields: [extractedRequests.documentId],
    references: [documents.id],
  }),
  generatedResponse: many(generatedResponses),
}));

export const generatedResponsesRelations = relations(generatedResponses, ({ one }) => ({
  request: one(extractedRequests, {
    fields: [generatedResponses.requestId],
    references: [extractedRequests.id],
  }),
}));
