import { createClient } from '@supabase/supabase-js';

// Forzamos las credenciales ignorando las variables de entorno (import.meta.env)
// para asegurar que escriba en el proyecto zqpywvoatmtyvrfquzzg
const supabaseUrl = 'https://zqpywvoatmtyvrfquzzg.supabase.co';
const supabaseAnonKey = 'sb_publishable_dZhcdrk0fEr3_kux9NBRcw_CYDOOeyG';

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
