import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface ChangePasswordModalProps {
  user: User;
  onSuccess: (updatedUser: User) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  user,
  onSuccess
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 6) {
      setError('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.changePassword(newPassword.trim(), confirmPassword.trim());
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 p-6 sm:p-8 space-y-6">
        
        {/* Cabeçalho com Ícone de Segurança */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 mb-1">
            <KeyRound size={28} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Troca de Senha Obrigatória
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Olá, <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong>! Por motivos de segurança e criptografia de ponta a ponta, defina uma nova senha pessoal para continuar na plataforma.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock size={13} className="text-indigo-500" />
                Nova Senha
              </span>
              <span className="text-[10px] text-slate-400">Mínimo 6 caracteres</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha secreta"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              Confirmar Nova Senha
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha exatamente igual"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !newPassword || newPassword.length < 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Salvando...' : 'Salvar Senha e Acessar'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-[11px] text-slate-400">
            A nova senha será criptografada com salt seguro (Bcrypt) no banco de dados.
          </p>
        </div>

      </div>
    </div>
  );
};
