import React, { useState } from 'react';
import { useDeleteTransaccion } from '../../transacciones/hooks/useMutationTransaccion';
import { Button } from '../../../components/ui/button';
import { Edit2, Trash2, ArrowRightLeft, ShoppingCart, CircleDollarSign } from 'lucide-react';
import { ModalEditarTransaccion } from './ModalEditarTransaccion';

interface TablaHistorialProps {
  transactions: any[];
}

export function TablaHistorial({ transactions }: TablaHistorialProps) {
  const deleteMutation = useDeleteTransaccion();
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Cuenta</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Categoría</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Monto</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const isTransfer = !!tx.cuenta_origen_id && !!tx.cuenta_destino_id;
              const isIncome = !tx.cuenta_origen_id && !!tx.cuenta_destino_id;
              const isExpense = !!tx.cuenta_origen_id && !tx.cuenta_destino_id;
              const amount = Math.abs(tx.monto);
              const date = new Date(tx.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

              return (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600">{date}</td>
                  <td className="px-4 py-3 text-sm">
                    {isTransfer ? (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{tx.cuentas?.nombre}</span>
                        <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">{tx.cuenta_destino?.nombre}</span>
                      </div>
                    ) : (
                      <span className="font-medium">{tx.cuentas?.nombre || tx.cuenta_destino?.nombre}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {isTransfer ? <ArrowRightLeft className="w-4 h-4 text-gray-400" /> : <ShoppingCart className="w-4 h-4 text-gray-400" />}
                        <span className="text-gray-700 font-medium">{tx.categorias_presupuesto?.nombre || 'Transferencia'}</span>
                      </div>
                      {tx.transacciones_etiquetas && tx.transacciones_etiquetas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tx.transacciones_etiquetas.map((te: any, idx: number) => (
                            <span key={idx} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                              {te.etiquetas?.nombre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm font-bold text-right ${isTransfer ? 'text-gray-600' : isIncome ? 'text-green-600' : 'text-red-600'}`}>
                    {isTransfer ? '' : isIncome ? '+' : '-'}{amount.toLocaleString('es-ES')}€
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditingTransaction(tx)}>
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingTransaction && (
        <ModalEditarTransaccion 
          transaction={editingTransaction} 
          onClose={() => setEditingTransaction(null)} 
        />
      )}
    </div>
  );
}
