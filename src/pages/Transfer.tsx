import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';

export default function Transfer() {
  const [amount, setAmount] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cuentas').select('*');
      if (error) throw error;
      
      // Set defaults if not set
      if (data && data.length >= 2) {
        if (!sourceId) setSourceId(data[0].id);
        if (!destId) setDestId(data[1].id);
      }
      
      return data || [];
    }
  });

  const transferMutation = useMutation({
    mutationFn: async ({ amount, source, dest }: { amount: number, source: string, dest: string }) => {
      if (!user) throw new Error('No user found');
      
      const sourceAccount = accounts?.find(a => a.id === source);
      if (!sourceAccount) throw new Error('Cuenta origen no encontrada');

      const { data, error } = await supabase
        .from('transacciones')
        .insert([
          {
            monto: Math.abs(amount),
            fecha: new Date().toISOString().split('T')[0],
            cuenta_origen_id: source,
            cuenta_destino_id: dest,
            categoria_id: null,
            hogar_id: sourceAccount.hogar_id,
            usuario_id: user.id,
            descripcion: 'Transferencia interna'
          }
        ])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      navigate('/');
    }
  });

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount > 0 && sourceId && destId && sourceId !== destId) {
      transferMutation.mutate({ amount: numAmount, source: sourceId, dest: destId });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="flex flex-row items-center space-x-4 pb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <CardTitle className="text-2xl font-bold text-gray-900">Transferencia Interna</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-6">Mueve dinero entre cuentas sin afectar el patrimonio neto ni el presupuesto mensual.</p>
          
          <form onSubmit={handleTransfer} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Importe (€)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-4xl font-black tracking-tighter p-4 border rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Origen</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full p-3 bg-gray-100 border-0 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-gray-900 outline-none appearance-none"
                >
                  {accounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white shrink-0">
                <ArrowRight className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Destino</label>
                <select
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  className="w-full p-3 bg-gray-100 border-0 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-gray-900 outline-none appearance-none"
                >
                  {accounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold rounded-xl mt-8"
              disabled={!amount || parseFloat(amount) <= 0 || sourceId === destId || transferMutation.isPending}
            >
              {transferMutation.isPending ? 'Procesando...' : 'Confirmar Transferencia'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
