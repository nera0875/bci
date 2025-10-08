'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        router.push('/projects')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[450px]">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-[2rem] font-semibold text-[#2D333A] mb-3 tracking-tight leading-tight">
            Bienvenue
          </h1>
          <p className="text-[15px] text-[#6E7681] leading-relaxed">
            Connectez-vous pour accéder à vos projets
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {error && (
            <div className="px-4 py-3 bg-[#FFEBE9] border border-[#FF8182] rounded-xl text-[#D1242F] text-[14px] leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            {/* Email */}
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse e-mail"
                required
                className="w-full px-4 py-[11px] bg-white border border-[#D0D7DE] rounded-xl text-[15px] text-[#2D333A] placeholder:text-[#6E7681] focus:outline-none focus:border-[#2D333A] focus:ring-[3px] focus:ring-[#2D333A]/10 transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                className="w-full px-4 py-[11px] bg-white border border-[#D0D7DE] rounded-xl text-[15px] text-[#2D333A] placeholder:text-[#6E7681] focus:outline-none focus:border-[#2D333A] focus:ring-[3px] focus:ring-[#2D333A]/10 transition-all duration-200 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#6E7681] hover:text-[#2D333A] hover:bg-[#F6F8FA] rounded-lg transition-all duration-150"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>

            {/* Submit - NOIR */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-[11px] bg-[#2D333A] hover:bg-[#1C2128] text-white text-[15px] font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : (
                'Continuer'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D0D7DE]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-[13px] text-[#6E7681] font-medium">OU</span>
            </div>
          </div>

          {/* OAuth */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled
              className="w-full px-4 py-[11px] bg-white border border-[#D0D7DE] rounded-xl text-[15px] text-[#2D333A] font-medium hover:bg-[#F6F8FA] hover:border-[#8C959F] transition-all duration-150 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuer avec Google
            </button>

            <button
              type="button"
              disabled
              className="w-full px-4 py-[11px] bg-white border border-[#D0D7DE] rounded-xl text-[15px] text-[#2D333A] font-medium hover:bg-[#F6F8FA] hover:border-[#8C959F] transition-all duration-150 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#00A4EF" d="M13 1h10v10H13z"/>
                <path fill="#7FBA00" d="M1 13h10v10H1z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
              Continuer avec Microsoft
            </button>
          </div>

          {/* Signup Link */}
          <div className="mt-8 text-center">
            <p className="text-[14px] text-[#6E7681]">
              Pas encore de compte ?{' '}
              <Link href="/signup" className="text-[#2D333A] hover:underline font-semibold transition-all">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-3 text-[12px] text-[#6E7681]">
          <a href="#" className="hover:text-[#2D333A] hover:underline transition-all">Conditions</a>
          <span>•</span>
          <a href="#" className="hover:text-[#2D333A] hover:underline transition-all">Confidentialité</a>
        </div>
      </div>
    </div>
  )
}
