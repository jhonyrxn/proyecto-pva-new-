-- Crear tabla de materiales
CREATE TABLE materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_code VARCHAR(50) UNIQUE NOT NULL,
  material_name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  recipe TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de órdenes de producción
CREATE TABLE production_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  product_reference VARCHAR(255) NOT NULL,
  desired_quantity DECIMAL(10,2) NOT NULL,
  delivery_date DATE NOT NULL,
  creation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'PENDIENTE',
  assigned_raw_materials JSONB DEFAULT '[]',
  finished_products JSONB DEFAULT '[]',
  generated_byproducts JSONB DEFAULT '[]',
  warehouse_location VARCHAR(255),
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_materials_type ON materials(type);
CREATE INDEX idx_materials_code ON materials(material_code);
CREATE INDEX idx_orders_status ON production_orders(status);
CREATE INDEX idx_orders_delivery_date ON production_orders(delivery_date);
CREATE INDEX idx_orders_creation_date ON production_orders(creation_date);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updated_at
CREATE TRIGGER update_materials_updated_at 
    BEFORE UPDATE ON materials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_orders_updated_at 
    BEFORE UPDATE ON production_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
