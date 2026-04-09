import { useState } from 'react'

import { Plus, ShoppingBag, CreditCard, Home, ArrowLeftRight } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

const CATEGORIES = [
  { id: 1, name: 'Supermercado', icon: ShoppingBag, type: 'Variable' },
  { id: 2, name: 'Préstamo', icon: CreditCard, type: 'Gasto Fijo' },
  { id: 3, name: 'Transferencia', icon: ArrowLeftRight, type: 'Transferencia' },
  { id: 4, name: 'Hogar', icon: Home, type: 'Variable' },
]

type Category = typeof CATEGORIES[0]

export function ExpenseForm() {
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState<Category | null>(null)
  const [notas, setNotas] = useState('')
  const [cuentaOrigen, setCuentaOrigen] = useState('') // Select cuentas
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!monto || !categoria || !cuentaOrigen) throw new Error('Datos incompletos')
      const { data, error } = await supabase
        .from('transacciones')
        .insert({
          monto: parseFloat(monto),
          categoria_id: categoria.id,
          cuenta_origen_id: cuentaOrigen,
          notas,
        })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      setMonto('')
      setCategoria(null)
      setNotas('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur p-6 rounded-2xl border border-slate-700 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Plus size={28} />
        Nuevo Gasto (5s)
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Monto (€)</label>
          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full p-4 text-3xl font-mono bg-slate-900/50 border-2 border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none text-right tracking-wider"
            placeholder="0.00"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoria(cat)}
              className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all duration-200 ${
                categoria?.id === cat.id
                  ? 'bg-blue-500/20 border-2 border-blue-400 shadow-lg scale-105'
                  : 'bg-slate-800/50 hover:bg-slate-700 border border-slate-600 hover:shadow-lg'
              }`}
            >
              <cat.icon size={32} />
              <span className="text-sm font-medium">{cat.name}</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="w-full p-4 bg-slate-900/50 border border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none"
          placeholder="Notas (opcional)"
        />
        <select
          value={cuentaOrigen}
          onChange={(e) => setCuentaOrigen(e.target.value)}
          className="w-full p-4 bg-slate-900/50 border border-slate-600 rounded-xl focus:border-blue-500"
        >
          <option value="db-cuenta-uuid">Selecciona cuenta origen</option>
          <option value="cuenta1-uuid">Personal Jose</option>
          <option value="cuenta2-uuid">Conjunta</option>
        </select>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 p-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 disabled:opacity-50"
        >
          {mutation.isPending ? 'Guardando...' : 'Registrar Gasto'}
        </button>
      </div>
      {mutation.error && (
        <p className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-xl text-red-300">
          Error: {mutation.error.message}
        </p>
      )}
      {mutation.isSuccess && (
        <p className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded-xl text-green-300">
          ✅ Gasto registrado & sync!
        </p>
      )}
    </form>
  )
}
