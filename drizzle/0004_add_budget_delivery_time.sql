-- Plazo de entrega del presupuesto ("Inmediata", "15 días", "A convenir"...).
-- Es texto libre: los chips del formulario sólo sugieren los valores típicos.
--
-- Nullable: sin plazo cargado no se imprime la línea en Observaciones.
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "delivery_time" text;
