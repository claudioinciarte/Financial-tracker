import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
interface FiltrosHistorialProps {
  mes: number;
  anio: number;
  cuentaId: string | null;
  onMesChange: (mes: number) => void;
  onAnioChange: (anio: number) => void;
  onCuentaChange: (cuentaId: string | null) => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ANIOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export function FiltrosHistorial({ 
  mes, anio, cuentaId, 
  onMesChange, onAnioChange, onCuentaChange 
}: FiltrosHistorialProps) {
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cuentas').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex-1 min-w-[150px]">
        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Mes</label>
        <select 
          value={mes} 
          onChange={(e) => onMesChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Año</label>
        <select 
          value={anio} 
          onChange={(e) => onAnioChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          {ANIOS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Cuenta</label>
        <select 
          value={cuentaId || 'todas'} 
          onChange={(e) => onCuentaChange(e.target.value === 'todas' ? null : e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="todas">Todas las cuentas</option>
          {accounts?.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.nombre}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
