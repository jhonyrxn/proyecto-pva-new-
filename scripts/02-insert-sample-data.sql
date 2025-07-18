-- Insertar datos de ejemplo para materiales
INSERT INTO materials (material_code, material_name, unit, type, recipe) VALUES
('MP-001', 'Harina de Trigo', 'kilos', 'Materia Prima', NULL),
('MP-002', 'Azúcar Blanca', 'kilos', 'Materia Prima', NULL),
('MP-003', 'Huevos', 'unidad', 'Materia Prima', NULL),
('MP-004', 'Mantequilla', 'kilos', 'Materia Prima', NULL),
('MP-005', 'Leche', 'litros', 'Materia Prima', NULL),
('PT-001', 'Pastel de Chocolate', 'unidad', 'Producto Terminado', 'Harina (2kg), Azúcar (1kg), Huevos (6 unidades), Mantequilla (0.5kg)'),
('PT-002', 'Pan Integral', 'unidad', 'Producto Terminado', 'Harina (1.5kg), Leche (0.3 litros)'),
('EMP-001', 'Caja de Cartón Grande', 'unidad', 'Material de Empaque', NULL),
('EMP-002', 'Bolsa Plástica', 'unidad', 'Material de Empaque', NULL),
('SP-001', 'Migas de Pan', 'kilos', 'Subproducto', NULL);

-- Insertar órdenes de ejemplo
INSERT INTO production_orders (order_number, product_reference, desired_quantity, delivery_date, status) VALUES
('OP-001', 'Pastel de Chocolate', 10, '2024-02-15', 'PENDIENTE'),
('OP-002', 'Pan Integral', 50, '2024-02-20', 'PENDIENTE'),
('OP-003', 'Pastel de Chocolate', 5, '2024-02-10', 'EN PRODUCCIÓN');
