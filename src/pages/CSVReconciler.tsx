import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type CSVRow = {
  fecha: string;
  descripcion: string;
  monto: number;
  originalRow: any;
};

type MatchStatus = 'exact' | 'suggested' | 'orphan';

type ReconciledRow = CSVRow & {
  id: string; // unique id for list rendering
  status: MatchStatus;
  matchedTransactionId?: string;
  suggestedCategoryId?: string;
  selectedCategoryId?: string;
  saveRule?: boolean;
};

export default function CSVReconciler() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [reconciledData, setReconciledData] = useState<ReconciledRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  // Fetch user profile
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfiles').select('*').eq('id', user?.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch accounts
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      if (!userProfile?.hogar_id) return [];
      const { data, error } = await supabase.from('cuentas').select('*').eq('hogar_id', userProfile.hogar_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.hogar_id
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!userProfile?.hogar_id) return [];
      const { data, error } = await supabase.from('categorias_presupuesto').select('*').eq('hogar_id', userProfile.hogar_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.hogar_id
  });

  // Fetch transactions for the current month (to find exact matches)
  const { data: transactions } = useQuery({
    queryKey: ['transactions_reconciliation'],
    queryFn: async () => {
      if (!userProfile?.hogar_id) return [];
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('transacciones')
        .select('*')
        .eq('hogar_id', userProfile.hogar_id)
        .gte('fecha', firstDay)
        .lte('fecha', lastDay);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.hogar_id
  });

  // Fetch rules
  const { data: rules } = useQuery({
    queryKey: ['reglas_conciliacion'],
    queryFn: async () => {
      if (!userProfile?.hogar_id) return [];
      const { data, error } = await supabase
        .from('reglas_conciliacion')
        .select('*')
        .eq('hogar_id', userProfile.hogar_id);
      if (error) {
        console.warn("Could not fetch rules, maybe table doesn't exist yet:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!userProfile?.hogar_id
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Basic mapping, assuming standard CSV columns: Date, Description, Amount
        // Adjust these keys based on actual bank CSV format
        const parsed: CSVRow[] = results.data.map((row: any) => {
          // Try to find common column names
          const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('fecha')) || Object.keys(row)[0];
          const descKey = Object.keys(row).find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('concepto')) || Object.keys(row)[1];
          const amountKey = Object.keys(row).find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('importe') || k.toLowerCase().includes('monto')) || Object.keys(row)[2];

          let amount = parseFloat(row[amountKey]?.replace(',', '.') || '0');
          
          return {
            fecha: row[dateKey],
            descripcion: row[descKey] || '',
            monto: amount,
            originalRow: row
          };
        });

        setCsvData(parsed);
        reconcileData(parsed);
        setIsProcessing(false);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setIsProcessing(false);
      }
    });
  };

  const reconcileData = (data: CSVRow[]) => {
    if (!transactions || !rules) return;

    const reconciled: ReconciledRow[] = data.map((row, index) => {
      const rowDate = new Date(row.fecha);
      const rowAmount = Math.abs(row.monto);

      // 1. Check Exact Match
      const exactMatch = transactions.find(tx => {
        const txDate = new Date(tx.fecha);
        const diffTime = Math.abs(txDate.getTime() - rowDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.abs(Number(tx.monto)) === rowAmount && diffDays <= 3;
      });

      if (exactMatch) {
        return {
          ...row,
          id: `row-${index}`,
          status: 'exact',
          matchedTransactionId: exactMatch.id
        };
      }

      // 2. Check Rules
      const matchedRule = rules.find(rule => 
        row.descripcion.toLowerCase().includes(rule.patron_texto.toLowerCase())
      );

      if (matchedRule) {
        return {
          ...row,
          id: `row-${index}`,
          status: 'suggested',
          suggestedCategoryId: matchedRule.categoria_id,
          selectedCategoryId: matchedRule.categoria_id
        };
      }

      // 3. Orphan
      return {
        ...row,
        id: `row-${index}`,
        status: 'orphan',
        saveRule: false
      };
    });

    setReconciledData(reconciled);
  };

  const importMutation = useMutation({
    mutationFn: async (row: ReconciledRow) => {
      if (!userProfile?.hogar_id || !user?.id || !selectedAccount) {
        throw new Error("Faltan datos para importar");
      }

      const isExpense = row.monto < 0;
      const amount = Math.abs(row.monto);
      
      // Parse date safely
      let parsedDate = new Date(row.fecha);
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date(); // fallback
      }

      const transactionData = {
        monto: amount,
        fecha: parsedDate.toISOString().split('T')[0],
        descripcion: row.descripcion,
        categoria_id: row.selectedCategoryId,
        hogar_id: userProfile.hogar_id,
        usuario_id: user.id,
        cuenta_origen_id: isExpense ? selectedAccount : null,
        cuenta_destino_id: isExpense ? null : selectedAccount,
      };

      const { error: txError } = await supabase.from('transacciones').insert([transactionData]);
      if (txError) throw txError;

      // Save rule if requested
      if (row.saveRule && row.selectedCategoryId) {
        const { error: ruleError } = await supabase.from('reglas_conciliacion').insert([{
          hogar_id: userProfile.hogar_id,
          patron_texto: row.descripcion.substring(0, 50), // simple pattern
          categoria_id: row.selectedCategoryId
        }]);
        if (ruleError) console.warn("Error saving rule:", ruleError);
      }
    },
    onSuccess: (_, row) => {
      // Remove imported row from list
      setReconciledData(prev => prev.filter(r => r.id !== row.id));
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions_reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['reglas_conciliacion'] });
    }
  });

  const handleImport = (row: ReconciledRow) => {
    if (!selectedAccount) {
      alert("Por favor selecciona una cuenta destino/origen primero");
      return;
    }
    if (!row.selectedCategoryId) {
      alert("Por favor selecciona una categoría");
      return;
    }
    importMutation.mutate(row);
  };

  const updateRow = (id: string, updates: Partial<ReconciledRow>) => {
    setReconciledData(prev => prev.map(row => row.id === id ? { ...row, ...updates } : row));
  };

  const exactMatches = reconciledData.filter(r => r.status === 'exact');
  const suggestedMatches = reconciledData.filter(r => r.status === 'suggested');
  const orphanMatches = reconciledData.filter(r => r.status === 'orphan');

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Conciliación Bancaria</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Selecciona la cuenta y sube tu CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Bancaria</label>
              <select 
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecciona una cuenta...</option>
                {accounts?.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.nombre}</option>
                ))}
              </select>
            </div>

            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Haz clic para subir tu archivo CSV</p>
              <p className="text-sm text-gray-400 mt-1">Soporta formatos estándar de bancos</p>
            </div>
          </CardContent>
        </Card>

        {reconciledData.length > 0 && (
          <div className="space-y-6">
            {/* Exact Matches */}
            {exactMatches.length > 0 && (
              <Card className="border-green-200">
                <CardHeader className="bg-green-50 border-b border-green-100">
                  <CardTitle className="text-green-800 flex items-center text-lg">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Matches Exactos ({exactMatches.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-green-100">
                    {exactMatches.map(row => (
                      <div key={row.id} className="p-4 flex justify-between items-center bg-white">
                        <div>
                          <p className="font-medium text-gray-900">{row.descripcion}</p>
                          <p className="text-sm text-gray-500">{row.fecha}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${row.monto < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {row.monto}€
                          </p>
                          <p className="text-xs text-green-600 font-medium">Ya en base de datos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggested Matches */}
            {suggestedMatches.length > 0 && (
              <Card className="border-yellow-200">
                <CardHeader className="bg-yellow-50 border-b border-yellow-100">
                  <CardTitle className="text-yellow-800 flex items-center text-lg">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Sugerencias por Regla ({suggestedMatches.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-yellow-100">
                    {suggestedMatches.map(row => (
                      <div key={row.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{row.descripcion}</p>
                          <p className="text-sm text-gray-500">{row.fecha} • {row.monto}€</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <select
                            value={row.selectedCategoryId || ''}
                            onChange={(e) => updateRow(row.id, { selectedCategoryId: e.target.value })}
                            className="p-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">Seleccionar categoría...</option>
                            {categories?.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                          </select>
                          <Button 
                            size="sm" 
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            onClick={() => handleImport(row)}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Importar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Orphan Matches */}
            {orphanMatches.length > 0 && (
              <Card className="border-red-200">
                <CardHeader className="bg-red-50 border-b border-red-100">
                  <CardTitle className="text-red-800 flex items-center text-lg">
                    <XCircle className="w-5 h-5 mr-2" />
                    Huérfanos / Nuevos ({orphanMatches.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-red-100">
                    {orphanMatches.map(row => (
                      <div key={row.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{row.descripcion}</p>
                          <p className="text-sm text-gray-500">{row.fecha} • <span className={`font-bold ${row.monto < 0 ? 'text-red-600' : 'text-green-600'}`}>{row.monto}€</span></p>
                        </div>
                        <div className="flex flex-col space-y-2 md:items-end">
                          <div className="flex items-center space-x-3">
                            <select
                              value={row.selectedCategoryId || ''}
                              onChange={(e) => updateRow(row.id, { selectedCategoryId: e.target.value })}
                              className="p-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="">Seleccionar categoría...</option>
                              {categories?.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                              ))}
                            </select>
                            <Button 
                              size="sm" 
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleImport(row)}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Importar
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id={`rule-${row.id}`}
                              checked={row.saveRule || false}
                              onChange={(e) => updateRow(row.id, { saveRule: e.target.checked })}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor={`rule-${row.id}`} className="text-xs text-gray-600">
                              Recordar esta descripción
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
