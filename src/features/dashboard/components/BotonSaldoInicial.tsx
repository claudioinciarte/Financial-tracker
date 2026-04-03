import React, { useState } from 'react';
import { useSetSaldoInicial } from '../../transacciones/hooks/useSetSaldoInicial';
import { Button } from '../../../components/ui/button';
import { PiggyBank, X, Save, AlertCircle } from 'lucide-react';

interface BotonSaldoInicialProps {
  cuentaId: string | null;
}

export function BotonSaldoInicial({ cuentaId }: BotonSaldoInicialProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const setSaldoMutation = useSetSaldoInicial();

  const handleSave = () => {
    if (!cuentaId) {
      setError('Selecciona una cuenta primero');
      return;
    }
    const amount = parseFloat(monto);
    if (isNaN(amount)) {
      setError('Monto inválido');
      return;
    }

    setSaldoMutation.mutate({ cuentaId, monto: amount, fecha }, {
      onSuccess: () => {
        setIsOpen(false);
        setMonto('');
        setError('');
      },
      onError: (err: any) => setError(err.message || 'Error al establecer saldo')
    });
  };

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="text-gray-600 border-gray-200 hover:bg-gray-50"
      >
        <PiggyBank className="w-4 h-4 mr-2" />
        Saldo Inicial
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Saldo Inicial</h3>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
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
              placeholder="Ej: 1500.50"
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              step="0.01"
              autoFocus
            />
            <p className="text-[10px] text-gray-400 mt-1 italic">Usa valores negativos para deudas</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Fecha de Inicio</label>
            <input 
              type="date" 
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave} disabled={setSaldoMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {setSaldoMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
