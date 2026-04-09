import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Button } from 'lucide-react' // Icons only
import { supabase } from '../supabaseClient'

export function TagAssign() {
  const queryClient = useQueryClient()
  const { data: transacciones = [] } = useQuery({
    queryKey: ['transacciones'],
    queryFn: () => supabase.from('transacciones').select('*').order('fecha', { ascending: false }),
  })

  const { data: etiquetas = [] } = useQuery({
    queryKey: ['etiquetas'],
    queryFn: () => supabase.from('etiquetas').select('*'),
  })

  const mutation = useMutation({
    mutationFn: ({ transaccion_id, etiqueta_id }) => supabase.from('transacciones_etiquetas').insert({ transaccion_id, etiqueta_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transacciones'] }),
  })

  return (
    <div className="bg-slate-800/30 p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4">Tags</h3>
      {transacciones.map(t => (
        <div key={t.id} className="flex gap-4 p-4 bg-slate-900 rounded-lg mb-2">
          <div>€{t.monto} {t.notas}</div>
          <select onChange={(e) => mutation.mutate({ transaccion_id: t.id, etiqueta_id: e.target.value })}>
            <option>Tag</option>
            {etiquetas.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div className="flex gap-1">
            {t.etiquetas?.map(tag => <Badge key={tag.id}>{tag.name}</Badge>)}
          </div>
        </div>
      ))}
    </div>
  )
}
