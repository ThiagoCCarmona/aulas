import React, { useState } from 'react';
import { X, BookOpen, Upload, Link as LinkIcon, FileCode, CheckCircle2 } from 'lucide-react';
import { StudentListItem } from '../types';
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
  const [studentId, setStudentId] = useState(defaultStudentId || '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'ebook' | 'md' | 'pdf' | 'zip' | 'link' | 'slides'>('ebook');
  const [externalUrl, setExternalUrl] = useState('');
  const [contentMd, setContentMd] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título do material é obrigatório.');
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
        student_id: studentId ? studentId : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="text-indigo-400 w-5 h-5" />
              Adicionar Material ou E-book
            </h2>
            <p className="text-xs text-slate-400">Disponibilize PDFs, anotações de código ou links para seus alunos</p>
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Destinatário
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Compartilhar com TODOS os alunos</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  Exclusivo para {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Título do Material *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: E-book: Introdução ao Vibe Coding ou Slides Aula 3"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipo de Material
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'ebook', label: 'E-book / PDF' },
                { id: 'md', label: 'Markdown' },
                { id: 'zip', label: 'Código / Zip' },
                { id: 'link', label: 'Link Drive' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    type === item.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {type === 'md' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileCode size={13} className="text-indigo-400" />
                Conteúdo Markdown (com suporte a código e formatação)
              </label>
              <textarea
                rows={6}
                value={contentMd}
                onChange={(e) => setContentMd(e.target.value)}
                placeholder="# Título&#10;&#10;Explicação...&#10;&#10;```javascript&#10;console.log('Olá!');&#10;```"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <LinkIcon size={13} className="text-slate-400" />
                  Link Externo (Google Drive, GitHub, Notion, YouTube)
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://drive.google.com/... ou https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Upload size={13} className="text-slate-400" />
                  Ou Fazer Upload Direto de Arquivo (PDF, ZIP, Slides)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>
            </div>
          )}

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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <CheckCircle2 size={16} />
              {loading ? 'Salvando...' : 'Salvar Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
