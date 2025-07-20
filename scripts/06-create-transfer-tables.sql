-- Tabla para traslados de Materia Prima a Producción
CREATE TABLE raw_material_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES materials(id), -- La materia prima que se traslada
  quantity DECIMAL(10,2) NOT NULL,
  transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transfer_employee_id UUID NOT NULL REFERENCES labelers(id), -- Empleado que realiza el traslado
  status VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, RECIBIDO, RECHAZADO
  received_quantity DECIMAL(10,2), -- Cantidad confirmada al recibir
  received_employee_id UUID REFERENCES labelers(id), -- Empleado que recibe
  received_at TIMESTAMP WITH TIME ZONE, -- Fecha y hora de recepción
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para traslados de Producto Terminado de Producción a Bodega
CREATE TABLE finished_product_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES materials(id), -- El producto terminado que se traslada
  quantity DECIMAL(10,2) NOT NULL,
  transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transfer_employee_id UUID NOT NULL REFERENCES labelers(id), -- Empleado que realiza el traslado
  status VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, RECIBIDO, RECHAZADO
  received_quantity DECIMAL(10,2), -- Cantidad confirmada al recibir
  received_employee_id UUID REFERENCES labelers(id), -- Empleado que recibe
  received_at TIMESTAMP WITH TIME ZONE, -- Fecha y hora de recepción
  observations TEXT, -- Observaciones al recibir
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear triggers para actualizar updated_at automáticamente en las nuevas tablas
CREATE TRIGGER update_raw_material_transfers_updated_at
    BEFORE UPDATE ON raw_material_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finished_product_transfers_updated_at
    BEFORE UPDATE ON finished_product_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS) para las nuevas tablas
ALTER TABLE raw_material_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_product_transfers ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso público (puedes restringir esto más tarde)
CREATE POLICY "Allow all operations on raw_material_transfers" ON raw_material_transfers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on finished_product_transfers" ON finished_product_transfers
  FOR ALL USING (true) WITH CHECK (true);
