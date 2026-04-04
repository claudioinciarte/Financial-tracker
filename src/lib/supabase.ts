import { createClient } from '@supabase/supabase-js';

// Supabase credentials loaded securely from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Household = {
  id: string;
  nombre: string;
};

export type UserProfile = {
  id: string;
  hogar_id: string;
};

export type AccountType = 'Banco' | 'Efectivo' | 'Préstamo';

export type Account = {
  id: string;
  nombre: string;
  tipo: AccountType;
  hogar_id: string;
};

export type CategoryType = 'Gasto Fijo' | 'Variable' | 'Ahorro';

export type Category = {
  id: string;
  nombre: string;
  tipo: CategoryType;
  icon?: string;
};

export type Transaction = {
  id: string;
  monto: number;
  fecha: string;
  cuenta_origen_id: string;
  cuenta_destino_id?: string | null;
  categoria_id?: string | null;
  usuario_id: string;
};
