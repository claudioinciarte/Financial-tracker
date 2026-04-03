-- Ejecuta este script en el editor SQL de Supabase para habilitar los presupuestos

CREATE TABLE presupuestos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hogar_id UUID REFERENCES hogares(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias_presupuesto(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(hogar_id, categoria_id)
);

ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage household budgets" ON presupuestos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE perfiles.id = auth.uid() 
      AND perfiles.hogar_id = presupuestos.hogar_id
    )
  );
