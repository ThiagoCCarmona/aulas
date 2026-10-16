import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Video,
  MapPin,
  BookOpen,
  FileText,
  Download,
  ExternalLink,
  Eye,
  Copy,
  Check,
  MessageCircle,
  Edit2,
  Save,
  Plus,
  Upload,
  FileCode,
  Image as ImageIcon,
  Link as LinkIcon,
  Lock,
  CheckCircle2,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { ClassSession, MaterialItem, Tenant, User } from '../types';
import { MarkdownViewer } from './MarkdownViewer';
import { api } from '../services/api';

interface ClassDetailModalProps {
  classSession: ClassSession;
  lessonIndex?: number;
  user: User;
  tenant?: Tenant;
  studentName?: string;
  extraMaterials?: MaterialItem[];
  onClose: () => void;
  onOpenMaterial?: (material: MaterialItem) => void;
  onClassUpdated?: () => void;
}

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({
  classSession,
  lessonIndex,
  user,
  tenant,
  studentName,
  extraMaterials = [],
  onClose,
  onOpenMaterial,
  onClassUpdated
}) => {
  const isTeacher = user.role === 'teacher' || user.role === 'superadmin';

  // Mescla materiais vindos em classSession.materials com extraMaterials vinculados a class_id
  const mergedMaterials: MaterialItem[] = React.useMemo(() => {
    const map = new Map<string, MaterialItem>();
    (classSession.materials || []).forEach((m) => {
      if (m && m.id) map.set(m.id, m);
    });
    extraMaterials
      .filter((m) => m.class_id === classSession.id)
      .forEach((m) => {
        if (m && m.id) map.set(m.id, m);
      });
    return Array.from(map.values());
  }, [classSession, extraMaterials]);

  // Material atualmente selecionado para análise inline dentro da tela da aula
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(
    mergedMaterials[0]?.id || null
  );
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedHomework, setCopiedHomework] = useState(false);
  const [copiedImageLink, setCopiedImageLink] = useState(false);

  // Modo de edição da aula (exclusivo professor)
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(classSession.title);
  const [editDate, setEditDate] = useState(
    classSession.date ? classSession.date.replace(' ', 'T').slice(0, 16) : ''
  );
  const [editStatus, setEditStatus] = useState<ClassSession['status']>(
    classSession.status || 'completed'
  );
  const [editModality, setEditModality] = useState<'presencial' | 'online'>(
    classSession.modality || 'presencial'
  );
  const [editOnlineUrl, setEditOnlineUrl] = useState(classSession.online_url || '');
  const [editSummary, setEditSummary] = useState(classSession.summary || '');
  const [editHomework, setEditHomework] = useState(classSession.homework || '');
  const [editTeacherNotes, setEditTeacherNotes] = useState(classSession.teacher_notes || '');
  const [savingClass, setSavingClass] = useState(false);

  // Anexar novo material diretamente nesta aula (exclusivo professor)
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<'ebook' | 'md' | 'pdf' | 'zip' | 'link' | 'image'>('pdf');
  const [matExternalUrl, setMatExternalUrl] = useState('');
  const [matContentMd, setMatContentMd] = useState('');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMaterialId && mergedMaterials.length > 0) {
      setActiveMaterialId(mergedMaterials[0].id);
    }
  }, [mergedMaterials, activeMaterialId]);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeMaterial = mergedMaterials.find((m) => m.id === activeMaterialId) || null;

  const handleCopyText = (text: string, type: 'summary' | 'homework') => {
    navigator.clipboard.writeText(text);
    if (type === 'summary') {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } else {
      setCopiedHomework(true);
      setTimeout(() => setCopiedHomework(false), 2000);
    }
  };

  const handleCopyImageUrl = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedImageLink(true);
    setTimeout(() => setCopiedImageLink(false), 2000);
  };

  const handleSaveClassEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingClass(true);
      setErrorMsg(null);
      await api.updateClass(classSession.id, {
        title: editTitle,
        date: editDate.replace('T', ' '),
        status: editStatus,
        modality: editModality,
        online_url: editModality === 'online' ? editOnlineUrl : null,
        summary: editSummary,
        homework: editHomework,
        teacher_notes: editTeacherNotes
      });
      setIsEditing(false);
      if (onClassUpdated) onClassUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar dados da aula.');
    } finally {
      setSavingClass(false);
    }
  };

  const handleAttachMaterialToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) {
      setErrorMsg('Informe o título do material.');
      return;
    }

    try {
      setSavingMaterial(true);
      setErrorMsg(null);
      let fileUrl = null;
      if (matFile) {
        const up = await api.uploadFile(matFile);
        fileUrl = up.url;
      }

      await api.createMaterial({
        student_id: classSession.student_id,
        student_ids: [classSession.student_id],
        class_id: classSession.id,
        title: matTitle,
        type: matType,
        file_url: fileUrl,
        external_url: matExternalUrl.trim() ? matExternalUrl : null,
        content_md: matType === 'md' ? matContentMd : null
      });

      setMatTitle('');
      setMatExternalUrl('');
      setMatContentMd('');
      setMatFile(null);
      setShowAddMaterial(false);
      if (onClassUpdated) onClassUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao anexar material na aula.');
    } finally {
      setSavingMaterial(false);
    }
  };

  const whatsappUrl = api.buildWhatsAppUrl(
    tenant?.phone_whatsapp,
    `Olá ${tenant?.name || 'Professor'}! Estou revisando a aula "${classSession.title}" (${classSession.date}) na plataforma e gostaria de tirar uma dúvida.`
  );

  const statusConfig = {
    completed: {
      label: 'Aula Concluída',
      classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
    },
    scheduled: {
      label: 'Próxima Aula Agendada',
      classes: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
    },
    rescheduled: {
      label: 'Reagendada',
      classes: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    },
    no_show: {
      label: 'Falta Registrada',
      classes: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30'
    },
    planned: {
      label: 'Planejada no Ciclo',
      classes: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
    }
  }[classSession.status || 'completed'];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* 1. CABEÇALHO DETALHADO DA AULA */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {lessonIndex !== undefined && (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-indigo-600 text-white shadow-sm">
                    Aula {String(lessonIndex).padStart(2, '0')}
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusConfig.classes}`}
                >
                  {statusConfig.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    classSession.modality === 'online'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {classSession.modality === 'online' ? <Video size={12} /> : <MapPin size={12} />}
                  {classSession.modality === 'online' ? 'Online / Ao Vivo' : 'Presencial'}
                </span>
                {studentName && isTeacher && (
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    Aluno: {studentName}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {classSession.title}
              </h2>

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar size={13} className="text-indigo-500" />
                  {classSession.date || 'Horário a definir'}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <BookOpen size={13} className="text-indigo-500" />
                  {mergedMaterials.length} material(is) na aula
                </span>
              </div>
            </div>

            {/* Ações Rápidas do Topo */}
            <div className="flex items-center flex-wrap gap-2 self-start md:self-center">
              {classSession.modality === 'online' && classSession.online_url && (
                <a
                  href={classSession.online_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Video size={14} />
                  <span>Ingressar na Sala</span>
                </a>
              )}

              {!isTeacher && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  <MessageCircle size={15} />
                  <span>Tirar Dúvida no WhatsApp</span>
                </a>
              )}

              {isTeacher && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isEditing
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Edit2 size={13} />
                    <span>{isEditing ? 'Cancelar Edição' : 'Editar Aula'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddMaterial(!showAddMaterial)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Anexar Material</span>
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                title="Fechar (ESC)"
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* 2. CORPO DA TELA DETALHADA */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* FORMULÁRIO DE ANEXAR NOVO MATERIAL À AULA (Professor) */}
          {isTeacher && showAddMaterial && (
            <form
              onSubmit={handleAttachMaterialToClass}
              className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                  <Plus size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Novo Material Vinculado a Esta Aula
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Título do Material *
                  </label>
                  <input
                    type="text"
                    required
                    value={matTitle}
                    onChange={(e) => setMatTitle(e.target.value)}
                    placeholder="Ex: Slides da Aula, Exercícios ou Código Fonte"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Formato
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: 'pdf', label: 'PDF' },
                      { id: 'image', label: 'Imagem' },
                      { id: 'md', label: 'Markdown' },
                      { id: 'zip', label: 'ZIP' },
                      { id: 'link', label: 'Link' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setMatType(t.id as any)}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                          matType === t.id
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {matType === 'md' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Conteúdo Markdown / Código da Aula
                  </label>
                  <textarea
                    rows={4}
                    value={matContentMd}
                    onChange={(e) => setMatContentMd(e.target.value)}
                    placeholder="# Resumo ou Código&#10;&#10;```python&#10;print('Exemplo')&#10;```"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Upload size={12} /> Upload de Arquivo
                    </label>
                    <input
                      type="file"
                      accept={
                        matType === 'image'
                          ? '.png,.jpg,.jpeg'
                          : matType === 'pdf' || matType === 'ebook'
                          ? '.pdf'
                          : '.zip'
                      }
                      onChange={(e) => setMatFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 dark:file:bg-indigo-950 file:text-indigo-700 dark:file:text-indigo-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <LinkIcon size={12} /> Ou Link Externo
                    </label>
                    <input
                      type="url"
                      value={matExternalUrl}
                      onChange={(e) => setMatExternalUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingMaterial}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  <span>{savingMaterial ? 'Salvando...' : 'Salvar Material na Aula'}</span>
                </button>
              </div>
            </form>
          )}

          {/* MODO EDIÇÃO DA AULA (Professor) */}
          {isTeacher && isEditing ? (
            <form
              onSubmit={handleSaveClassEdit}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 size={15} className="text-indigo-500" />
                Editar Conteúdo e Registro da Aula
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Título / Tema da Aula
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data e Hora
                  </label>
                  <input
                    type="datetime-local"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="completed">✅ Concluída</option>
                    <option value="scheduled">📅 Agendada</option>
                    <option value="rescheduled">🔄 Reagendada</option>
                    <option value="no_show">❌ Falta Registrada</option>
                    <option value="planned">📝 Planejada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Modalidade
                  </label>
                  <select
                    value={editModality}
                    onChange={(e) => setEditModality(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="online">Online / Ao Vivo</option>
                  </select>
                </div>

                {editModality === 'online' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Link da Sala Online
                    </label>
                    <input
                      type="url"
                      value={editOnlineUrl}
                      onChange={(e) => setEditOnlineUrl(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Conteúdo & Resumo Detalhado da Aula (suporta Markdown e blocos de código)
                </label>
                <textarea
                  rows={5}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Descreva tudo o que foi abordado na aula, exemplos de código, pontos-chave..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tarefa de Casa / Prática Recomendada
                  </label>
                  <textarea
                    rows={3}
                    value={editHomework}
                    onChange={(e) => setEditHomework(e.target.value)}
                    placeholder="Exercícios ou práticas para o aluno fazer..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <Lock size={12} /> Observações Privadas do Professor (Invisível ao aluno)
                  </label>
                  <textarea
                    rows={3}
                    value={editTeacherNotes}
                    onChange={(e) => setEditTeacherNotes(e.target.value)}
                    placeholder="Anotações internas sobre desempenho ou próximos passos..."
                    className="w-full bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingClass}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{savingClass ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* VISUALIZAÇÃO COMPLETA DE ANÁLISE DO CONTEÚDO DA AULA */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna Principal: Conteúdo Ministrado, Resumo e Tarefa */}
              <div className="lg:col-span-7 space-y-5">
                {/* Card: Conteúdo e Resumo da Aula */}
                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      Conteúdo & Resumo da Aula
                    </h3>
                    {classSession.summary && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(classSession.summary!, 'summary')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors"
                      >
                        {copiedSummary ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedSummary ? 'Copiado!' : 'Copiar Resumo'}</span>
                      </button>
                    )}
                  </div>

                  {classSession.summary ? (
                    <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      <MarkdownViewer content={classSession.summary} />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">
                      Nenhum resumo detalhado foi registrado para este encontro ainda.
                    </p>
                  )}
                </div>

                {/* Card: Tarefa de Casa / Prática */}
                {classSession.homework && (
                  <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <BookOpen size={14} className="text-amber-600 dark:text-amber-400" />
                        Tarefa de Casa & Exercícios Práticos
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleCopyText(classSession.homework!, 'homework')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 text-[11px] font-semibold text-amber-800 dark:text-amber-300 cursor-pointer"
                      >
                        {copiedHomework ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedHomework ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 leading-relaxed">
                      <MarkdownViewer content={classSession.homework} />
                    </div>
                  </div>
                )}

                {/* Card Exclusivo do Professor: Teacher Notes */}
                {isTeacher && classSession.teacher_notes && (
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/30 space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <Lock size={13} />
                      Anotações Pedagógicas Privadas (Visível apenas para você)
                    </h4>
                    <p className="text-xs text-purple-900 dark:text-purple-200 whitespace-pre-line leading-relaxed">
                      {classSession.teacher_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Coluna Lateral / Direita: Materiais & Arquivos da Aula com Leitor Integrado */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <BookOpen size={14} />
                      Materiais & Anexos da Aula ({mergedMaterials.length})
                    </h3>
                  </div>

                  {mergedMaterials.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Nenhum material específico anexado a esta aula.
                      </p>
                      {isTeacher && (
                        <button
                          type="button"
                          onClick={() => setShowAddMaterial(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Anexar primeiro material</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mergedMaterials.map((m) => {
                        const isSelected = activeMaterial?.id === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setActiveMaterialId(m.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/40'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                                {m.type}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {m.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {onOpenMaterial && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenMaterial(m);
                                  }}
                                  title="Expandir em Tela Cheia"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-600 hover:text-white dark:text-slate-300 transition-colors cursor-pointer"
                                >
                                  <Maximize2 size={13} />
                                </button>
                              )}
                              {m.file_url && (
                                <a
                                  href={m.file_url}
                                  download
                                  onClick={(e) => e.stopPropagation()}
                                  title="Baixar Arquivo"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                  <Download size={13} />
                                </a>
                              )}
                              {m.external_url && (
                                <a
                                  href={m.external_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Abrir Link Externo"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* PAINEL DE INSPEÇÃO INLINE DO MATERIAL SELECIONADO */}
                  {activeMaterial && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Pré-visualização: {activeMaterial.title}
                        </span>
                        {onOpenMaterial && (
                          <button
                            type="button"
                            onClick={() => onOpenMaterial(activeMaterial)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Tela Cheia</span>
                          </button>
                        )}
                      </div>

                      {activeMaterial.type === 'md' && activeMaterial.content_md ? (
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-80 overflow-y-auto">
                          <MarkdownViewer content={activeMaterial.content_md} />
                        </div>
                      ) : activeMaterial.type === 'image' ||
                        (activeMaterial.file_url && /\.(png|jpe?g|webp)$/i.test(activeMaterial.file_url)) ? (
                        <div className="space-y-2">
                          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center p-2">
                            <img
                              src={activeMaterial.file_url || activeMaterial.external_url}
                              alt={activeMaterial.title}
                              className="max-h-64 w-auto object-contain rounded-lg"
                            />
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyImageUrl(
                                  (activeMaterial.file_url || activeMaterial.external_url)!
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              {copiedImageLink ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              <span>{copiedImageLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                            </button>
                            <a
                              href={activeMaterial.file_url || activeMaterial.external_url}
                              download
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                            >
                              <Download size={12} />
                              <span>Baixar</span>
                            </a>
                          </div>
                        </div>
                      ) : (activeMaterial.type === 'pdf' || activeMaterial.type === 'ebook') &&
                        activeMaterial.file_url ? (
                        <div className="space-y-2">
                          <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                            <iframe
                              src={activeMaterial.file_url}
                              title={activeMaterial.title}
                              className="w-full h-full border-0"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            {onOpenMaterial && (
                              <button
                                type="button"
                                onClick={() => onOpenMaterial(activeMaterial)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                              >
                                <Maximize2 size={12} />
                                <span>Abrir Leitor de PDF</span>
                              </button>
                            )}
                            <a
                              href={activeMaterial.file_url}
                              download
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                            >
                              <Download size={13} />
                              <span>Baixar PDF</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            Recurso disponível para acesso direto:
                          </span>
                          {activeMaterial.file_url ? (
                            <a
                              href={activeMaterial.file_url}
                              download
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                            >
                              <Download size={13} />
                              <span>Baixar Arquivo</span>
                            </a>
                          ) : activeMaterial.external_url ? (
                            <a
                              href={activeMaterial.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                            >
                              <ExternalLink size={13} />
                              <span>Acessar Link</span>
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
