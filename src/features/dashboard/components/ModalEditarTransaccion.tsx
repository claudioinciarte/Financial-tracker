import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useUpdateTransaccion } from '../../transacciones/hooks/useMutationTransaccion';
import { Button } from '../../../components/ui/button';
import { X, Save, AlertCircle } from 'lucide-react';

interface ModalEditarTransaccionProps {
  transaction: any;
  onClose: () => void;
}

export function ModalEditarTransaccion({ transaction, onClose }: ModalEditarTransaccionProps) {
  const updateMutation = useUpdateTransaccion();
  const [monto, setMonto] = useState(Math.abs(transaction.monto).toString());
  const [categoriaId, setCategoriaId] = useState(transaction.categoria_id || '');
  const [fecha, setFecha] = useState(new Date(transaction.fecha).toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias_presupuesto').select('*').order('nombre');
      if (error) throw error;
      return data || [];
    }
  });

  const handleSave = () => {
    const amount = parseFloat(monto);
    if (isNaN(amount) || amount <= 0) {
      setError('Monto inválido');
      return;
    }

    // El monto siempre es positivo en el nuevo esquema
    const finalAmount = Math.abs(amount);

    updateMutation.mutate({
      id: transaction.id,
      monto: finalAmount,
      categoria_id: categoriaId || null,
      fecha: new Date(fecha).toISOString().split('T')[0] // Solo la fecha, sin hora
    }, {
      onSuccess: () => onClose(),
      onError: (err: any) => setError(err.message || 'Error al actualizar')
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Editar Transacción</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Monto (€)</label>
            <input 
              type="number" 
              value={monto} 
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              step="0.01"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Categoría</label>
            <select 
              value={categoriaId} 
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Sin categoría / Transferencia</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Fecha</label>
            <input 
              type="date" 
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
