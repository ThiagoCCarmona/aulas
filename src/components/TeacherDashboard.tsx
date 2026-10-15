import React, { useState, useEffect } from 'react';
import {
  StudentListItem,
  TeacherStats,
  Tenant,
  User
} from '../types';
import { api } from '../services/api';
import { FastClassModal } from './FastClassModal';
import { StudentManagementModal } from './StudentManagementModal';
import { MaterialModal } from './MaterialModal';
import { SettingsModal } from './SettingsModal';
import {
  Users,
  GraduationCap,
  CalendarPlus,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Phone,
  Settings,
  Plus,
  BookOpen,
  QrCode,
  Banknote,
  Edit2
} from 'lucide-react';

interface TeacherDashboardProps {
  user: User;
  tenant?: Tenant;
  onTenantUpdate?: (tenant: Tenant) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  tenant,
  onTenantUpdate
}) => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showFastClassModal, setShowFastClassModal] = useState(false);
  const [selectedStudentForClass, setSelectedStudentForClass] = useState<string | undefined>();

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentToEdit, setSelectedStudentToEdit] = useState<StudentListItem | null>(null);

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedStudentForMaterial, setSelectedStudentForMaterial] = useState<string | undefined>();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Modal / Confirmação de Baixa
  const [payingPackage, setPayingPackage] = useState<{ id: string; studentName: string; price: number } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [studentsRes, statsRes] = await Promise.all([
        api.getStudents(),
        api.getTeacherStats()
      ]);
      setStudents(studentsRes);
      setStats(statsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleOpenClassForStudent = (studentId: string) => {
    setSelectedStudentForClass(studentId);
    setShowFastClassModal(true);
  };

  const handleClosePackage = async (student: StudentListItem) => {
    if (!confirm(`Deseja concluir o pacote de ${student.package_total_classes} aulas de ${student.name}? Uma cobrança Pix será gerada na tela dele e um novo ciclo de aulas será iniciado imediatamente.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await api.closePackage(student.id);
      showToast(`Pacote de ${student.name} concluído com sucesso! Pix gerado.`);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao concluir pacote');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPay = async (method: 'pix' | 'cash') => {
    if (!payingPackage) return;
    try {
      setActionLoading(true);
      await api.payPackage(payingPackage.id, method);
      showToast(`Pagamento de ${payingPackage.studentName} confirmado via ${method.toUpperCase()}!`);
      setPayingPackage(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar pagamento');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando painel de controle do professor...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast de Sucesso */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-2xl animate-bounce">
          <CheckCircle2 size={18} />
          {successToast}
        </div>
      )}

      {/* 1. Header do Professor & Ações Rápidas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm backdrop-blur-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Painel do Professor 👨‍🏫
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gestão pedagógica, frequência de aulas e cobranças de {tenant?.name || 'suas aulas'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              setSelectedStudentForClass(undefined);
              setShowFastClassModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <CalendarPlus size={18} />
            <span>Lançar Aula</span>
          </button>

          <button
            onClick={() => {
              setSelectedStudentToEdit(null);
              setShowStudentModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo Aluno</span>
          </button>

          <button
            onClick={() => setShowMaterialModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <BookOpen size={15} />
            <span>Material / E-book</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            title="Configurações Pix"
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas em Tempo Real */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Alunos Ativos</span>
            <Users size={18} />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{stats?.totalStudents || 0}</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Aulas Dadas / Faltas</span>
            <GraduationCap size={18} />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{stats?.totalClassesGiven || 0}</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 dark:text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pendente Receber</span>
            <AlertCircle size={18} />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-300">
            {Number(stats?.pendingPaymentsAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
            {stats?.pendingPaymentsCount || 0} pacote(s) pendente(s)
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Recebido</span>
            <DollarSign size={18} />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-300">
            {Number(stats?.paidAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
            {stats?.paidCount || 0} pacote(s) quitados
          </span>
        </div>
      </div>

      {/* 3. Lista e Status dos Alunos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
            Meus Alunos & Situação de Pacotes ({students.length})
          </h2>
          <span className="text-xs text-slate-500">
            Aulas adiadas acumulam e não expiram
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((s) => {
            const completed = s.completed_classes_in_package || 0;
            const total = s.package_total_classes || 4;
            const percentage = Math.min(100, Math.round((completed / total) * 100));
            const isPendingPayment = s.package_status === 'pending_payment';
            const isReadyToClose = completed >= total && !isPendingPayment;

            return (
              <div
                key={s.id}
                className={`p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between shadow-sm ${
                  isPendingPayment
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40 shadow-amber-950/10'
                    : isReadyToClose
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/40'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                        {s.name}
                        {isPendingPayment && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Fatura Pendente
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.email}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {s.phone && (
                        <a
                          href={`https://wa.me/${s.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Conversar no WhatsApp"
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Phone size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setSelectedStudentForMaterial(s.id);
                          setShowMaterialModal(true);
                        }}
                        title="Enviar Material ou E-book para este Aluno"
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <BookOpen size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStudentToEdit(s);
                          setShowStudentModal(true);
                        }}
                        title="Editar Aluno"
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Horário Semanal */}
                  {s.weekly_schedules && (
                    <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Horário:</span>
                      <span>{s.weekly_schedules}</span>
                    </div>
                  )}

                  {/* Barra de Progresso do Aluno */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {completed} de {total} aulas contabilizadas
                        {s.future_classes_in_package && s.future_classes_in_package > 0 ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-normal ml-1.5 text-[11px]">
                            (+{s.future_classes_in_package} futura{s.future_classes_in_package > 1 ? 's' : ''})
                          </span>
                        ) : null}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {percentage}% • {Number(s.package_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPendingPayment
                            ? 'bg-amber-400'
                            : isReadyToClose
                            ? 'bg-emerald-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Botões de Ação do Card */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenClassForStudent(s.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Lançar Aula</span>
                  </button>

                  {isPendingPayment && s.current_package_id ? (
                    <button
                      onClick={() =>
                        setPayingPackage({
                          id: s.current_package_id!,
                          studentName: s.name,
                          price: s.package_price
                        })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>Dar Baixa</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClosePackage(s)}
                      disabled={actionLoading}
                      title="Conclui o pacote atual e gera a cobrança Pix"
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isReadyToClose
                          ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Banknote size={14} />
                      <span>Concluir & Cobrar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Baixa Manual (Pix ou Dinheiro) */}
      {payingPackage && (
        <div
          onClick={() => setPayingPackage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500 w-5 h-5" />
              Dar Baixa no Pagamento
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Confirmar quitação do pacote de <strong>{payingPackage.studentName}</strong> no valor de{' '}
              <strong>{Number(payingPackage.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>:
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleConfirmPay('pix')}
                disabled={actionLoading}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition-all cursor-pointer"
              >
                <QrCode size={24} />
                <span>Recebido via Pix</span>
              </button>

              <button
                onClick={() => handleConfirmPay('cash')}
                disabled={actionLoading}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-xs transition-all cursor-pointer"
              >
                <Banknote size={24} />
                <span>Recebido em Dinheiro</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPayingPackage(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais de Operação */}
      {showFastClassModal && (
        <FastClassModal
          students={students}
          selectedStudentId={selectedStudentForClass}
          onClose={() => setShowFastClassModal(false)}
          onSuccess={() => {
            showToast('Aula registrada com sucesso!');
            loadAll();
          }}
        />
      )}

      {showStudentModal && (
        <StudentManagementModal
          student={selectedStudentToEdit}
          onClose={() => setShowStudentModal(false)}
          onSuccess={() => {
            showToast('Aluno salvo com sucesso!');
            loadAll();
          }}
        />
      )}

      {showMaterialModal && (
        <MaterialModal
          students={students}
          defaultStudentId={selectedStudentForMaterial}
          onClose={() => {
            setShowMaterialModal(false);
            setSelectedStudentForMaterial(undefined);
          }}
          onSuccess={() => {
            showToast('Material salvo com sucesso!');
            loadAll();
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          tenant={tenant}
          onClose={() => setShowSettingsModal(false)}
          onSuccess={(updated) => {
            showToast('Configurações Pix atualizadas!');
            if (onTenantUpdate) onTenantUpdate(updated);
          }}
        />
      )}
    </div>
  );
};
