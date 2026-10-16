import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  FileText,
  FileCode,
  Image as ImageIcon,
  FolderArchive,
  Link as LinkIcon,
  Eye,
  Download,
  ExternalLink,
  Calendar,
  Users,
  Trash2,
  Plus,
  Library,
  Sparkles,
  Filter
} from 'lucide-react';
import { MaterialItem } from '../types';

interface MaterialsLibraryProps {
  materials: MaterialItem[];
  isTeacher?: boolean;
  onOpenMaterial: (material: MaterialItem) => void;
  onOpenClassById?: (classId: string) => void;
  onAddMaterial?: () => void;
  onDeleteMaterial?: (id: string, title: string) => void;
}

export const MaterialsLibrary: React.FC<MaterialsLibraryProps> = ({
  materials,
  isTeacher = false,
  onOpenMaterial,
  onOpenClassById,
  onAddMaterial,
  onDeleteMaterial
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'pdf' | 'md' | 'image' | 'zip' | 'link'>('all');
  const [originFilter, setOriginFilter] = useState<'all' | 'class' | 'general'>('all');

  const counts = useMemo(() => {
    return {
      all: materials.length,
      pdf: materials.filter((m) => m.type === 'pdf' || m.type === 'ebook').length,
      md: materials.filter((m) => m.type === 'md').length,
      image: materials.filter((m) => m.type === 'image').length,
      zip: materials.filter((m) => m.type === 'zip').length,
      link: materials.filter((m) => m.type === 'link').length
    };
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      // Filtro de categoria
      if (selectedType === 'pdf' && m.type !== 'pdf' && m.type !== 'ebook') return false;
      if (selectedType !== 'all' && selectedType !== 'pdf' && m.type !== selectedType) return false;

      // Filtro de origem (Vinculado a aula vs Material geral)
      if (originFilter === 'class' && !m.class_id && !m.class_title) return false;
      if (originFilter === 'general' && (m.class_id || m.class_title)) return false;

      // Busca textual
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        (m.class_title && m.class_title.toLowerCase().includes(q)) ||
        (m.content_md && m.content_md.toLowerCase().includes(q)) ||
        (m.recipient_names && m.recipient_names.toLowerCase().includes(q))
      );
    });
  }, [materials, selectedType, originFilter, searchQuery]);

  const getTypeVisuals = (type: MaterialItem['type']) => {
    switch (type) {
      case 'pdf':
      case 'ebook':
        return {
          label: 'E-book / PDF',
          icon: FileText,
          badgeClass:
            'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20',
          iconWrapClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        };
      case 'md':
        return {
          label: 'Resumo / Código',
          icon: FileCode,
          badgeClass:
            'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20',
          iconWrapClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
        };
      case 'image':
        return {
          label: 'Imagem / Esquema',
          icon: ImageIcon,
          badgeClass:
            'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20',
          iconWrapClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        };
      case 'zip':
        return {
          label: 'Pacote / Projeto ZIP',
          icon: FolderArchive,
          badgeClass:
            'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20',
          iconWrapClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
        };
      default:
        return {
          label: 'Link / Referência',
          icon: LinkIcon,
          badgeClass:
            'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20',
          iconWrapClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Banner e Controles da Biblioteca */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <Library size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Biblioteca Digital de Materiais</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  {materials.length} {materials.length === 1 ? 'item' : 'itens'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Explore apostilas, e-books, códigos comentados, esquemas visuais e arquivos das aulas em um só lugar.
              </p>
            </div>
          </div>

          {isTeacher && onAddMaterial && (
            <button
              type="button"
              onClick={onAddMaterial}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Publicar Novo Material</span>
            </button>
          )}
        </div>

        {/* Barra de Pesquisa + Filtro de Origem */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por título do material, tema da aula ou trecho de código..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <Filter size={13} className="text-slate-400 ml-2 hidden sm:block" />
            {[
              { id: 'all', label: 'Todos' },
              { id: 'class', label: 'De Aulas' },
              { id: 'general', label: 'Biblioteca Geral' }
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOriginFilter(o.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  originFilter === o.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pílulas de Categoria por Formato */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'Todos os Formatos', count: counts.all },
            { id: 'pdf', label: 'E-books & PDFs', count: counts.pdf },
            { id: 'md', label: 'Resumos & Códigos', count: counts.md },
            { id: 'image', label: 'Imagens & Diagramas', count: counts.image },
            { id: 'zip', label: 'Projetos ZIP', count: counts.zip },
            { id: 'link', label: 'Links & Vídeos', count: counts.link }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedType(cat.id as any)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedType === cat.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedType === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Grade de Materiais da Biblioteca */}
      {filteredMaterials.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
          <BookOpen size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Nenhum material encontrado
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {materials.length === 0
              ? 'Ainda não há materiais publicados nesta biblioteca.'
              : 'Tente limpar os filtros ou buscar por outro termo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((m) => {
            const visuals = getTypeVisuals(m.type);
            const IconComponent = visuals.icon;
            const hasSpecificRecipients =
              (m.recipient_count && m.recipient_count > 0) ||
              (m.student_id && m.student_id !== 'multiple');

            return (
              <div
                key={m.id}
                onClick={() => onOpenMaterial(m)}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-3">
                  {/* Topo do Card: Ícone + Badge + Data */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${visuals.iconWrapClass}`}
                      >
                        <IconComponent size={18} />
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${visuals.badgeClass}`}
                      >
                        {visuals.label}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {m.created_at ? m.created_at.substring(0, 10) : ''}
                    </span>
                  </div>

                  {/* Título */}
                  <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {m.title}
                  </h4>

                  {/* Vínculo com Aula */}
                  {m.class_title ? (
                    <div
                      onClick={(e) => {
                        if (m.class_id && onOpenClassById) {
                          e.stopPropagation();
                          onOpenClassById(m.class_id);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 text-xs text-indigo-700 dark:text-indigo-300 ${
                        m.class_id && onOpenClassById ? 'hover:bg-indigo-100 dark:hover:bg-indigo-900/60' : ''
                      }`}
                    >
                      <Calendar size={12} className="shrink-0" />
                      <span className="truncate font-medium">Aula: {m.class_title}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400">
                      <Sparkles size={11} />
                      <span>Acervo Geral da Biblioteca</span>
                    </div>
                  )}

                  {/* Se for professor, mostra destinatários */}
                  {isTeacher && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                      <Users size={12} className="text-indigo-500 shrink-0" />
                      <span className="truncate">
                        {hasSpecificRecipients
                          ? m.recipient_count
                            ? `${m.recipient_count} aluno(s): ${m.recipient_names || ''}`
                            : 'Aluno exclusivo'
                          : 'Compartilhado com TODOS os alunos'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rodapé de Ações Rápidas */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500">
                    <Eye size={14} />
                    <span>
                      {m.type === 'pdf' || m.type === 'ebook'
                        ? 'Ler na Plataforma'
                        : m.type === 'image'
                        ? 'Analisar Imagem'
                        : m.type === 'md'
                        ? 'Estudar Conteúdo'
                        : 'Abrir Material'}
                    </span>
                  </span>

                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {m.file_url && (
                      <a
                        href={m.file_url}
                        download
                        title="Baixar Arquivo"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <Download size={14} />
                      </a>
                    )}
                    {m.external_url && (
                      <a
                        href={m.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir Link Externo"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {isTeacher && onDeleteMaterial && (
                      <button
                        type="button"
                        onClick={() => onDeleteMaterial(m.id, m.title)}
                        title="Excluir da Biblioteca"
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
