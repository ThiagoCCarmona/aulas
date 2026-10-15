import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Upload,
  Link as LinkIcon,
  FileCode,
  CheckCircle2,
  Image as ImageIcon,
  Users,
  User,
  Check,
  Search,
  Trash2,
  ExternalLink,
  Download
} from 'lucide-react';
import { StudentListItem, MaterialItem } from '../types';
import { api } from '../services/api';

interface MaterialModalProps {
  students: StudentListItem[];
  defaultStudentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  students,
  defaultStudentId,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Destinatários: 'all' ou 'selected'
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected'>(
    defaultStudentId ? 'selected' : 'all'
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    defaultStudentId ? [defaultStudentId] : []
  );
  const [studentSearch, setStudentSearch] = useState('');

  // Formulário do Material
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'ebook' | 'md' | 'pdf' | 'zip' | 'link' | 'image'>('ebook');
  const [externalUrl, setExternalUrl] = useState('');
  const [contentMd, setContentMd] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Lista de materiais já cadastrados
  const [existingMaterials, setExistingMaterials] = useState<MaterialItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Carregar materiais quando abrir aba de lista
  const loadMaterialsList = async () => {
    try {
      setLoadingList(true);
      const data = await api.getAllMaterials();
      setExistingMaterials(data);
    } catch (err: any) {
      console.error('Erro ao carregar materiais:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      loadMaterialsList();
    }
  }, [activeTab]);

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map((s) => s.id);
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  const handleDeleteMaterial = async (id: string, matTitle: string) => {
    if (!confirm(`Deseja realmente excluir o material "${matTitle}"?`)) return;
    try {
      setDeletingId(id);
      await api.deleteMaterial(id);
      setExistingMaterials((prev) => prev.filter((m) => m.id !== id));
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir material');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título do material é obrigatório.');
      return;
    }

    if (recipientMode === 'selected' && selectedStudentIds.length === 0) {
      setError('Selecione pelo menos um aluno destinatário ou marque a opção "Compartilhar com TODOS os alunos".');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let fileUrl = null;
      if (file) {
        const uploadRes = await api.uploadFile(file);
        fileUrl = uploadRes.url;
      }

      await api.createMaterial({
        student_ids: recipientMode === 'all' ? [] : selectedStudentIds,
        student_id: recipientMode === 'all' ? null : (selectedStudentIds.length === 1 ? selectedStudentIds[0] : null),
        title,
        type,
        file_url: fileUrl,
        external_url: externalUrl.trim() ? externalUrl : null,
        content_md: type === 'md' ? contentMd : null
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar material.');
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
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8"
      >
        {/* Topo do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
              Gestão de Materiais & E-books
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Disponibilize PDFs, imagens, anotações de código ou links para alunos específicos ou toda a turma
            </p>
          </div>
          <button
            onClick={onClose}
            title="Fechar (ESC)"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas: Novo Material / Materiais Publicados */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-100/50 dark:bg-slate-950/20 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Lançar Novo Material
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>Materiais Publicados</span>
            {existingMaterials.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">
                {existingMaterials.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* SELEÇÃO DE DESTINATÁRIOS (TODOS OU QUANTIDADE SELECIONADA: 1, 2, 3...) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Destinatários do Material
              </label>

              {/* Botões de Modo: Todos vs Selecionados */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientMode('all')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    recipientMode === 'all'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <Users className={`w-4 h-4 mt-0.5 ${recipientMode === 'all' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Todos os Alunos
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Material global visível por toda a turma
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientMode('selected')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    recipientMode === 'selected'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <User className={`w-4 h-4 mt-0.5 ${recipientMode === 'selected' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Alunos Específicos</span>
                      {selectedStudentIds.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-extrabold">
                          {selectedStudentIds.length}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Escolha 1, 2, 3 ou mais alunos
                    </div>
                  </div>
                </button>
              </div>

              {/* Lista com caixas de seleção quando 'selected' estiver ativo */}
              {recipientMode === 'selected' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Filtrar por nome ou WhatsApp..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100 dark:divide-slate-800/40">
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">
                        Nenhum aluno encontrado para a busca.
                      </div>
                    ) : (
                      filteredStudents.map((s) => {
                        const isSelected = selectedStudentIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleStudentSelection(s.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                                : 'hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                                }`}
                              >
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <span className="text-xs font-semibold">{s.name}</span>
                            </div>

                            <span className="text-[11px] text-slate-400 font-mono">
                              {s.phone || s.email || ''}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-500">
                    <span>
                      {selectedStudentIds.length === 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">Nenhum aluno selecionado</span>
                      ) : (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {selectedStudentIds.length} aluno(s) selecionado(s)
                        </span>
                      )}
                    </span>
                    <span>Total de alunos: {students.length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Título do Material */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Título do Material *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: E-book: Guia de IA ou Foto do Esquema de Arquitetura"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Tipo de Material */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Material
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'ebook', label: 'E-book/PDF' },
                  { id: 'image', label: 'Imagem' },
                  { id: 'md', label: 'Markdown' },
                  { id: 'zip', label: 'Zip' },
                  { id: 'link', label: 'Link' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      type === item.id
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload ou Conteúdo */}
            {type === 'md' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileCode size={13} className="text-indigo-500" />
                  Conteúdo Markdown (com suporte a código e formatação)
                </label>
                <textarea
                  rows={5}
                  value={contentMd}
                  onChange={(e) => setContentMd(e.target.value)}
                  placeholder="# Título&#10;&#10;Explicação...&#10;&#10;```javascript&#10;console.log('Olá!');&#10;```"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <LinkIcon size={13} className="text-slate-400" />
                    Link Externo (Google Drive, GitHub, Notion, YouTube)
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://drive.google.com/... ou https://..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    {type === 'image' ? <ImageIcon size={13} className="text-indigo-500" /> : <Upload size={13} className="text-slate-400" />}
                    Ou Fazer Upload Direto ({type === 'image' ? 'PNG, JPG, JPEG' : type === 'ebook' || type === 'pdf' ? 'PDF' : 'ZIP'})
                  </label>
                  <input
                    type="file"
                    accept={type === 'image' ? '.png,.jpg,.jpeg' : type === 'ebook' || type === 'pdf' ? '.pdf' : '.zip'}
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700 cursor-pointer"
                  />
                  {file && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1 font-medium">
                      Selecionado: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
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
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {loading ? 'Salvando...' : 'Salvar Material'}
              </button>
            </div>
          </form>
        ) : (
          /* ABA: LISTA DE MATERIAIS JÁ PUBLICADOS */
          <div className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
            {loadingList ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Carregando materiais cadastrados...
              </div>
            ) : existingMaterials.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum material cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-2.5">
                {existingMaterials.map((m) => {
                  const hasSpecificRecipients = (m.recipient_count && m.recipient_count > 0) || (m.student_id && m.student_id !== 'multiple');
                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {m.type}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {m.title}
                          </h4>
                        </div>

                        {/* Indicação de Destinatários */}
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          {hasSpecificRecipients ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                              <Users size={12} />
                              {m.recipient_count ? `${m.recipient_count} aluno(s): ${m.recipient_names || ''}` : 'Aluno exclusivo'}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <Users size={12} />
                              Compartilhado com TODOS os alunos
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono">
                          Publicado em {new Date(m.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {m.external_url && (
                          <a
                            href={m.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir Link Externo"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {m.file_url && (
                          <a
                            href={m.file_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Baixar Arquivo"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={deletingId === m.id}
                          onClick={() => handleDeleteMaterial(m.id, m.title)}
                          title="Excluir Material"
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
