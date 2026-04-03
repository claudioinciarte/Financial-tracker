-- Ejecuta este script en el editor SQL de Supabase para añadir categorías de ingreso

-- 1. Actualizar el constraint para permitir el tipo 'Ingreso'
ALTER TABLE categorias_presupuesto DROP CONSTRAINT IF EXISTS categorias_presupuesto_tipo_check;
ALTER TABLE categorias_presupuesto ADD CONSTRAINT categorias_presupuesto_tipo_check CHECK (tipo IN ('Gasto Fijo', 'Variable', 'Ahorro', 'Ingreso'));

-- 2. Insertar las nuevas categorías
INSERT INTO categorias_presupuesto (nombre, tipo, icon)
SELECT 'Nómina', 'Ingreso', 'briefcase'
WHERE NOT EXISTS (SELECT 1 FROM categorias_presupuesto WHERE nombre = 'Nómina');

INSERT INTO categorias_presupuesto (nombre, tipo, icon)
SELECT 'Bizum', 'Ingreso', 'smartphone'
WHERE NOT EXISTS (SELECT 1 FROM categorias_presupuesto WHERE nombre = 'Bizum');

INSERT INTO categorias_presupuesto (nombre, tipo, icon)
SELECT 'Transferencia', 'Ingreso', 'arrow-right-left'
WHERE NOT EXISTS (SELECT 1 FROM categorias_presupuesto WHERE nombre = 'Transferencia');

INSERT INTO categorias_presupuesto (nombre, tipo, icon)
SELECT 'Cashback', 'Ingreso', 'coins'
WHERE NOT EXISTS (SELECT 1 FROM categorias_presupuesto WHERE nombre = 'Cashback');
