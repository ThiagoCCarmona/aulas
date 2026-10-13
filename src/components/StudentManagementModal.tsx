import React, { useState } from 'react';
import { X, UserPlus, Save, DollarSign, Calendar, Phone, Mail, Key } from 'lucide-react';
import { StudentListItem } from '../types';
import { api } from '../services/api';

interface StudentManagementModalProps {
  student?: StudentListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const StudentManagementModal: React.FC<StudentManagementModalProps> = ({
  student,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(student);
  const [name, setName] = useState(student?.name || '');
  const [email, setEmail] = useState(student?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(student?.phone || '');
  const [packageTotalClasses, setPackageTotalClasses] = useState(student?.package_total_classes || 4);
  const [packagePrice, setPackagePrice] = useState(student?.package_price || 350);
  const [weeklySchedules, setWeeklySchedules] = useState(student?.weekly_schedules || 'Terças e Quintas às 14h');
  const [notes, setNotes] = useState(student?.notes || '');
  const [active, setActive] = useState(student ? student.active === 1 : true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }
    if (!isEditing && !password.trim()) {
      setError('A senha é obrigatória para o cadastro do aluno.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (isEditing && student) {
        await api.updateStudent(student.id, {
          name,
          phone,
          password: password.trim() ? password : undefined,
          package_total_classes: Number(packageTotalClasses),
          package_price: Number(packagePrice),
          weekly_schedules: weeklySchedules,
          notes,
          active: active ? 1 : 0
        });
      } else {
        await api.createStudent({
          name,
          email,
          password,
          phone,
          package_total_classes: Number(packageTotalClasses),
          package_price: Number(packagePrice),
          weekly_schedules: weeklySchedules,
          notes
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar aluno.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="text-indigo-400 w-5 h-5" />
              {isEditing ? 'Editar Aluno & Pacote' : 'Novo Aluno'}
            </h2>
            <p className="text-xs text-slate-400">Configure os valores e o ciclo individual do aluno</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Dados Pessoais */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome Completo do Aluno *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Eduardo Santos"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                E-mail (Login) *
              </label>
              <input
                type="email"
                required
                disabled={isEditing}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aluno@email.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Key size={13} className="text-slate-400" />
                {isEditing ? 'Nova Senha (Opcional)' : 'Senha de Acesso *'}
              </label>
              <input
                type="password"
                required={!isEditing}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? 'Deixe em branco p/ manter' : 'Senha simples'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone size={13} className="text-slate-400" />
              WhatsApp do Aluno (com DDD)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 5511999998888"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Configuração do Pacote Individual */}
          <div className="pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">
              Regras do Pacote do Aluno
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Aulas por Pacote
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={packageTotalClasses}
                  onChange={(e) => setPackageTotalClasses(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <DollarSign size={13} className="text-emerald-400" />
                  Valor Total do Pacote (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={packagePrice}
                  onChange={(e) => setPackagePrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                Horários Semanais Combinados
              </label>
              <input
                type="text"
                value={weeklySchedules}
                onChange={(e) => setWeeklySchedules(e.target.value)}
                placeholder="Ex: Terças às 14h e Quintas às 14h"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nível / Observações Pedagógicas
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Letramento Digital básico / Programação com IA"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Save size={16} />
              {loading ? 'Salvando...' : 'Salvar Aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
