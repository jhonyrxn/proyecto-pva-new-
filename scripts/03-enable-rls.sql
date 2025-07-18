-- Habilitar Row Level Security (RLS) para seguridad
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso público (puedes restringir esto más tarde)
CREATE POLICY "Allow all operations on materials" ON materials
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on production_orders" ON production_orders
  FOR ALL USING (true) WITH CHECK (true);
