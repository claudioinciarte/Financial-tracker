import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

export function useGetHistorial(mes: number, anio: number, cuentaId?: string | null) {
  return useQuery({
    queryKey: ['historial', mes, anio, cuentaId],
    queryFn: async () => {
      const startDate = new Date(anio, mes - 1, 1).toISOString();
      const endDate = new Date(anio, mes, 0, 23, 59, 59).toISOString();

      let query = supabase
        .from('transacciones')
        .select('*, categorias_presupuesto(nombre), cuentas!cuenta_origen_id(nombre), cuenta_destino:cuentas!cuenta_destino_id(nombre), transacciones_etiquetas(etiquetas(nombre))')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });

      if (cuentaId) {
        query = query.or(`cuenta_origen_id.eq.${cuentaId},cuenta_destino_id.eq.${cuentaId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });
}
