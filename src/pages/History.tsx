import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useGetHistorial } from '../features/transacciones/hooks/useGetHistorial';
import { FiltrosHistorial } from '../features/dashboard/components/FiltrosHistorial';
import { TablaHistorial } from '../features/dashboard/components/TablaHistorial';
import { BotonSaldoInicial } from '../features/dashboard/components/BotonSaldoInicial';
import { ModalNuevaTransaccion } from '../features/dashboard/components/ModalNuevaTransaccion';
import { Plus } from 'lucide-react';

export default function History() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: transactions, isLoading, error, refetch } = useGetHistorial(mes, anio, cuentaId);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Historial</h1>
              <p className="text-sm text-gray-500">Libro mayor y correcciones</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transacción
            </Button>
            <BotonSaldoInicial cuentaId={cuentaId} />
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <FiltrosHistorial 
          mes={mes} 
          anio={anio} 
          cuentaId={cuentaId}
          onMesChange={setMes}
          onAnioChange={setAnio}
          onCuentaChange={setCuentaId}
        />

        {/* Main Content */}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-center gap-4">
            <AlertCircle className="w-8 h-8 opacity-50" />
            <div>
              <p className="font-bold">Error al cargar el historial</p>
              <p className="text-sm">{(error as any).message || 'Error desconocido'}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-10 h-10 animate-spin mb-4 opacity-20" />
            <p className="font-medium">Cargando transacciones...</p>
          </div>
        ) : transactions && transactions.length > 0 ? (
          <TablaHistorial transactions={transactions} />
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Sin movimientos</h3>
            <p className="text-gray-500 max-w-xs">No se han encontrado transacciones para los filtros seleccionados.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ModalNuevaTransaccion 
          onClose={() => setIsModalOpen(false)} 
          defaultDate={new Date(anio, mes - 1, 1).toISOString().split('T')[0]}
        />
      )}
    </div>
  );
}
