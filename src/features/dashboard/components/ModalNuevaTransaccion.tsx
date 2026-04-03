import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useCreateTransaccion } from '../../transacciones/hooks/useMutationTransaccion';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/button';
import { X, Save, AlertCircle, Plus } from 'lucide-react';

interface ModalNuevaTransaccionProps {
  onClose: () => void;
  defaultDate?: string;
}

export function ModalNuevaTransaccion({ onClose, defaultDate }: ModalNuevaTransaccionProps) {
  const { user } = useAuth();
  const createMutation = useCreateTransaccion();
  
  const [monto, setMonto] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [categoriaId, setCategoriaId] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [fecha, setFecha] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias_presupuesto').select('*').order('nombre');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cuentas').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const handleSave = async () => {
    const amount = parseFloat(monto);
    if (isNaN(amount) || amount <= 0) {
      setError('Monto inválido');
      return;
    }
    if (!cuentaId) {
      setError('Selecciona una cuenta');
      return;
    }
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    // El monto siempre es positivo en el nuevo esquema
    const finalAmount = Math.abs(amount);

    // Obtener el hogar_id del perfil del usuario
    const { data: profile } = await supabase.from('perfiles').select('hogar_id').eq('id', user.id).single();
    if (!profile?.hogar_id) {
      setError('No se pudo encontrar el hogar del usuario');
      return;
    }

    createMutation.mutate({
      monto: finalAmount,
      categoria_id: categoriaId || null,
      cuenta_origen_id: isIncome ? null : cuentaId,
      cuenta_destino_id: isIncome ? cuentaId : null,
      usuario_id: user.id,
      hogar_id: profile.hogar_id,
      fecha: new Date(fecha).toISOString().split('T')[0]
    }, {
      onSuccess: () => onClose(),
      onError: (err: any) => setError(err.message || 'Error al crear la transacción')
    });
  };

  const filteredCategories = categories?.filter(c => {
    if (isIncome) return c.tipo_flujo === 'Ingreso';
    return c.tipo_flujo !== 'Ingreso';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Nueva Transacción</h3>
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

          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setIsIncome(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isIncome ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Gasto
            </button>
            <button
              onClick={() => setIsIncome(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isIncome ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Ingreso
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Monto (€)</label>
            <input 
              type="number" 
              value={monto} 
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0.00"
              step="0.01"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Cuenta</label>
            <select 
              value={cuentaId} 
              onChange={(e) => setCuentaId(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Seleccionar cuenta</option>
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Categoría</label>
            <select 
              value={categoriaId} 
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Seleccionar categoría</option>
              {filteredCategories?.map((cat) => (
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
          <Button className="flex-1" onClick={handleSave} disabled={createMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
