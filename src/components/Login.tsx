import { useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useNavigate } from 'react-router-dom' // Or state

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = useSupabaseClient()
  const navigate = useNavigate()

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert('Check email!')
  }

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">🔐 Login</h1>
        <input
          type="email"
          placeholder="jose@hogar.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 bg-slate-900/50 border border-slate-600 rounded-xl mb-4 focus:border-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 bg-slate-900/50 border border-slate-600 rounded-xl mb-6 focus:border-blue-500"
        />
        <div className="space-y-2">
          <button onClick={handleSignIn} className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-bold">
            Sign In
          </button>
          <button onClick={handleSignUp} className="w-full bg-green-600 hover:bg-green-500 p-4 rounded-xl font-bold">
            Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}
