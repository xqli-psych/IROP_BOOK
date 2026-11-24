import fs from "fs/promises";
import path from "path";
import "../config/env.js";
import { supabase } from "../config/supabase.js";

function escapeSqlValue(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") {
    return `'${val.replace(/'/g, "''")}'`;
  }
  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInserts(tableName, columns, rows) {
  if (!rows || rows.length === 0) return "";
  const lines = [];
  lines.push(`-- Data for ${tableName} (${rows.length} rows)`);
  
  for (const row of rows) {
    const colNames = columns.join(", ");
    const colValues = columns.map((c) => escapeSqlValue(row[c])).join(", ");
    lines.push(`INSERT INTO public.${tableName} (${colNames}) VALUES (${colValues}) ON CONFLICT (id) DO NOTHING;`);
  }
  return lines.join("\n") + "\n";
}

async function exportAll() {
  console.log("Fetching data from current Supabase instance...");

  const { data: stories, error: errStories } = await supabase.from("stories").select("*");
  if (errStories) throw errStories;

  const { data: storyPages, error: errPages } = await supabase.from("story_pages").select("*").order("page_number", { ascending: true });
  if (errPages) throw errPages;

  const { data: sessions, error: errSessions } = await supabase.from("sessions").select("*").order("updated_at", { ascending: true, nullsFirst: true });
  if (errSessions) throw errSessions;

  const { data: sessionLogs, error: errLogs } = await supabase.from("session_logs").select("*").order("created_at", { ascending: true });
  if (errLogs) throw errLogs;

  console.log(`Fetched:
- stories: ${stories.length}
- story_pages: ${storyPages.length}
- sessions: ${sessions.length}
- session_logs: ${sessionLogs.length}`);

  let sql = `-- ==============================================================================
-- SUPABASE COMPLETE MIGRATION SCRIPT
-- Generated on: ${new Date().toISOString()}
--
-- INSTRUCTIONS:
-- 1. Create your new Supabase project at https://supabase.com
-- 2. Open the SQL Editor in your new Supabase project dashboard.
-- 3. Paste this ENTIRE script and click "Run".
-- 4. In your backend/.env file, update:
--      SUPABASE_URL=https://<your-new-project-ref>.supabase.co
--      SUPABASE_KEY=<your-new-service-role-key>
-- 5. Restart your backend (npm start).
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    genre TEXT,
    estimated_time TEXT,
    total_parts INTEGER DEFAULT 14
);

CREATE TABLE IF NOT EXISTS public.story_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    left_image_url TEXT,
    right_image_url TEXT,
    page_text TEXT NOT NULL,
    avatar_comment TEXT,
    mst_prompt TEXT,
    mst_response TEXT,
    follow_up_prompt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code TEXT,
    participation_id TEXT,
    current_page_number INTEGER DEFAULT 0,
    story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    page_id UUID,
    participation_id TEXT,
    story_page_text TEXT,
    transcript TEXT,
    mst_detected BOOLEAN DEFAULT FALSE,
    mst_analysis TEXT,
    child_response TEXT,
    conversation_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    question_text TEXT,
    emotion_match TEXT,
    follow_up_question TEXT
);

-- Disable Row Level Security (RLS) so service/anon keys have full read/write access
ALTER TABLE public.stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs DISABLE ROW LEVEL SECURITY;

-- 3. Insert All Data
\n`;

  // Stories
  if (stories.length > 0) {
    const cols = Object.keys(stories[0]);
    sql += generateInserts("stories", cols, stories) + "\n";
  }

  // Story Pages
  if (storyPages.length > 0) {
    const cols = Object.keys(storyPages[0]);
    sql += generateInserts("story_pages", cols, storyPages) + "\n";
  }

  // Sessions
  if (sessions.length > 0) {
    const cols = Object.keys(sessions[0]);
    sql += generateInserts("sessions", cols, sessions) + "\n";
  }

  // Session Logs
  if (sessionLogs.length > 0) {
    const cols = Object.keys(sessionLogs[0]);
    sql += generateInserts("session_logs", cols, sessionLogs) + "\n";
  }

  const outputPath = path.resolve(process.cwd(), "supabase_migration.sql");
  await fs.writeFile(outputPath, sql, "utf-8");
  console.log(`\nMigration script successfully generated at: ${outputPath}`);
}

exportAll().catch(console.error);
