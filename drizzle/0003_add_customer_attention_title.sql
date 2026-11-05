-- Tratamiento del contacto de "Atención" para el saludo del correo
-- ("Estimado" / "Estimada"). Lo elige el vendedor con el selector Sr./Sra.:
-- no se deduce del nombre.
--
-- Nullable: sin valor el saludo sale neutro ("Estimado/a").
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "attention_title" text;
