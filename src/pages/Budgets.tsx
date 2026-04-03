import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Budgets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  // Traer el perfil del usuario para obtener el hogar_id
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfiles').select('*').eq('id', user?.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Traer directamente las categorías con su nueva columna limite_mensual
  const { data: categories, isLoading, error: catError } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!userProfile?.hogar_id) return [];

      const { data, error } = await supabase
        .from('categorias_presupuesto')
        .select('*')
        .eq('hogar_id', userProfile.hogar_id)
        .eq('tipo_flujo', 'Salida') // Solo nos interesan los gastos
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.hogar_id
  });

  // Mutación para actualizar el límite mensual de una categoría específica
  const saveBudget = useMutation({
    mutationFn: async ({ categoryId, amount }: { categoryId: string, amount: number }) => {
      setErrorMsg('');
      const { error } = await supabase
        .from('categorias_presupuesto')
        .update({ limite_mensual: amount })
        .eq('id', categoryId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
    },
    onError: (error: any) => {
      console.error("Error al guardar presupuesto:", error);
      setErrorMsg(error.message || 'Error al guardar el límite de presupuesto');
    }
  });

  const handleEdit = (categoryId: string, currentAmount: number) => {
    setEditingId(categoryId);
    setEditAmount(currentAmount.toString());
  };

  const handleSave = (categoryId: string) => {
    const amount = parseFloat(editAmount);
    if (!isNaN(amount) && amount >= 0) {
      saveBudget.mutate({ categoryId, amount });
    }
  };

  if (catError) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-lg text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Error de conexión</h2>
          <p className="text-gray-600 mb-6">No se pudieron cargar las categorías. Revisa la consola.</p>
          <Button onClick={() => navigate('/dashboard')} className="w-full">Volver al Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Presupuestos</h1>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b border-gray-100 pb-6">
            <CardTitle className="text-xl">Define tus límites de gasto mensual</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center text-gray-500 py-8 animate-pulse">Cargando categorías...</div>
            ) : (
              <div className="space-y-4">
                {categories?.map(cat => {
                  const amount = cat.limite_mensual || 0;
                  const isEditing = editingId === cat.id;

                  return (
                    <div key={cat.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-indigo-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-lg">{cat.nombre}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Límite asignado</p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-28 px-4 py-2 text-right font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                autoFocus
                                min="0"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                            </div>
                            <Button 
                              size="icon"
                              className="bg-indigo-600 hover:bg-indigo-700 h-10 w-10 rounded-lg"
                              onClick={() => handleSave(cat.id)}
                              disabled={saveBudget.isPending}
                            >
                              <Save className="w-4 h-4 text-white" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-4">
                            <span className="text-xl font-black text-gray-900">{amount} <span className="text-gray-400 text-sm">€</span></span>
                            <Button 
                              variant="ghost" 
                              className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-semibold"
                              onClick={() => handleEdit(cat.id, amount)}
                            >
                              Editar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}