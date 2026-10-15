import React, { useState, useEffect } from 'react';
import { User, Tenant } from './types';
import { api, getTenantSlug } from './services/api';
import { Navbar } from './components/Navbar';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { SettingsModal } from './components/SettingsModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import {
  GraduationCap,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  Globe,
  Sun,
  Moon,
  User as UserIcon
} from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | undefined>();
  const [loading, setLoading] = useState(true);

  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Login form state (E-mail ou WhatsApp)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Tenant slug switcher
  const [currentSlug, setCurrentSlug] = useState(getTenantSlug());

  const initApp = async () => {
    try {
      setLoading(true);
      const tenantInfo = await api.getTenantInfo();
      setTenant(tenantInfo);

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const me = await api.getMe();
          setUser(me.user);
          if (me.tenant) setTenant(me.tenant);
        } catch (err) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, [currentSlug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await api.login(identifier, password);
      setUser(res.user);
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoginLoading(false);
    }
  };


  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-white'}`}>
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <span className="text-sm text-slate-400 font-medium">Carregando plataforma...</span>
      </div>
    );
  }

  // Se não estiver autenticado, exibe Tela de Login
  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors duration-200 ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#0b0f19] text-slate-100'}`}>
        {/* Botão de Tema na tela de login */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-md ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-slate-200/50'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white shadow-black/40'
            }`}
          >
            {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-600" />}
          </button>
        </div>

        {/* Glows de Fundo */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none ${theme === 'light' ? 'bg-indigo-500/10' : 'bg-indigo-600/15'}`} />
        <div className={`absolute bottom-10 right-1/4 w-80 h-80 rounded-full blur-[100px] pointer-events-none ${theme === 'light' ? 'bg-emerald-500/8' : 'bg-emerald-500/10'}`} />

        <div className="w-full max-w-md relative z-10 space-y-6">
          {/* Logo & Título */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 shadow-xl shadow-indigo-500/25 mb-2">
              <GraduationCap className="text-white w-8 h-8" />
            </div>
            <h1 className={`text-3xl font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {tenant?.name || 'Aulas Particulares'}
            </h1>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              Acesse seu cronograma, materiais de estudo e acompanhamento
            </p>
          </div>

          {/* Card de Login */}
          <div className={`p-8 rounded-3xl border shadow-2xl backdrop-blur-xl space-y-6 ${
            theme === 'light'
              ? 'bg-white/95 border-slate-200 shadow-slate-200/60 text-slate-900'
              : 'border-slate-800 bg-slate-900/80 text-slate-100'
          }`}>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className={`p-3 rounded-xl text-xs border ${theme === 'light' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-950/60 border-red-500/30 text-red-300'}`}>
                  {loginError}
                </div>
              )}

              <div>
                <label className={`block text-xs font-semibold mb-1.5 flex items-center justify-between ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                  <span className="flex items-center gap-1.5">
                    <UserIcon size={13} className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'} />
                    WhatsApp, Telefone ou E-mail
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Aceita telefone com DDD</span>
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Seu WhatsApp, telefone ou e-mail"
                  className={`w-full rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none focus:border-indigo-500 ${
                    theme === 'light'
                      ? 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                  <Lock size={13} className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'} />
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none focus:border-indigo-500 ${
                    theme === 'light'
                      ? 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border border-slate-800 text-white'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 !text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{loginLoading ? 'Entrando...' : 'Entrar na Plataforma'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Informações de Suporte e Segurança */}
            <div className={`pt-4 border-t space-y-3 ${theme === 'light' ? 'border-slate-100' : 'border-slate-800/80'}`}>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Ambiente seguro com criptografia de ponta a ponta</span>
              </div>
              {tenant?.phone_whatsapp && (
                <div className="text-center">
                  <a
                    href={`https://wa.me/${tenant.phone_whatsapp}?text=${encodeURIComponent('Olá professor, preciso de suporte para acessar a plataforma.')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
                  >
                    <Phone size={12} />
                    <span>Primeiro acesso ou esqueceu sua senha? Fale pelo WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Identificador de Subdomínio / Tenant */}
          <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <Globe size={13} className="text-indigo-400" />
            <span>Subdomínio ativo:</span>
            <span className="font-mono font-medium text-slate-500">{tenant?.slug || currentSlug}</span>
          </div>
        </div>
      </div>
    );
  }

  // Usuário Autenticado
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#0b0f19] text-slate-100'
    }`}>
      <Navbar
        user={user}
        tenant={tenant}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      <main className="flex-1">
        {user.role === 'teacher' || user.role === 'superadmin' ? (
          <TeacherDashboard
            user={user}
            tenant={tenant}
            onTenantUpdate={(updated) => setTenant(updated)}
          />
        ) : (
          <StudentDashboard user={user} tenant={tenant} />
        )}
      </main>

      {/* Footer simples */}
      <footer className={`border-t py-6 text-center text-xs transition-colors ${
        theme === 'light' ? 'border-slate-200 text-slate-500 bg-white/50' : 'border-slate-900 text-slate-600'
      }`}>
        <p>Plataforma de Aulas Particulares • {tenant?.name || 'Prof. Thiago'} • Suporte Multi-Tenant & Modo Claro/Escuro</p>
      </footer>

      {showSettingsModal && (
        <SettingsModal
          tenant={tenant}
          onClose={() => setShowSettingsModal(false)}
          onSuccess={(updated) => setTenant(updated)}
        />
      )}

      {user?.must_change_password && (
        <ChangePasswordModal
          user={user}
          onSuccess={(updatedUser) => {
            setUser({ ...updatedUser, must_change_password: false });
          }}
        />
      )}
    </div>
  );
}
export default App;
