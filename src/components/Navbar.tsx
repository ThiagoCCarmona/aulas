import React from 'react';
import { User, Tenant } from '../types';
import { GraduationCap, LogOut, User as UserIcon, ShieldCheck, Sun, Moon, MessageCircle } from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  user: User;
  tenant?: Tenant;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  tenant,
  theme,
  onToggleTheme,
  onLogout,
  onOpenSettings
}) => {
  const whatsappUrl = api.buildWhatsAppUrl(
    tenant?.phone_whatsapp,
    `Olá ${tenant?.name || 'Professor'}! Tudo bem? Estou acessando a plataforma de aulas e gostaria de falar com você.`
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo e Nome do Professor */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <GraduationCap className="text-white w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                {tenant?.name || 'Aulas Particulares'}
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestão Pedagógica & Acompanhamento
            </p>
          </div>
        </div>

        {/* Perfil & Ações */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botão Falar no WhatsApp (Aluno) */}
          {user.role === 'student' && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Falar com o Professor via WhatsApp"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <MessageCircle size={15} />
              <span className="hidden sm:inline">Falar no WhatsApp</span>
            </a>
          )}

          {/* Botão de Alternância de Tema (Modo Claro / Escuro) */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center"
          >
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
          </button>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            {user.role === 'teacher' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            )}
            <div className="text-left">
              <span className="font-semibold text-slate-900 dark:text-slate-200 block truncate max-w-[110px] sm:max-w-none">
                {user.name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-medium">
                {user.role === 'teacher' ? 'Professor' : 'Aluno'}
              </span>
            </div>
          </div>

          {user.role === 'teacher' && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold cursor-pointer hidden sm:block"
            >
              Configurar Pix
            </button>
          )}

          <button
            onClick={onLogout}
            title="Sair da conta"
            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-500/30 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-all cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
