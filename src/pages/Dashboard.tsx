import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ArrowRightLeft, ShoppingCart, LogOut, AlertCircle, Target, CircleDollarSign, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCategoryIcon } from '../lib/icons';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [isFixing, setIsFixing] = useState(false);

  const [fixError, setFixError] = useState<string | null>(null);

  const { data: accounts, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cuentas').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transacciones')
        .select('*, categorias_presupuesto(nombre, tipo_flujo), cuentas!cuenta_origen_id(nombre)')
        .order('fecha', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: budgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_presupuesto')
        .select('*')
        .gt('limite_mensual', 0);
      if (error) {
        console.warn("Could not fetch budgets from categories:", error);
        return [];
      }
      return data || [];
    },
    retry: false
  });

  const fixAccountSetup = async () => {
    if (!user) return;
    setIsFixing(true);
    setFixError(null);
    try {
      // 1. Check if user profile exists
      const { data: userProfile } = await supabase.from('perfiles').select('*').eq('id', user.id).maybeSingle();
      
      let hogarId = userProfile?.hogar_id;

      // 2. If no user profile, create household and link user
      if (!userProfile) {
        hogarId = crypto.randomUUID();
        const { error: hogarError } = await supabase
          .from('hogares')
          .insert([{ id: hogarId, nombre: `Hogar de ${user.email?.split('@')[0] || 'Usuario'}` }]);
          
        if (hogarError) throw new Error(`Hogar: ${hogarError.message}`);

        const { error: userError } = await supabase
          .from('perfiles')
          .insert([{ id: user.id, hogar_id: hogarId }]);
          
        if (userError) throw new Error(`Usuario: ${userError.message}`);
      }

      // 3. Create default accounts if none exist
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
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error: any) {
      console.error("Error fixing account:", error);
      setFixError(error.message || "Error desconocido al configurar la cuenta");
    } finally {
      setIsFixing(false);
    }
  };

  const accountBalances = useMemo(() => {
    if (!accounts || !transactions) return {};
    const balances: Record<string, number> = {};
    accounts.forEach(acc => balances[acc.id] = 0);
    
    transactions.forEach(tx => {
      const amount = Number(tx.monto);
      if (tx.cuenta_origen_id && balances[tx.cuenta_origen_id] !== undefined) {
        balances[tx.cuenta_origen_id] -= amount;
      }
      if (tx.cuenta_destino_id && balances[tx.cuenta_destino_id] !== undefined) {
        balances[tx.cuenta_destino_id] += amount;
      }
    });
    return balances;
  }, [accounts, transactions]);

  const monthlyStats = useMemo(() => {
    if (!transactions) return { income: 0, expenses: 0 };
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.reduce((acc, tx) => {
      const txDate = new Date(tx.fecha);
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        const amount = Number(tx.monto);
        const isExpense = tx.cuenta_origen_id && !tx.cuenta_destino_id;
        const isIncome = !tx.cuenta_origen_id && tx.cuenta_destino_id;
        
        if (isIncome) {
          acc.income += amount;
        } else if (isExpense) {
          acc.expenses += amount;
        }
      }
      return acc;
    }, { income: 0, expenses: 0 });
  }, [transactions]);

  const totalBalance = useMemo(() => {
    if (!accounts) return 0;
    return Object.values(accountBalances).reduce((sum: number, bal: any) => sum + Number(bal), 0);
  }, [accounts, accountBalances]);

  const chartData = useMemo(() => {
    if (!accounts) return [];
    return accounts.map(acc => ({
      name: acc.nombre,
      Saldo: accountBalances[acc.id] || 0,
    }));
  }, [accounts, accountBalances]);

  const budgetChartData = useMemo(() => {
    if (!budgets || !transactions) return [];
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return budgets.map(budget => {
      // Sum all expenses (cuenta_origen set, cuenta_destino null) for this category in the current month
      const spent = transactions
        .filter(tx => {
          const txDate = new Date(tx.fecha);
          const isExpense = !!tx.cuenta_origen_id && !tx.cuenta_destino_id;
          return tx.categoria_id === budget.id && 
                 isExpense && 
                 txDate.getMonth() === currentMonth &&
                 txDate.getFullYear() === currentYear;
        })
        .reduce((sum, tx) => sum + Number(tx.monto), 0);
        
      return {
        name: budget.nombre || 'Categoría',
        Presupuestado: Number(budget.limite_mensual),
        Gastado: spent
      };
    });
  }, [budgets, transactions]);

  const recentTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.slice(0, 5).map(tx => ({
      ...tx,
      fecha_formateada: new Date(tx.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    }));
  }, [transactions]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/')} className="text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Captura Rápida
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar
            </Button>
            <Button variant="outline" onClick={() => navigate('/budgets')}>
              <Target className="w-4 h-4 mr-2" />
              Presupuestos
            </Button>
            <Button variant="outline" onClick={() => navigate('/history')}>
              <FileText className="w-4 h-4 mr-2" />
              Historial
            </Button>
            <Button variant="outline" onClick={() => navigate('/reconcile')}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Conciliar
            </Button>
            <Button onClick={() => navigate('/transfer')}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transferir
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
              <LogOut className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        </div>

        {/* Auto-heal warning if no accounts */}
        {accounts?.length === 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="flex flex-col md:flex-row items-center justify-between p-4 gap-4">
              <div className="flex items-center space-x-3 text-amber-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Tu cuenta no terminó de configurarse correctamente.</p>
                  {fixError && (
                    <p className="text-xs text-red-600 mt-1 font-mono bg-red-50 p-1 rounded border border-red-100">{fixError}</p>
                  )}
                </div>
              </div>
              <Button 
                onClick={fixAccountSetup} 
                disabled={isFixing}
                className="bg-amber-600 hover:bg-amber-700 text-white w-full md:w-auto"
              >
                {isFixing ? 'Configurando...' : 'Completar Configuración'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Total Net Worth Card */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-gray-400 font-medium tracking-wide uppercase text-sm">Patrimonio Total Conjunto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl md:text-7xl font-black tracking-tighter">
              {totalBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-700/50">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Ingresos (Mes)</p>
                <p className="text-green-400 font-bold text-xl">+{monthlyStats.income.toLocaleString('es-ES')}€</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Gastos (Mes)</p>
                <p className="text-red-400 font-bold text-xl">-{monthlyStats.expenses.toLocaleString('es-ES')}€</p>
              </div>
            </div>
            
            <p className="text-gray-400 mt-6 text-sm">Economía de guerra en tiempo real</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Accounts Breakdown Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Distribución por Cuentas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `€${value}`} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="Saldo" fill="#111827" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Budget vs Spent Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Gastado vs Presupuestado</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetChartData.length === 0 ? (
                <div className="h-[300px] w-full flex flex-col items-center justify-center text-gray-500">
                  <Target className="w-12 h-12 mb-4 opacity-20" />
                  <p>No hay presupuestos definidos.</p>
                  <Button variant="link" onClick={() => navigate('/budgets')}>Crear presupuestos</Button>
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `€${value}`} />
                      <Tooltip 
                        cursor={{fill: '#f3f4f6'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="Gastado" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="Presupuestado" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No hay transacciones recientes</p>
                ) : (
                  recentTransactions.map((tx: any, i: number) => {
                    const isTransfer = !!tx.cuenta_origen_id && !!tx.cuenta_destino_id;
                    const isIncome = !tx.cuenta_origen_id && !!tx.cuenta_destino_id;
                    const isExpense = !!tx.cuenta_origen_id && !tx.cuenta_destino_id;
                    const amount = Math.abs(tx.monto);
                    
                    const CategoryIcon = isTransfer ? ArrowRightLeft : getCategoryIcon(tx.categorias_presupuesto?.nombre);
                    
                    return (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500">
                            <CategoryIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {tx.categorias_presupuesto?.nombre || 'Transferencia'}
                            </p>
                            <p className="text-xs text-gray-500">{tx.fecha_formateada}</p>
                          </div>
                        </div>
                        <div className={`text-sm font-bold ${isTransfer ? 'text-gray-600' : isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isTransfer ? '' : isIncome ? '+' : '-'}{amount}€
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
