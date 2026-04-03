import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { ArrowRightLeft, Delete, CircleDollarSign, AlertCircle, ChevronDown, PieChart } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_ICONS, DEFAULT_COLORS } from '../lib/icons';

export default function MobileInput() {
  const [amount, setAmount] = useState('0');
  const [errorMsg, setErrorMsg] = useState('');
  const [isFixing, setIsFixing] = useState(false);
  const [fixError, setFixError] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isIncome, setIsIncome] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cuentas').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First get the user's hogar_id
      const { data: profile } = await supabase.from('perfiles').select('hogar_id').eq('id', user.id).maybeSingle();
      if (!profile?.hogar_id) return [];

      const { data, error } = await supabase
        .from('categorias_presupuesto')
        .select('*, etiquetas(*)')
        .eq('hogar_id', profile.hogar_id)
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const fixAccountSetup = async () => {
    if (!user || isFixing) return;
    setIsFixing(true);
    setFixError('');
    try {
      const { data: userProfile } = await supabase.from('perfiles').select('*').eq('id', user.id).maybeSingle();
      let hogarId = userProfile?.hogar_id;

      if (!userProfile) {
        hogarId = crypto.randomUUID();
        const { error: hogarError } = await supabase.from('hogares').insert([{ id: hogarId, nombre: `Hogar de ${user.email?.split('@')[0] || 'Usuario'}` }]);
        if (hogarError) throw new Error(`Hogar: ${hogarError.message}`);

        const { error: userError } = await supabase.from('perfiles').insert([{ id: user.id, hogar_id: hogarId }]);
        if (userError) throw new Error(`Usuario: ${userError.message}`);
      }

      if (hogarId) {
        const { error: categoriesError } = await supabase.from('categorias_presupuesto').insert([
          { hogar_id: hogarId, nombre: 'Gastos', tipo_flujo: 'Salida' },
          { hogar_id: hogarId, nombre: 'Recibos', tipo_flujo: 'Salida' },
          { hogar_id: hogarId, nombre: 'Ahorros', tipo_flujo: 'Salida' },
          { hogar_id: hogarId, nombre: 'Deuda', tipo_flujo: 'Salida' },
          { hogar_id: hogarId, nombre: 'Ingresos', tipo_flujo: 'Ingreso' }
        ]);
        if (categoriesError) {
          console.warn("Categories already exist or error:", categoriesError);
        }

        const { error: accountsError } = await supabase.from('cuentas').insert([
          { id: crypto.randomUUID(), nombre: 'Personal', tipo: 'Checking', hogar_id: hogarId },
          { id: crypto.randomUUID(), nombre: 'Mancomunada', tipo: 'Checking', hogar_id: hogarId },
          { id: crypto.randomUUID(), nombre: 'Efectivo', tipo: 'Efectivo', hogar_id: hogarId }
        ]);
        if (accountsError) throw new Error(`Cuentas: ${accountsError.message}`);
      }

      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error: any) {
      console.error("Auto-fix error:", error);
      setFixError(error.message || 'Error desconocido al configurar la cuenta');
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    if (accounts && accounts.length === 0 && !isLoadingAccounts && !isFixing && !fixError) {
      fixAccountSetup();
    }
  }, [accounts, isLoadingAccounts]);

  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      const defaultAccount = accounts.find(a => a.tipo === 'Checking') || accounts[0];
      setSelectedAccountId(defaultAccount.id);
    }
  }, [accounts, selectedAccountId]);

  const addTransaction = useMutation({
    mutationFn: async ({ amount, categoryId }: { amount: number, categoryId: string }) => {
      setErrorMsg('');
      
      if (!selectedAccountId) {
        throw new Error('No se ha seleccionado ninguna cuenta.');
      }
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const account = accounts?.find(a => a.id === selectedAccountId);
      if (!account) throw new Error('Cuenta no encontrada');

      const { data: txData, error: txError } = await supabase
        .from('transacciones')
        .insert([
          {
            monto: Math.abs(amount),
            fecha: new Date().toISOString().split('T')[0],
            cuenta_origen_id: isIncome ? null : selectedAccountId,
            cuenta_destino_id: isIncome ? selectedAccountId : null,
            categoria_id: categoryId,
            hogar_id: account.hogar_id,
            usuario_id: user.id,
            descripcion: isIncome ? 'Ingreso rápido' : 'Gasto rápido'
          }
        ])
        .select()
        .single();
      
      if (txError) throw txError;

      // Insert tags if any
      if (selectedTagIds.length > 0) {
        const { error: tagError } = await supabase
          .from('transacciones_etiquetas')
          .insert(selectedTagIds.map(tagId => ({
            transaccion_id: txData.id,
            etiqueta_id: tagId
          })));
        if (tagError) console.warn("Error saving tags:", tagError);
      }

      return txData;
    },
    onSuccess: () => {
      setAmount('0');
      setSelectedTagIds([]);
      setErrorMsg('');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (error: any) => {
      console.error("Transaction error:", error);
      setErrorMsg(error.message || 'Error al guardar la transacción');
    }
  });

  const handleNumberClick = (num: string) => {
    if (num === '.') {
      if (!amount.includes('.')) {
        setAmount(amount + '.');
      }
      return;
    }

    if (amount === '0') {
      setAmount(num);
    } else {
      if (amount.includes('.')) {
        const [, decimal] = amount.split('.');
        if (decimal && decimal.length >= 2) return;
      }
      if (amount.length < 10) {
        setAmount(amount + num);
      }
    }
  };

  const handleDelete = () => {
    if (amount.length > 1) {
      setAmount(amount.slice(0, -1));
    } else {
      setAmount('0');
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      addTransaction.mutate({ amount: numAmount, categoryId });
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const availableTags = useMemo(() => {
    // Show all tags for the household if no category is selected? 
    // Or just show all tags available in the categories.
    const allTags: any[] = [];
    categories?.forEach(cat => {
      if (cat.etiquetas) {
        cat.etiquetas.forEach((tag: any) => {
          if (!allTags.find(t => t.id === tag.id)) {
            allTags.push(tag);
          }
        });
      }
    });
    return allTags;
  }, [categories]);

  if (accounts?.length === 0 && !isLoadingAccounts) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-xl items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Configurando tu cuenta</h2>
        <p className="text-gray-600 mb-8">Estamos preparando tus cuentas bancarias iniciales para que puedas empezar a registrar gastos.</p>
        
        {isFixing ? (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-medium animate-pulse">Creando estructura...</p>
          </div>
        ) : fixError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl w-full text-left">
            <p className="font-bold mb-2 flex items-center"><AlertCircle className="w-4 h-4 mr-2"/> Error de configuración:</p>
            <p className="text-sm break-words font-mono bg-white p-2 rounded border border-red-100 mb-4">{fixError}</p>
            <Button className="w-full mb-2" onClick={fixAccountSetup}>Reintentar Configuración</Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>Ir al Dashboard</Button>
          </div>
        ) : (
          <Button onClick={fixAccountSetup}>Iniciar Configuración</Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-xl relative">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white border-b">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">Economía de Guerra</h1>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-indigo-600 font-bold">
            <PieChart className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/transfer')} className="text-gray-600">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transferir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/history')} className="text-gray-600">
            Historial
          </Button>
        </div>
      </div>

      {/* Amount Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative bg-white">
        <div className="flex bg-gray-100 p-1 rounded-full mb-8 relative w-48">
          <div 
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${isIncome ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
          />
          <button
            onClick={() => setIsIncome(false)}
            className={`relative z-10 flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${!isIncome ? 'text-gray-900' : 'text-gray-500'}`}
          >
            Gasto
          </button>
          <button
            onClick={() => setIsIncome(true)}
            className={`relative z-10 flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${isIncome ? 'text-gray-900' : 'text-gray-500'}`}
          >
            Ingreso
          </button>
        </div>

        <div className={`text-7xl font-black tracking-tighter transition-colors mb-2 ${isIncome ? 'text-emerald-600' : 'text-gray-900'}`}>
          {amount.replace('.', ',')} <span className={`text-4xl ${isIncome ? 'text-emerald-400' : 'text-gray-400'}`}>€</span>
        </div>

        {/* Tags Selection (Optional) */}
        {availableTags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-4 px-4">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                  selectedTagIds.includes(tag.id)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                )}
              >
                {tag.nombre}
              </button>
            ))}
          </div>
        )}
        
        {accounts && accounts.length > 0 && (
          <div className="relative">
            <select
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 py-2 pl-4 pr-10 rounded-full outline-none focus:ring-2 focus:ring-gray-900 transition-all"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.nombre}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {addTransaction.isPending && (
          <div className="absolute top-4 right-4">
            <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {errorMsg && (
          <div className="absolute bottom-0 left-4 right-4 bg-red-50 text-red-600 p-3 rounded-xl text-xs text-center font-bold shadow-sm border border-red-100">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] overflow-y-auto max-h-[35vh]">
        {categories?.filter(cat => isIncome ? cat.tipo_flujo === 'Ingreso' : cat.tipo_flujo === 'Salida').map((cat) => {
          const Icon = DEFAULT_ICONS[cat.nombre] || CircleDollarSign;
          const colorClass = DEFAULT_COLORS[cat.nombre] || 'bg-white text-gray-600';
          
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              disabled={amount === '0' || addTransaction.isPending}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-3xl transition-all active:scale-90 shadow-sm border border-transparent",
                colorClass,
                amount === '0' ? "opacity-40 grayscale" : "hover:border-current/20 active:shadow-inner"
              )}
            >
              <Icon className="w-7 h-7 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{cat.nombre}</span>
            </button>
          );
        })}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-px bg-gray-100 p-4 bg-white pb-10">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="h-20 text-3xl font-light text-gray-900 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleNumberClick('.')}
          className="h-20 text-2xl font-light text-gray-900 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          ·
        </button>
        <button
          onClick={() => handleNumberClick('0')}
          className="h-20 text-3xl font-light text-gray-900 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-20 flex items-center justify-center text-gray-400 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <Delete className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}
