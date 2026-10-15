import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, MapPin, BookOpen, CheckCircle2, Upload, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { StudentListItem } from '../types';
import { api } from '../services/api';

interface FastClassModalProps {
  students: StudentListItem[];
  selectedStudentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const FastClassModal: React.FC<FastClassModalProps> = ({
  students,
  selectedStudentId,
  onClose,
  onSuccess
}) => {
  const [studentId, setStudentId] = useState(selectedStudentId || (students[0]?.id || ''));

  // Formatação automática para datetime-local no fuso horário do usuário
  const getInitialLocalDateTime = () => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  };

  const [status, setStatus] = useState<'completed' | 'scheduled' | 'planned' | 'rescheduled' | 'no_show'>('completed');
  const [dateTime, setDateTime] = useState(getInitialLocalDateTime());
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [modality, setModality] = useState<'presencial' | 'online'>('presencial');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [homework, setHomework] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');

  // Anexo de material
  const [includeMaterial, setIncludeMaterial] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState<'pdf' | 'md' | 'zip' | 'link' | 'image'>('pdf');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialContentMd, setMaterialContentMd] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fechamento via tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !title.trim()) {
      setError('Por favor, selecione o aluno e digite o título da aula.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let finalMaterialUrl = materialUrl;
      // Upload do arquivo se selecionado
      if (includeMaterial && materialFile) {
        const uploadRes = await api.uploadFile(materialFile);
        finalMaterialUrl = uploadRes.url;
      }

      // Converte YYYY-MM-DDTHH:mm para YYYY-MM-DD HH:mm
      const formattedDate = dateTime.replace('T', ' ');

      await api.createClass({
        student_id: studentId,
        date: formattedDate,
        title,
        summary,
        modality,
        status,
        online_url: modality === 'online' ? onlineUrl : null,
        homework: homework.trim() ? homework : null,
        teacher_notes: teacherNotes.trim() ? teacherNotes : null,
        material_title: includeMaterial ? (materialTitle || title) : null,
        material_type: includeMaterial ? materialType : null,
        material_url: includeMaterial ? finalMaterialUrl : null,
        material_content_md: includeMaterial ? materialContentMd : null
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar a aula.');
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
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
              {status === 'completed'
                ? 'Registrar Aula Realizada'
                : status === 'scheduled'
                ? 'Agendar Aula'
                : status === 'rescheduled'
                ? 'Reagendar Aula'
                : status === 'no_show'
                ? 'Registrar Falta do Aluno'
                : 'Planejar Aula Futura'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Controle pedagógico, frequência e cronograma do pacote
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Status da Aula: Gestão de Presença e Faltas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Status da Aula no Ciclo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  status === 'completed'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ✅ Realizada
              </button>
              <button
                type="button"
                onClick={() => setStatus('scheduled')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  status === 'scheduled'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📅 Agendada
              </button>
              <button
                type="button"
                onClick={() => setStatus('rescheduled')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  status === 'rescheduled'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🔄 Reagendada
              </button>
              <button
                type="button"
                onClick={() => setStatus('no_show')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  status === 'no_show'
                    ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300 shadow-sm'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ❌ Falta
              </button>
              <button
                type="button"
                onClick={() => setStatus('planned')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                  status === 'planned'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📝 Planejada
              </button>
            </div>
            {status === 'no_show' && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                Falta contabilizada: consome o saldo de aula do pacote acordado.
              </p>
            )}
            {status === 'rescheduled' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                <Clock size={12} />
                Aula reagendada não consome saldo até que seja realizada ou declarada falta.
              </p>
            )}
          </div>

          {/* Selecionar Aluno & Data (datetime-local nativo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Aluno *
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.completed_classes_in_package}/{s.package_total_classes} concluídas)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {status === 'completed' || status === 'no_show' ? 'Data e Horário Realizados' : 'Data e Horário Previstos'} *
              </label>
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Modalidade */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Modalidade
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModality('presencial')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  modality === 'presencial'
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MapPin size={14} />
                Presencial
              </button>
              <button
                type="button"
                onClick={() => setModality('online')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  modality === 'online'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Video size={14} />
                Online / Híbrida
              </button>
            </div>
          </div>

          {modality === 'online' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Link da Sala de Aula (Google Meet, Zoom, Teams)
              </label>
              <input
                type="url"
                value={onlineUrl}
                onChange={(e) => setOnlineUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Título da Aula */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tema / Título da Aula *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introdução a Funções e Algoritmos"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Resumo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Resumo do Conteúdo Abordado / Previsto
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Descreva brevemente o que foi ou será ensinado..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Tarefa de Casa */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tarefa de Casa / Prática Recomendada <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Ex: Resolver exercícios 1 ao 5..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Anotações Privadas do Professor (teacher_notes) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Anotações Privadas do Professor <span className="text-indigo-600 dark:text-indigo-400 font-normal">(Visível apenas para o professor)</span>
            </label>
            <input
              type="text"
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="Ex: Aluno teve dificuldade em recursão, retomar na próxima aula."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Toggle Anexar Material */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-600 dark:text-indigo-300 font-semibold">
              <input
                type="checkbox"
                checked={includeMaterial}
                onChange={(e) => setIncludeMaterial(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
              />
              <span>Vincular Material de Apoio (PDF, Imagem, Código, Link) nesta aula</span>
            </label>

            {includeMaterial && (
              <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="Título do Material"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as any)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="pdf">PDF / E-book (Leitura no site)</option>
                    <option value="image">Imagem (Foto da lousa / Esquema)</option>
                    <option value="md">Markdown / Código</option>
                    <option value="zip">Arquivo .ZIP de Código</option>
                    <option value="link">Link Externo (Drive/GitHub)</option>
                  </select>
                </div>

                {materialType === 'pdf' || materialType === 'zip' || materialType === 'image' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                      {materialType === 'image' ? <ImageIcon size={12} className="text-indigo-500" /> : <Upload size={12} className="text-indigo-500" />}
                      Selecione o arquivo do seu computador:
                    </label>
                    <input
                      type="file"
                      accept={
                        materialType === 'pdf'
                          ? '.pdf'
                          : materialType === 'image'
                          ? '.png,.jpg,.jpeg'
                          : '.zip'
                      }
                      onChange={(e) => setMaterialFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    />
                    {materialFile && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1">
                        Arquivo: {materialFile.name} ({(materialFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                ) : materialType === 'md' ? (
                  <textarea
                    rows={3}
                    value={materialContentMd}
                    onChange={(e) => setMaterialContentMd(e.target.value)}
                    placeholder="# Anotação da aula em Markdown..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                  />
                ) : (
                  <input
                    type="url"
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                    placeholder="Link do Google Drive, GitHub ou arquivo..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                )}
              </div>
            )}
          </div>

          {/* Botões de Ação */}
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {loading
                ? 'Salvando...'
                : status === 'completed' || status === 'no_show'
                ? 'Salvar e Contabilizar Aula'
                : 'Salvar no Cronograma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
