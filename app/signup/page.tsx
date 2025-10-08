'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      if (data.user) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/projects')
          router.refresh()
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-[#10A37F] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-[28px] font-normal text-[#202123] mb-3 tracking-tight">
            Compte créé avec succès
          </h2>
          <p className="text-[16px] text-[#6E6E80]">
            Redirection vers vos projets...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-normal text-[#202123] mb-4 tracking-tight">
            Créer votre compte
          </h1>
          <p className="text-[16px] text-[#6E6E80] leading-relaxed">
            Commencez à utiliser BCI Tool<br/>gratuitement dès maintenant
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl p-0">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Email Input */}
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse e-mail"
                required
                className="w-full px-4 py-3.5 bg-white border border-[#C2C2C2] rounded-[6px] text-[15px] text-[#202123] placeholder:text-[#6E6E80] focus:outline-none focus:border-[#202123] transition-colors"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe (min. 6 caractères)"
                required
                minLength={6}
                className="w-full px-4 py-3.5 bg-white border border-[#C2C2C2] rounded-[6px] text-[15px] text-[#202123] placeholder:text-[#6E6E80] focus:outline-none focus:border-[#202123] transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6E6E80] hover:text-[#202123] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Confirm Password Input */}
            <div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                required
                className="w-full px-4 py-3.5 bg-white border border-[#C2C2C2] rounded-[6px] text-[15px] text-[#202123] placeholder:text-[#6E6E80] focus:outline-none focus:border-[#202123] transition-colors"
              />
            </div>

            {/* Submit Button - NOIR */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2D333A] hover:bg-[#1C2128] text-white text-[15px] font-medium rounded-[6px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création...
                </>
              ) : (
                'Continuer'
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="mt-4 text-center text-[12px] text-[#6E6E80] leading-relaxed">
            En continuant, vous acceptez nos{' '}
            <a href="#" className="underline hover:text-[#2D333A] transition-all">Conditions d'utilisation</a>
            {' '}et notre{' '}
            <a href="#" className="underline hover:text-[#2D333A] transition-all">Politique de confidentialité</a>
          </p>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#ECECF1]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-[#6E6E80] font-normal">OU</span>
            </div>
          </div>

          {/* OAuth Buttons (disabled for now) */}
          <div className="space-y-3">
            <button
              type="button"
              disabled
              className="w-full px-4 py-3 bg-white border border-[#C2C2C2] rounded-[6px] text-[15px] text-[#202123] font-normal hover:bg-[#F7F7F8] transition-colors flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="w-full px-4 py-3 bg-white border border-[#C2C2C2] rounded-[6px] text-[15px] text-[#202123] font-normal hover:bg-[#F7F7F8] transition-colors flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
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

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-[14px] text-[#6E6E80]">
              Vous avez déjà un compte ?{' '}
              <Link
                href="/login"
                className="text-[#2D333A] hover:underline font-semibold transition-all"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[13px] text-[#6E6E80]">
          <a href="#" className="hover:text-[#2D333A] hover:underline transition-all">Conditions</a>
          <span>•</span>
          <a href="#" className="hover:text-[#2D333A] hover:underline transition-all">Confidentialité</a>
        </div>
      </div>
    </div>
  )
}
