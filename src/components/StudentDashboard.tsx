import React, { useState, useEffect } from 'react';
import {
  CurrentPackageResponse,
  ClassSession,
  MaterialItem,
  Tenant,
  User,
  PackageInfo
} from '../types';
import { api } from '../services/api';
import { PixPaymentCard } from './PixPaymentCard';
import { MarkdownViewer } from './MarkdownViewer';
import { PdfViewerModal } from './PdfViewerModal';
import { ClassDetailModal } from './ClassDetailModal';
import { MaterialsLibrary } from './MaterialsLibrary';
import {
  BookOpen,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Video,
  X,
  History,
  Check,
  CalendarClock,
  Compass,
  Eye,
  Copy,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  XCircle,
  MessageCircle,
  Library,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  tenant?: Tenant;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, tenant }) => {
  const [packageData, setPackageData] = useState<CurrentPackageResponse | null>(null);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [allStudentClasses, setAllStudentClasses] = useState<ClassSession[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [packageHistory, setPackageHistory] = useState<PackageInfo[]>([]);

  const [activeTab, setActiveTab] = useState<'cronograma' | 'biblioteca' | 'historico'>('cronograma');

  // Tela de Visualização Detalhada da Aula
  const [selectedClassDetail, setSelectedClassDetail] = useState<{
    session: ClassSession;
    index?: number;
  } | null>(null);

  // Modais de Leitura e Visualização
  const [viewingPdf, setViewingPdf] = useState<{ title: string; url: string } | null>(null);
  const [viewingImage, setViewingImage] = useState<{ title: string; url: string } | null>(null);
  const [copiedImageLink, setCopiedImageLink] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);

  // Detalhamento de ciclos passados (Histórico)
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
  const [cycleClassesMap, setCycleClassesMap] = useState<Record<string, ClassSession[]>>({});
  const [loadingCycleId, setLoadingCycleId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Busca pacote atual para saber o ID do pacote em andamento
      const pkgRes = await api.getCurrentPackage(user.id);
      setPackageData(pkgRes);

      const targetPackageId = pkgRes.in_progress?.id || pkgRes.pending_payment?.id;

      // 2. Busca aulas do pacote ativo atual, todas as aulas, biblioteca de materiais e histórico
      const [classesRes, allClassesRes, materialsRes, histRes] = await Promise.all([
        api.getStudentClasses(user.id, targetPackageId),
        api.getStudentClasses(user.id),
        api.getMaterials(user.id),
        api.getPackageHistory(user.id)
      ]);

      setClasses(classesRes);
      setAllStudentClasses(allClassesRes);
      setMaterials(materialsRes);
      setPackageHistory(histRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  // Carregar aulas de um ciclo histórico ao expandir
  const handleToggleCycleDetails = async (pkgId: string) => {
    if (expandedPackageId === pkgId) {
      setExpandedPackageId(null);
      return;
    }

    setExpandedPackageId(pkgId);

    if (!cycleClassesMap[pkgId]) {
      try {
        setLoadingCycleId(pkgId);
        const cycleClasses = await api.getStudentClasses(user.id, pkgId);
        setCycleClassesMap((prev) => ({ ...prev, [pkgId]: cycleClasses }));
      } catch (err) {
        console.error('Erro ao buscar aulas do ciclo:', err);
      } finally {
        setLoadingCycleId(null);
      }
    }
  };

  const handleOpenMaterial = (m: MaterialItem) => {
    // 1. Se for imagem, abre visualizador de imagem
    if (m.type === 'image' || (m.file_url && /\.(png|jpe?g|webp)$/i.test(m.file_url))) {
      setViewingImage({
        title: m.title,
        url: m.file_url || m.external_url!
      });
      return;
    }

    // 2. Se for PDF ou E-book com arquivo no servidor, abre o leitor inline
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

    // 3. Demais materiais (Markdown, zip, links externos)
    setSelectedMaterial(m);
  };

  const handleOpenClassById = (classId: string) => {
    const found =
      classes.find((c) => c.id === classId) ||
      allStudentClasses.find((c) => c.id === classId);
    if (found) {
      const idxInPkg = classes.findIndex((c) => c.id === classId);
      setSelectedClassDetail({
        session: found,
        index: idxInPkg >= 0 ? idxInPkg + 1 : undefined
      });
    }
  };

  const handleCopyImageUrl = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedImageLink(true);
    setTimeout(() => setCopiedImageLink(false), 2000);
  };

  const whatsappContactUrl = api.buildWhatsAppUrl(
    tenant?.phone_whatsapp,
    `Olá ${tenant?.name || 'Professor'}! Tudo bem? Estou acessando minha área do aluno na plataforma e gostaria de falar com você.`
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Carregando seu plano de estudos...
        </span>
      </div>
    );
  }

  const inProgress = packageData?.in_progress;
  const pendingPayment = packageData?.pending_payment;
  const student = packageData?.student;
  const totalPackageClasses = inProgress?.total_classes || student?.package_total_classes || 4;

  // Montagem da grade completa das aulas do pacote (aulas registradas do pacote + slots previstos)
  const packageClassesList: {
    index: number;
    classData?: ClassSession;
    status: 'completed' | 'scheduled' | 'planned' | 'rescheduled' | 'no_show';
    title: string;
  }[] = [];

  for (let i = 0; i < totalPackageClasses; i++) {
    const existing = classes[i];
    if (existing) {
      packageClassesList.push({
        index: i + 1,
        classData: existing,
        status: existing.status || 'completed',
        title: existing.title
      });
    } else {
      packageClassesList.push({
        index: i + 1,
        status: 'planned',
        title: `Aula ${i + 1} do Pacote (Tema a definir com o professor)`
      });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      {/* 1. Header do Aluno + Botão Direto de WhatsApp */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Olá, {user.name.split(' ')[0]}! 👋
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Seu portal de estudos, análise detalhada de aulas e biblioteca digital com{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {tenant?.name || 'seu professor'}
            </strong>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {student?.weekly_schedules && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <Calendar className="text-indigo-600 dark:text-indigo-400 w-4 h-4 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Horário Semanal
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {student.weekly_schedules}
                </span>
              </div>
            </div>
          )}

          <a
            href={whatsappContactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <MessageCircle size={18} />
            <span>Falar com {tenant?.name?.split(' ')[0] || 'o Professor'} no WhatsApp</span>
          </a>
        </div>
      </div>

      {/* 2. Barra de Progresso do Pacote Atual */}
      {inProgress && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 shadow-sm backdrop-blur-md space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass size={14} />
                Minha Trilha de Aulas
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                Pacote de {inProgress.total_classes} Aulas
              </span>
            </div>

            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {inProgress.completed_classes} de {inProgress.total_classes} encontros contabilizados (
              {inProgress.percentage}%)
            </span>
          </div>

          {/* Barra de Progresso Suave */}
          <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${inProgress.percentage || 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Aulas adiadas acumulam e não expiram</span>
            <span>Contribuição pós-paga após a conclusão de todas as aulas</span>
          </div>
        </div>
      )}

      {/* 3. Card de Acerto Pedagógico (Pix) */}
      {pendingPayment && (
        <PixPaymentCard packageInfo={pendingPayment} tenant={tenant} studentName={user.name} />
      )}

      {/* 4. Abas de Conteúdo Pedagógico */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('cronograma')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'cronograma'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <CalendarClock size={16} />
            <span>Cronograma & Aulas ({totalPackageClasses})</span>
          </button>

          <button
            onClick={() => setActiveTab('biblioteca')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'biblioteca'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Library size={16} />
            <span>Biblioteca de Materiais ({materials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'historico'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <History size={16} />
            <span>Histórico de Ciclos</span>
          </button>
        </div>

        {/* Tab 1: Cronograma do Pacote (Com acesso à Visualização Detalhada da Aula) */}
        {activeTab === 'cronograma' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <span>
                Clique em qualquer aula realizada ou agendada para abrir a{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  Tela de Visualização Detalhada da Aula
                </strong>{' '}
                com todo o conteúdo e materiais:
              </span>
            </div>

            <div className="space-y-3.5">
              {packageClassesList.map((slot) => {
                const c = slot.classData;
                const isCompleted = slot.status === 'completed';
                const isScheduled = slot.status === 'scheduled';
                const isPlanned = slot.status === 'planned';
                const isRescheduled = slot.status === 'rescheduled';
                const isNoShow = slot.status === 'no_show';

                // Materiais vinculados a esta aula (tanto via c.materials quanto na lista de materials com class_id)
                const linkedMaterialsCount = c
                  ? new Set([
                      ...(c.materials || []).map((m) => m.id),
                      ...materials.filter((m) => m.class_id === c.id).map((m) => m.id)
                    ]).size
                  : 0;

                return (
                  <div
                    key={`slot-${slot.index}`}
                    onClick={() => {
                      if (c) {
                        setSelectedClassDetail({ session: c, index: slot.index });
                      }
                    }}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      c ? 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500/60' : ''
                    } ${
                      isCompleted
                        ? 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm'
                        : isScheduled
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/40 shadow-sm'
                        : isRescheduled
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/40'
                        : isNoShow
                        ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-500/40'
                        : 'bg-slate-50/60 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800/80 opacity-80'
                    }`}
                  >
                    {/* Cabeçalho do Card da Aula */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/60 pb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : isScheduled
                              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 animate-pulse'
                              : isRescheduled
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : isNoShow
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 border border-slate-200 dark:border-slate-700/40'
                          }`}
                        >
                          {isCompleted ? (
                            <Check size={16} />
                          ) : isNoShow ? (
                            <XCircle size={16} />
                          ) : isRescheduled ? (
                            <RefreshCw size={14} />
                          ) : (
                            `0${slot.index}`
                          )}
                        </span>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">
                              {c?.title || slot.title}
                            </h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isCompleted
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                  : isScheduled
                                  ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                                  : isRescheduled
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                  : isNoShow
                                  ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isCompleted
                                ? 'Concluída'
                                : isScheduled
                                ? 'Próxima Aula'
                                : isRescheduled
                                ? 'Reagendada'
                                : isNoShow
                                ? 'Falta Registrada'
                                : 'Planejada'}
                            </span>
                          </div>

                          {c?.date && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Clock size={12} />
                              {c.date}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Modalidade, Sala Online e Botão de Abrir Detalhes */}
                      {c && (
                        <div
                          className="flex items-center flex-wrap gap-2 self-start sm:self-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              c.modality === 'online'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {c.modality === 'online' ? <Video size={13} /> : <MapPin size={13} />}
                            {c.modality === 'online' ? 'Online / Híbrida' : 'Presencial'}
                          </span>

                          {c.modality === 'online' && c.online_url && (
                            <a
                              href={c.online_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                            >
                              <Video size={12} />
                              Ingressar na Sala
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedClassDetail({ session: c, index: slot.index })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                          >
                            <Sparkles size={13} />
                            <span>Ver Aula Detalhada</span>
                            {linkedMaterialsCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                                {linkedMaterialsCount}
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Resumo do Conteúdo */}
                    {c?.summary ? (
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/60 line-clamp-3">
                        {c.summary}
                      </p>
                    ) : isPlanned ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                        Tema curricular do ciclo programado para os próximos encontros.
                      </p>
                    ) : null}

                    {/* Homework */}
                    {c?.homework && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
                        <BookOpen
                          size={14}
                          className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                        />
                        <div>
                          <span className="font-bold block">Tarefa de Casa / Prática:</span>
                          <span className="line-clamp-2">{c.homework}</span>
                        </div>
                      </div>
                    )}

                    {/* Materiais vinculados à aula */}
                    {c?.materials && c.materials.length > 0 && (
                      <div
                        className="pt-1 flex flex-wrap items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.materials.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleOpenMaterial(m)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
                          >
                            <Eye size={13} />
                            <span>Material: {m.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Espaço de Biblioteca com Todos os Materiais */}
        {activeTab === 'biblioteca' && (
          <MaterialsLibrary
            materials={materials}
            isTeacher={false}
            onOpenMaterial={handleOpenMaterial}
            onOpenClassById={handleOpenClassById}
          />
        )}

        {/* Tab 3: Histórico de Ciclos com Fechamento e Detalhamento */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 pb-1">
              Clique em qualquer pacote quitado ou finalizado abaixo para auditar e visualizar o
              histórico exato das aulas daquele ciclo:
            </div>

            {packageHistory.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <History size={36} className="mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Nenhum histórico disponível ainda.
                </p>
              </div>
            ) : (
              packageHistory.map((pkg, idx) => {
                const isExpanded = expandedPackageId === pkg.id;
                const cycleClasses = cycleClassesMap[pkg.id] || [];
                const isLoadingCycle = loadingCycleId === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm transition-all"
                  >
                    {/* Cabeçalho do Ciclo Clicável */}
                    <div
                      onClick={() => handleToggleCycleDetails(pkg.id)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">
                            Ciclo #{packageHistory.length - idx} • {pkg.total_classes} Aulas
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              pkg.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                : pkg.status === 'pending_payment'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20'
                            }`}
                          >
                            {pkg.status === 'paid'
                              ? 'Quitado ✅'
                              : pkg.status === 'pending_payment'
                              ? 'Pendente'
                              : 'Em Andamento'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {pkg.paid_at
                            ? `Quitado em: ${pkg.paid_at.substring(0, 16).replace('T', ' ')} via ${
                                pkg.payment_method?.toUpperCase() || 'PIX'
                              }`
                            : pkg.closed_at
                            ? `Concluído em: ${pkg.closed_at.substring(0, 16).replace('T', ' ')}`
                            : 'Ciclo em andamento'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">
                          {Number(pkg.price).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                          <span>{isExpanded ? 'Ocultar Aulas' : 'Ver Aulas'}</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Detalhamento das Aulas deste Ciclo Específico */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 space-y-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Aulas Realizadas neste Ciclo (clique na aula para abrir todos os detalhes):
                        </span>

                        {isLoadingCycle ? (
                          <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                            <span>Carregando aulas do ciclo...</span>
                          </div>
                        ) : cycleClasses.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">
                            Nenhum registro de aula arquivado neste pacote.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {cycleClasses.map((item, cIdx) => (
                              <div
                                key={item.id}
                                onClick={() =>
                                  setSelectedClassDetail({ session: item, index: cIdx + 1 })
                                }
                                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs space-y-1.5 shadow-sm cursor-pointer transition-all"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                      Aula {cIdx + 1}:
                                    </span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {item.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                                      <Clock size={11} />
                                      {item.date}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                                      <span>Abrir Aula</span>
                                      <ArrowUpRight size={12} />
                                    </span>
                                  </div>
                                </div>
                                {item.summary && (
                                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                                    {item.summary}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Botão Flutuante de Contato Rápido via WhatsApp */}
      <a
        href={whatsappContactUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Falar com o Professor no WhatsApp"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-2xl shadow-emerald-600/40 hover:scale-105 transition-all"
      >
        <MessageCircle size={20} />
        <span>Falar no WhatsApp</span>
      </a>

      {/* TELA DE VISUALIZAÇÃO DETALHADA DA AULA */}
      {selectedClassDetail && (
        <ClassDetailModal
          classSession={selectedClassDetail.session}
          lessonIndex={selectedClassDetail.index}
          user={user}
          tenant={tenant}
          extraMaterials={materials}
          onClose={() => setSelectedClassDetail(null)}
          onOpenMaterial={handleOpenMaterial}
          onClassUpdated={loadData}
        />
      )}

      {/* Visualizador de PDF / E-book */}
      {viewingPdf && (
        <PdfViewerModal
          title={viewingPdf.title}
          pdfUrl={viewingPdf.url}
          onClose={() => setViewingPdf(null)}
        />
      )}

      {/* Visualizador de Imagens com Cópia e Download */}
      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <ImageIcon size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {viewingImage.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyImageUrl(viewingImage.url)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copiedImageLink ? (
                    <>
                      <Check size={14} className="text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>

                <a
                  href={viewingImage.url}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Baixar Imagem</span>
                </a>

                <button
                  onClick={() => setViewingImage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
              <img
                src={viewingImage.url}
                alt={viewingImage.title}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
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
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900">
              {selectedMaterial.type === 'md' && selectedMaterial.content_md ? (
                <MarkdownViewer content={selectedMaterial.content_md} />
              ) : selectedMaterial.file_url ? (
                <div className="text-center py-8 space-y-4">
                  <FileText size={48} className="mx-auto text-indigo-600 dark:text-indigo-400" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Este arquivo está pronto para download.
                  </p>
                  <a
                    href={selectedMaterial.file_url}
                    download
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20"
                  >
                    <Download size={16} />
                    Baixar Arquivo
                  </a>
                </div>
              ) : selectedMaterial.external_url ? (
                <div className="text-center py-8 space-y-4">
                  <ExternalLink
                    size={48}
                    className="mx-auto text-emerald-600 dark:text-emerald-400"
                  />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Acesse o material no link externo:
                  </p>
                  <a
                    href={selectedMaterial.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20"
                  >
                    <ExternalLink size={16} />
                    Abrir no Navegador
                  </a>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Nenhum conteúdo adicional cadastrado.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
