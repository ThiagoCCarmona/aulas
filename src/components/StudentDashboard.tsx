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
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  MapPin,
  Sparkles,
  Video,
  X,
  History,
  Check,
  CalendarClock,
  Compass,
  Eye
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  tenant?: Tenant;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, tenant }) => {
  const [packageData, setPackageData] = useState<CurrentPackageResponse | null>(null);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [packageHistory, setPackageHistory] = useState<PackageInfo[]>([]);
  
  const [activeTab, setActiveTab] = useState<'cronograma' | 'materiais' | 'historico'>('cronograma');
  
  // Modais de Leitura
  const [viewingPdf, setViewingPdf] = useState<{ title: string; url: string } | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pkgRes, classesRes, materialsRes, histRes] = await Promise.all([
        api.getCurrentPackage(user.id),
        api.getStudentClasses(user.id),
        api.getMaterials(user.id),
        api.getPackageHistory(user.id)
      ]);
      setPackageData(pkgRes);
      setClasses(classesRes);
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

  const handleOpenMaterial = (m: MaterialItem) => {
    // Se for PDF ou E-book com arquivo no servidor, abre o leitor inline!
    if ((m.type === 'pdf' || m.type === 'ebook') && (m.file_url || m.external_url?.endsWith('.pdf'))) {
      setViewingPdf({
        title: m.title,
        url: m.file_url || m.external_url!
      });
    } else {
      setSelectedMaterial(m);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <span className="text-sm text-slate-400">Carregando seu plano de estudos...</span>
      </div>
    );
  }

  const inProgress = packageData?.in_progress;
  const pendingPayment = packageData?.pending_payment;
  const student = packageData?.student;
  const totalPackageClasses = inProgress?.total_classes || student?.package_total_classes || 4;

  // Montagem da grade completa das aulas do pacote (reais + slots previstos)
  const packageClassesList: {
    index: number;
    classData?: ClassSession;
    status: 'completed' | 'scheduled' | 'planned';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header do Aluno */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Olá, {user.name.split(' ')[0]}! 👋
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Seu portal de estudos e acompanhamento de aulas com {tenant?.name || 'seu professor'}.
          </p>
        </div>

        {student?.weekly_schedules && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <Calendar className="text-indigo-400 w-4 h-4 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Horário Semanal
              </span>
              <span className="font-semibold text-slate-200">{student.weekly_schedules}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Barra de Progresso do Pacote Atual (Foco Pedagógico) */}
      {inProgress && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm backdrop-blur-md space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass size={14} />
                Minha Trilha de Aulas
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Pacote de {inProgress.total_classes} Aulas
              </span>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              {inProgress.completed_classes} de {inProgress.total_classes} encontros realizados ({inProgress.percentage}%)
            </span>
          </div>

          {/* Barra de Progresso Suave */}
          <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
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

      {/* 3. Card de Acerto Pedagógico (Pix Discreto & Respeitoso - Só quando concluído) */}
      {pendingPayment && (
        <PixPaymentCard
          packageInfo={pendingPayment}
          tenant={tenant}
          studentName={user.name}
        />
      )}

      {/* 4. Abas de Conteúdo Pedagógico */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('cronograma')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'cronograma'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CalendarClock size={16} />
            <span>Cronograma do Pacote ({totalPackageClasses} Aulas)</span>
          </button>

          <button
            onClick={() => setActiveTab('materiais')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'materiais'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BookOpen size={16} />
            <span>Materiais & E-books ({materials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'historico'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <History size={16} />
            <span>Histórico de Ciclos</span>
          </button>
        </div>

        {/* Tab 1: Cronograma do Pacote (Aulas Concluídas + Futuras) */}
        {activeTab === 'cronograma' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 flex items-center justify-between pb-1">
              <span>Visualize o andamento completo das {totalPackageClasses} aulas contratadas no seu ciclo atual:</span>
            </div>

            <div className="space-y-3.5">
              {packageClassesList.map((slot) => {
                const c = slot.classData;
                const isCompleted = slot.status === 'completed';
                const isScheduled = slot.status === 'scheduled';
                const isPlanned = slot.status === 'planned';

                return (
                  <div
                    key={`slot-${slot.index}`}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      isCompleted
                        ? 'bg-slate-900/70 border-slate-800'
                        : isScheduled
                        ? 'bg-indigo-950/20 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/30 border-dashed border-slate-800/80 opacity-80'
                    }`}
                  >
                    {/* Cabeçalho do Card da Aula */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isScheduled
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse'
                              : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'
                          }`}
                        >
                          {isCompleted ? <Check size={16} /> : `0${slot.index}`}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base">
                              {c?.title || slot.title}
                            </h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isCompleted
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : isScheduled
                                  ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {isCompleted ? 'Concluída' : isScheduled ? 'Próxima Aula' : 'Planejada'}
                            </span>
                          </div>

                          {c?.date && (
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Clock size={12} />
                              {c.date}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Modalidade e Botão Online */}
                      {c && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              c.modality === 'online'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
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
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm"
                            >
                              <Video size={12} />
                              Ingressar na Sala
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Resumo do Conteúdo */}
                    {c?.summary ? (
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                        {c.summary}
                      </p>
                    ) : isPlanned ? (
                      <p className="text-xs text-slate-500 italic">
                        Tema curricular do ciclo programado para os próximos encontros.
                      </p>
                    ) : null}

                    {/* Homework */}
                    {c?.homework && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200">
                        <BookOpen size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Tarefa de Casa / Prática:</span>
                          <span>{c.homework}</span>
                        </div>
                      </div>
                    )}

                    {/* Materiais vinculados à aula */}
                    {c?.materials && c.materials.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-2">
                        {c.materials.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleOpenMaterial(m)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-xs text-indigo-300 hover:text-white transition-all cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Visualizar: {m.title}</span>
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

        {/* Tab 2: Biblioteca de Materiais & E-books */}
        {activeTab === 'materiais' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                <BookOpen size={36} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">Nenhum material cadastrado ainda.</p>
              </div>
            ) : (
              materials.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleOpenMaterial(m)}
                  className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {m.type === 'pdf' || m.type === 'ebook' ? 'E-book / PDF' : m.type === 'md' ? 'Markdown' : m.type}
                      </span>
                      <span className="text-xs text-slate-500">
                        {m.created_at ? m.created_at.substring(0, 10) : ''}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                      {m.title}
                    </h4>

                    {m.class_title && (
                      <p className="text-xs text-slate-400 mt-1">
                        Vinculado a: {m.class_title}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-400 group-hover:text-indigo-300 font-medium">
                    <span>{m.type === 'pdf' || m.type === 'ebook' ? 'Ler na plataforma' : 'Acessar conteúdo'}</span>
                    <Eye size={14} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Histórico de Pacotes */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            {packageHistory.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                <History size={36} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">Nenhum histórico disponível ainda.</p>
              </div>
            ) : (
              packageHistory.map((pkg, idx) => (
                <div
                  key={pkg.id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">
                        Ciclo #{packageHistory.length - idx} • {pkg.total_classes} Aulas
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          pkg.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : pkg.status === 'pending_payment'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {pkg.status === 'paid'
                          ? 'Quitado ✅'
                          : pkg.status === 'pending_payment'
                          ? 'Pendente'
                          : 'Em Andamento'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {pkg.paid_at
                        ? `Quitado em: ${pkg.paid_at.substring(0, 16)} via ${pkg.payment_method?.toUpperCase() || 'PIX'}`
                        : pkg.closed_at
                        ? `Concluído em: ${pkg.closed_at.substring(0, 16)}`
                        : 'Ciclo em andamento'}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-base font-extrabold text-white block">
                      {Number(pkg.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Visualizador de PDF / E-book Integrado na Plataforma */}
      {viewingPdf && (
        <PdfViewerModal
          title={viewingPdf.title}
          pdfUrl={viewingPdf.url}
          onClose={() => setViewingPdf(null)}
        />
      )}

      {/* Modal de Leitura de Markdown / Outros Materiais */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  {selectedMaterial.type}
                </span>
                <h3 className="text-lg font-bold text-white">{selectedMaterial.title}</h3>
              </div>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {selectedMaterial.type === 'md' && selectedMaterial.content_md ? (
                <MarkdownViewer content={selectedMaterial.content_md} />
              ) : selectedMaterial.file_url ? (
                <div className="text-center py-8 space-y-4">
                  <FileText size={48} className="mx-auto text-indigo-400" />
                  <p className="text-sm text-slate-300">Este arquivo está pronto para download.</p>
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
                  <ExternalLink size={48} className="mx-auto text-emerald-400" />
                  <p className="text-sm text-slate-300">Acesse o material no link externo:</p>
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
