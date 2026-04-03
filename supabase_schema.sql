-- Supabase Schema Setup (Partida Doble)
-- Run this in the Supabase SQL Editor

-- 1. Create Tables
CREATE TABLE hogares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL
);

CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hogar_id UUID REFERENCES hogares(id) ON DELETE CASCADE
);

CREATE TABLE cuentas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Checking', 'Saving', 'Prestamo', 'Efectivo')),
  hogar_id UUID REFERENCES hogares(id) ON DELETE CASCADE
);

CREATE TABLE categorias_presupuesto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  tipo_flujo TEXT NOT NULL CHECK (tipo_flujo IN ('Ingreso', 'Gasto', 'Ahorro')),
  icon TEXT
);

CREATE TABLE transacciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monto NUMERIC NOT NULL CHECK (monto >= 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cuenta_origen_id UUID REFERENCES cuentas(id) ON DELETE CASCADE,
  cuenta_destino_id UUID REFERENCES cuentas(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias_presupuesto(id) ON DELETE SET NULL,
  descripcion TEXT,
  hogar_id UUID REFERENCES hogares(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE hogares ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_presupuesto ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Hogares
CREATE POLICY "Users can view their own household" ON hogares
  FOR SELECT USING (id IN (SELECT hogar_id FROM perfiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can create a household" ON hogares
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Perfiles
CREATE POLICY "Users can view their own profile" ON perfiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON perfiles
  FOR UPDATE USING (id = auth.uid());

-- Cuentas
CREATE POLICY "Users can manage household accounts" ON cuentas
  FOR ALL USING (hogar_id IN (SELECT hogar_id FROM perfiles WHERE id = auth.uid()));

-- Categorias
CREATE POLICY "Categories are readable by all authenticated users" ON categorias_presupuesto
  FOR SELECT USING (auth.role() = 'authenticated');

-- Transacciones
CREATE POLICY "Users can manage household transactions" ON transacciones
  FOR ALL USING (hogar_id IN (SELECT hogar_id FROM perfiles WHERE id = auth.uid()));

-- 4. Initial Data
INSERT INTO categorias_presupuesto (nombre, tipo_flujo, icon) VALUES
  ('Gastos', 'Gasto', 'shopping-cart'),
  ('Recibos', 'Gasto', 'file-text'),
  ('Ahorros', 'Ahorro', 'piggy-bank'),
  ('Deuda', 'Gasto', 'landmark'),
  ('Ingresos', 'Ingreso', 'banknote');
