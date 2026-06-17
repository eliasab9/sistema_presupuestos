-- Adds Drive file metadata columns to the budgets table so a sent budget
-- can be reopened from any device.
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "drive_file_id" text;
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "drive_web_view_link" text;
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "file_name" text;
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "file_format" text;
