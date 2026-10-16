import { pgTable, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const extractions = pgTable("extractions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sourceUrl: text("source_url").notNull(),
  platform: text("platform").notNull(),
  uploader: text("uploader"),
  duration: integer("duration"),
  thumbnail: text("thumbnail"),
  cookies: text("cookies"),
  proxy: text("proxy"),
  infoPath: text("info_path"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const extractionFormats = pgTable("extraction_formats", {
  id: text("id").primaryKey(),
  extractionId: text("extraction_id")
    .notNull()
    .references(() => extractions.id),
  type: text("type").notNull(),
  label: text("label"),
  ext: text("ext").notNull(),
  width: integer("width"),
  height: integer("height"),
  filesize: integer("filesize"),
  hasAudio: boolean("has_audio"),
  formatId: text("format_id"),
  priority: integer("priority").default(0),
  metadata: jsonb("metadata"),
});
