import React, { useState, useEffect } from 'react';
import {
  StudentListItem,
  TeacherStats,
  Tenant,
  User,
  ClassSession,
  MaterialItem
} from '../types';
import { api } from '../services/api';
import { FastClassModal } from './FastClassModal';
import { StudentManagementModal } from './StudentManagementModal';
import { MaterialModal } from './MaterialModal';
import { SettingsModal } from './SettingsModal';
import { ClassDetailModal } from './ClassDetailModal';
import { MaterialsLibrary } from './MaterialsLibrary';
import { PdfViewerModal } from './PdfViewerModal';
import { MarkdownViewer } from './MarkdownViewer';
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
  Edit2,
  Library,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowUpRight,
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Copy,
  Check
} from 'lucide-react';

interface TeacherDashboardProps {
  user: User;
  tenant?: Tenant;
  onTenantUpdate?: (tenant: Tenant) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  tenant,
  onTenantUpdate
}) => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [allMaterials, setAllMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'alunos' | 'biblioteca'>('alunos');

  // Expansão de aulas por aluno no card do professor
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [studentClassesMap, setStudentClassesMap] = useState<Record<string, ClassSession[]>>({});
  const [loadingClassesStudentId, setLoadingClassesStudentId] = useState<string | null>(null);

  // Tela de Visualização Detalhada da Aula
  const [selectedClassDetail, setSelectedClassDetail] = useState<{
    session: ClassSession;
    studentName?: string;
    index?: number;
  } | null>(null);

  // Visualizadores de Material na Biblioteca do Professor
  const [viewingPdf, setViewingPdf] = useState<{ title: string; url: string } | null>(null);
  const [viewingImage, setViewingImage] = useState<{ title: string; url: string } | null>(null);
  const [copiedImageLink, setCopiedImageLink] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);

  // Modais de Gestão
  const [showFastClassModal, setShowFastClassModal] = useState(false);
  const [selectedStudentForClass, setSelectedStudentForClass] = useState<string | undefined>();

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentToEdit, setSelectedStudentToEdit] = useState<StudentListItem | null>(null);

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedStudentForMaterial, setSelectedStudentForMaterial] = useState<string | undefined>();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Modal / Confirmação de Baixa
  const [payingPackage, setPayingPackage] = useState<{
    id: string;
    studentName: string;
    price: number;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [studentsRes, statsRes, materialsRes] = await Promise.all([
        api.getStudents(),
        api.getTeacherStats(),
        api.getAllMaterials()
      ]);
      setStudents(studentsRes);
      setStats(statsRes);
      setAllMaterials(materialsRes);

      // Se houver um aluno com lista de aulas aberta, recarrega suas aulas
      if (expandedStudentId) {
        const updatedClasses = await api.getStudentClasses(expandedStudentId);
        setStudentClassesMap((prev) => ({ ...prev, [expandedStudentId]: updatedClasses }));
      }
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

  const handleToggleStudentClasses = async (studentId: string) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
      return;
    }

    setExpandedStudentId(studentId);
    try {
      setLoadingClassesStudentId(studentId);
      const classesList = await api.getStudentClasses(studentId);
      setStudentClassesMap((prev) => ({ ...prev, [studentId]: classesList }));
    } catch (err) {
      console.error('Erro ao carregar aulas do aluno:', err);
    } finally {
      setLoadingClassesStudentId(null);
    }
  };

  const handleOpenClassForStudent = (studentId: string) => {
    setSelectedStudentForClass(studentId);
    setShowFastClassModal(true);
  };

  const handleClosePackage = async (student: StudentListItem) => {
    if (
      !confirm(
        `Deseja concluir o pacote de ${student.package_total_classes} aulas de ${student.name}? Uma cobrança Pix será gerada na tela dele e um novo ciclo de aulas será iniciado imediatamente.`
      )
    ) {
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

  const handleOpenMaterial = (m: MaterialItem) => {
    if (m.type === 'image' || (m.file_url && /\.(png|jpe?g|webp)$/i.test(m.file_url))) {
      setViewingImage({
        title: m.title,
        url: m.file_url || m.external_url!
      });
      return;
    }

    if (
      (m.type === 'pdf' || m.type === 'ebook') &&
      (m.file_url || m.external_url?.endsWith('.pdf'))
    ) {
      setViewingPdf({
        title: m.title,
        url: m.file_url || m.external_url!
      });
      return;
    }

    setSelectedMaterial(m);
  };

  const handleDeleteMaterialFromLibrary = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir o material "${title}" da biblioteca?`)) return;
    try {
      await api.deleteMaterial(id);
      setAllMaterials((prev) => prev.filter((m) => m.id !== id));
      showToast('Material removido com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao remover material');
    }
  };

  const handleCopyImageUrl = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedImageLink(true);
    setTimeout(() => setCopiedImageLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Carregando painel de controle do professor...
        </span>
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
            Gestão pedagógica, análise detalhada de aulas, biblioteca digital e cobranças de{' '}
            {tenant?.name || 'suas aulas'}.
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
            onClick={() => {
              setSelectedStudentForMaterial(undefined);
              setShowMaterialModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <BookOpen size={15} />
            <span>Material / E-book</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            title="Configurações Pix & WhatsApp"
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Alunos Ativos
            </span>
            <Users size={18} />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats?.totalStudents || 0}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Aulas Dadas / Faltas
            </span>
            <GraduationCap size={18} />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats?.totalClassesGiven || 0}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 dark:text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pendente Receber
            </span>
            <AlertCircle size={18} />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-300">
            {Number(stats?.pendingPaymentsAmount || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
            {stats?.pendingPaymentsCount || 0} pacote(s) pendente(s)
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Recebido
            </span>
            <DollarSign size={18} />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-300">
            {Number(stats?.paidAmount || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
            {stats?.paidCount || 0} pacote(s) quitados
          </span>
        </div>
      </div>

      {/* 3. Abas do Painel do Professor: Alunos & Pacotes vs Biblioteca de Materiais */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('alunos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'alunos'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <Users size={16} />
          <span>Meus Alunos & Aulas ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('biblioteca')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'biblioteca'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <Library size={16} />
          <span>Biblioteca Geral de Materiais ({allMaterials.length})</span>
        </button>
      </div>

      {activeTab === 'alunos' ? (
        /* ABA 1: LISTA E STATUS DOS ALUNOS + VISUALIZAÇÃO DETALHADA DE AULAS */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
              Meus Alunos & Situação de Pacotes ({students.length})
            </h2>
            <span className="text-xs text-slate-500">
              Clique em "Ver Aulas" em qualquer aluno para abrir a Tela Detalhada da Aula
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.map((s) => {
              const completed = s.completed_classes_in_package || 0;
              const total = s.package_total_classes || 4;
              const percentage = Math.min(100, Math.round((completed / total) * 100));
              const isPendingPayment = s.package_status === 'pending_payment';
              const isReadyToClose = completed >= total && !isPendingPayment;
              const isExpanded = expandedStudentId === s.id;
              const studentClasses = studentClassesMap[s.id] || [];

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
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {s.phone || s.email || 'Sem contato registrado'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {s.phone && (
                          <a
                            href={`https://wa.me/${s.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Conversar com o Aluno no WhatsApp"
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
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Horário:
                        </span>
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
                              (+{s.future_classes_in_package} futura
                              {s.future_classes_in_package > 1 ? 's' : ''})
                            </span>
                          ) : null}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {percentage}% •{' '}
                          {Number(s.package_price).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
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

                    <button
                      type="button"
                      onClick={() => handleToggleStudentClasses(s.id)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>{isExpanded ? 'Ocultar Aulas' : 'Ver Aulas'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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

                  {/* Lista Expansível de Aulas do Aluno */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Histórico de Aulas de {s.name} (clique para abrir detalhes / editar):
                      </span>
                      {loadingClassesStudentId === s.id ? (
                        <div className="py-3 text-xs text-slate-400 text-center">
                          Carregando aulas...
                        </div>
                      ) : studentClasses.length === 0 ? (
                        <div className="py-2 text-xs text-slate-400 italic">
                          Nenhuma aula registrada para este aluno ainda.
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {studentClasses.map((cls, idx) => (
                            <div
                              key={cls.id}
                              onClick={() =>
                                setSelectedClassDetail({
                                  session: cls,
                                  studentName: s.name,
                                  index: idx + 1
                                })
                              }
                              className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 dark:bg-slate-950 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 flex items-center justify-between gap-2 cursor-pointer transition-all"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  #{idx + 1} - {cls.title}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                  <span className="flex items-center gap-1">
                                    <Clock size={10} /> {cls.date}
                                  </span>
                                  <span>•</span>
                                  <span className="uppercase font-semibold">{cls.status}</span>
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                <span>Detalhes</span>
                                <ArrowUpRight size={12} />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ABA 2: ESPAÇO DE BIBLIOTECA GERAL DE MATERIAIS DO PROFESSOR */
        <MaterialsLibrary
          materials={allMaterials}
          isTeacher={true}
          onOpenMaterial={handleOpenMaterial}
          onAddMaterial={() => {
            setSelectedStudentForMaterial(undefined);
            setShowMaterialModal(true);
          }}
          onDeleteMaterial={handleDeleteMaterialFromLibrary}
        />
      )}

      {/* TELA DE VISUALIZAÇÃO DETALHADA DA AULA (Professor) */}
      {selectedClassDetail && (
        <ClassDetailModal
          classSession={selectedClassDetail.session}
          lessonIndex={selectedClassDetail.index}
          user={user}
          tenant={tenant}
          studentName={selectedClassDetail.studentName}
          extraMaterials={allMaterials}
          onClose={() => setSelectedClassDetail(null)}
          onOpenMaterial={handleOpenMaterial}
          onClassUpdated={async () => {
            await loadAll();
            if (selectedClassDetail.session.student_id) {
              const updatedList = await api.getStudentClasses(
                selectedClassDetail.session.student_id
              );
              setStudentClassesMap((prev) => ({
                ...prev,
                [selectedClassDetail.session.student_id]: updatedList
              }));
              const refreshed = updatedList.find((c) => c.id === selectedClassDetail.session.id);
              if (refreshed) {
                setSelectedClassDetail((prev) => (prev ? { ...prev, session: refreshed } : null));
              }
            }
          }}
        />
      )}

      {/* Visualizador de PDF */}
      {viewingPdf && (
        <PdfViewerModal
          title={viewingPdf.title}
          pdfUrl={viewingPdf.url}
          onClose={() => setViewingPdf(null)}
        />
      )}

      {/* Visualizador de Imagens */}
      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 overflow-hidden">
                <ImageIcon size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {viewingImage.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyImageUrl(viewingImage.url)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  {copiedImageLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copiedImageLink ? 'Copiado!' : 'Copiar Link'}</span>
                </button>
                <a
                  href={viewingImage.url}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                >
                  <Download size={14} />
                  <span>Baixar</span>
                </a>
                <button
                  onClick={() => setViewingImage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
              <img
                src={viewingImage.url}
                alt={viewingImage.title}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Leitura de Markdown / Outros Materiais */}
      {selectedMaterial && (
        <div
          onClick={() => setSelectedMaterial(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {selectedMaterial.type}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedMaterial.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {selectedMaterial.type === 'md' && selectedMaterial.content_md ? (
                <MarkdownViewer content={selectedMaterial.content_md} />
              ) : selectedMaterial.file_url ? (
                <div className="text-center py-8 space-y-4">
                  <FileText size={48} className="mx-auto text-indigo-600 dark:text-indigo-400" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Arquivo disponível para download:
                  </p>
                  <a
                    href={selectedMaterial.file_url}
                    download
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
                  >
                    <Download size={16} />
                    Baixar Arquivo
                  </a>
                </div>
              ) : selectedMaterial.external_url ? (
                <div className="text-center py-8 space-y-4">
                  <ExternalLink size={48} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Acesse o material no link externo:
                  </p>
                  <a
                    href={selectedMaterial.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm"
                  >
                    <ExternalLink size={16} />
                    Abrir no Navegador
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

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
              <strong>
                {Number(payingPackage.price).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </strong>
              :
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

            <button
              onClick={() => setPayingPackage(null)}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modais Operacionais */}
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
