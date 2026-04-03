import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Por favor, revisa tu correo y confirma tu cuenta antes de iniciar sesión. Si no quieres confirmar correos, desactiva "Confirm email" en Supabase -> Authentication -> Providers -> Email.');
          }
          throw error;
        }
        navigate('/');
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        
        if (authData.user) {
          // If user is created but session is null, it means email confirmation is required
          if (!authData.session) {
            setMessage('¡Registro exitoso! Por favor, revisa tu correo electrónico para confirmar tu cuenta.');
            setIsLogin(true);
            return;
          }

          try {
            // 1. Create household
            const { data: hogar, error: hogarError } = await supabase
              .from('hogares')
              .insert([{ nombre: `Hogar de ${email.split('@')[0]}` }])
              .select()
              .single();
              
            if (hogarError) {
              console.error("Error creating hogar:", hogarError);
              throw new Error(`Error al crear el hogar: ${hogarError.message}`);
            }

            // 2. Link user to household (using upsert in case trigger already created the profile)
            const { error: userError } = await supabase
              .from('perfiles')
              .upsert([{ id: authData.user.id, hogar_id: hogar.id }]);
              
            if (userError) {
              console.error("Error linking user:", userError);
              throw new Error(`Error al vincular usuario: ${userError.message}`);
            }

            // 3. Create default categories
            const { error: categoriesError } = await supabase.from('categorias_presupuesto').insert([
              { hogar_id: hogar.id, nombre: 'Gastos', tipo_flujo: 'Salida' },
              { hogar_id: hogar.id, nombre: 'Recibos', tipo_flujo: 'Salida' },
              { hogar_id: hogar.id, nombre: 'Ahorros', tipo_flujo: 'Salida' },
              { hogar_id: hogar.id, nombre: 'Deuda', tipo_flujo: 'Salida' },
              { hogar_id: hogar.id, nombre: 'Ingresos', tipo_flujo: 'Ingreso' }
            ]);

            if (categoriesError) {
              console.error("Error creating categories:", categoriesError);
              throw new Error(`Error al crear categorías: ${categoriesError.message}`);
            }

            // 4. Create default accounts
            const { error: accountsError } = await supabase.from('cuentas').insert([
              { nombre: 'Personal', tipo: 'Checking', hogar_id: hogar.id },
              { nombre: 'Mancomunada', tipo: 'Checking', hogar_id: hogar.id },
              { nombre: 'Efectivo', tipo: 'Efectivo', hogar_id: hogar.id }
            ]);
            
            if (accountsError) {
              console.error("Error creating accounts:", accountsError);
              throw new Error(`Error al crear cuentas: ${accountsError.message}`);
            }

            navigate('/');
          } catch (setupError: any) {
            // If setup fails, we should probably delete the auth user to allow retry, 
            // but for now let's just show the specific error
            throw setupError;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error durante la autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
            {message && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">{message}</div>}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                placeholder="tu@email.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
              {isLoading ? 'Procesando...' : (isLogin ? 'Entrar' : 'Registrarse')}
            </Button>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setMessage('');
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
