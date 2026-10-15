import React, { useState, useEffect } from 'react';
import { X, QrCode, Save, CheckCircle2 } from 'lucide-react';
import { Tenant } from '../types';
import { api } from '../services/api';

interface SettingsModalProps {
  tenant?: Tenant;
  onClose: () => void;
  onSuccess: (updated: Tenant) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  tenant,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState(tenant?.name || '');
  const [pixKey, setPixKey] = useState(tenant?.pix_key || '');
  const [pixName, setPixName] = useState(tenant?.pix_name || '');
  const [pixCity, setPixCity] = useState(tenant?.pix_city || 'SAO PAULO');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(tenant?.phone_whatsapp || '');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixKey.trim() || !pixName.trim()) {
      setError('A chave Pix e o nome do titular são obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await api.updateTenantSettings({
        name,
        pix_key: pixKey,
        pix_name: pixName,
        pix_city: pixCity,
        phone_whatsapp: phoneWhatsapp
      });

      setSuccessMsg(true);
      onSuccess(updated);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="text-emerald-500 w-5 h-5" />
              Configurar Chave Pix & Perfil
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dados usados na geração dos QR Codes e cobranças aos alunos
            </p>
          </div>
          <button
            onClick={onClose}
            title="Fechar (ESC)"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              Configurações salvas com sucesso!
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nome de Exibição do Professor / Escola
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Prof. Thiago"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              WhatsApp de Recebimento de Comprovantes (com DDI e DDD)
            </label>
            <input
              type="text"
              required
              value={phoneWhatsapp}
              onChange={(e) => setPhoneWhatsapp(e.target.value)}
              placeholder="Ex: 5511999998888"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Para onde o botão do aluno vai disparar a mensagem com comprovante.
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">
              Dados Oficiais Pix BACEN
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chave Pix (E-mail, CPF/CNPJ, Telefone ou Aleatória) *
                </label>
                <input
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="suachavepix@banco.com ou 11999998888"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nome do Titular da Conta *
                  </label>
                  <input
                    type="text"
                    required
                    value={pixName}
                    onChange={(e) => setPixName(e.target.value)}
                    placeholder="Ex: Thiago Silva"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cidade do Titular
                  </label>
                  <input
                    type="text"
                    required
                    value={pixCity}
                    onChange={(e) => setPixCity(e.target.value)}
                    placeholder="Ex: Sao Paulo"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Save size={16} />
              {loading ? 'Salvando...' : 'Salvar Dados Pix'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
