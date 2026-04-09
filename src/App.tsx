import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ExpenseForm } from './components/ExpenseForm'
import { Dashboard } from './components/Dashboard'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">💰 Economía de Guerra</h1>
          <p className="text-slate-400">Hogar Jose - Offline PWA</p>
        </header>
        <main className="max-w-2xl mx-auto space-y-8">
          <ExpenseForm />
          <Dashboard />
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
