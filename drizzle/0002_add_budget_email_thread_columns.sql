-- Ancla el presupuesto al hilo de correo donde el cliente lo pidió, para que la
-- respuesta y los envíos posteriores caigan en la misma conversación.
--
-- email_thread_id  : threadId de Gmail / conversationId de Outlook (opaco).
-- email_message_id : Message-ID RFC 5322 del mail al que se responde, con <>.
-- email_references : cadena References del padre, IDs separados por espacio.
--
-- Todas nullable: los presupuestos que no nacen de un mail no las usan.
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "email_thread_id" text;
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "email_message_id" text;
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "email_references" text;

CREATE INDEX IF NOT EXISTS "budgets_email_thread_id_idx" ON "budgets" ("email_thread_id");
