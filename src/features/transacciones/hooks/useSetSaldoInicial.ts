import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export function useSetSaldoInicial() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ cuentaId, monto, fecha }: { cuentaId: string; monto: number; fecha: string }) => {
      if (!user) throw new Error('Usuario no autenticado');

      // 1. Buscar o crear la categoría "Ajuste Inicial"
      let { data: category } = await supabase
        .from('categorias_presupuesto')
        .select('id')
        .eq('nombre', 'Ajuste Inicial')
        .maybeSingle();

      if (!category) {
        const { data: newCategory, error: catError } = await supabase
          .from('categorias_presupuesto')
          .insert([{ nombre: 'Ajuste Inicial', tipo_flujo: 'Ahorro', icon: 'piggy-bank' }])
          .select()
          .single();
        
        if (catError) throw catError;
        category = newCategory;
      }

      // Obtener el hogar_id del perfil del usuario
      const { data: profile } = await supabase.from('perfiles').select('hogar_id').eq('id', user.id).single();
      if (!profile?.hogar_id) throw new Error('No se pudo encontrar el hogar del usuario');

      // 2. Insertar la transacción de saldo inicial
      // Saldo inicial: cuenta_origen_id null, cuenta_destino_id = cuentaId
      const { data, error } = await supabase
        .from('transacciones')
        .insert([{
          monto: Math.abs(monto),
          fecha: new Date(fecha).toISOString().split('T')[0],
          cuenta_destino_id: cuentaId,
          categoria_id: category.id,
          usuario_id: user.id,
          hogar_id: profile.hogar_id,
          descripcion: 'Saldo Inicial'
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historial'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
}
