import React, { useState } from 'react';
import { X, Calendar, Clock, Video, MapPin, BookOpen, FileText, CheckCircle2, Lock, Upload, Link as LinkIcon, Sparkles } from 'lucide-react';
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
  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const [status, setStatus] = useState<'completed' | 'scheduled' | 'planned'>('completed');
  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [modality, setModality] = useState<'presencial' | 'online'>('presencial');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [homework, setHomework] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  
  // Anexo de material do computador ou link
  const [includeMaterial, setIncludeMaterial] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState<'pdf' | 'md' | 'zip' | 'link' | 'slides'>('pdf');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialContentMd, setMaterialContentMd] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Upload do arquivo do computador se selecionado
      if (includeMaterial && materialFile) {
        const uploadRes = await api.uploadFile(materialFile);
        finalMaterialUrl = uploadRes.url;
      }

      await api.createClass({
        student_id: studentId,
        date,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="text-indigo-400 w-5 h-5" />
              {status === 'completed' ? 'Registrar Aula Realizada' : status === 'scheduled' ? 'Agendar Próxima Aula' : 'Planejar Aula Futura'}
            </h2>
            <p className="text-xs text-slate-400">Lance aulas concluídas ou planeje o cronograma das 4 aulas do pacote</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Tipo de Registro (Concluída vs Agendada vs Planejada) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Etapa da Aula no Pacote
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  status === 'completed'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ✅ Realizada
              </button>
              <button
                type="button"
                onClick={() => setStatus('scheduled')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  status === 'scheduled'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                📅 Agendada
              </button>
              <button
                type="button"
                onClick={() => setStatus('planned')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  status === 'planned'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                📝 Planejada
              </button>
            </div>
          </div>

          {/* Selecionar Aluno & Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Aluno *
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.completed_classes_in_package}/{s.package_total_classes} concluídas)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {status === 'completed' ? 'Data e Hora da Aula' : 'Data Prevista'}
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="AAAA-MM-DD HH:MM"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Modalidade */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Modalidade
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModality('presencial')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  modality === 'presencial'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
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
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Video size={14} />
                Online / Híbrida
              </button>
            </div>
          </div>

          {modality === 'online' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Link da Sala de Aula (Google Meet, Zoom, Teams)
              </label>
              <input
                type="url"
                value={onlineUrl}
                onChange={(e) => setOnlineUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Título da Aula */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tema / Título da Aula *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introdução a Funções e Estruturas de Decisão"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Resumo / Tópicos */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Resumo do Conteúdo {status === 'completed' ? 'Abordado' : 'Previsto'}
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Descreva brevemente o que foi ou será ensinado..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Tarefa de Casa (Homework) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tarefa de Casa / Prática Recomendada <span className="text-slate-500 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Ex: Resolver os 3 primeiros exercícios da folha..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Toggle Anexar Material do Computador */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-300 font-semibold">
              <input
                type="checkbox"
                checked={includeMaterial}
                onChange={(e) => setIncludeMaterial(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-700"
              />
              <span>Vincular Material ou E-book do Computador nesta aula</span>
            </label>

            {includeMaterial && (
              <div className="mt-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="Título do Material / E-book"
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="pdf">Arquivo PDF / E-book (Leitura no site)</option>
                    <option value="md">Markdown / Anotação de Código</option>
                    <option value="zip">Arquivo .ZIP de Código</option>
                    <option value="link">Link Externo (Drive/GitHub)</option>
                  </select>
                </div>

                {materialType === 'pdf' || materialType === 'zip' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Upload size={12} className="text-indigo-400" />
                      Selecione o arquivo do seu computador:
                    </label>
                    <input
                      type="file"
                      accept={materialType === 'pdf' ? '.pdf' : '.zip,.rar,.tar'}
                      onChange={(e) => setMaterialFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    />
                    {materialFile && (
                      <span className="text-[10px] text-emerald-400 block mt-1">
                        Arquivo selecionado: {materialFile.name} ({(materialFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                ) : materialType === 'md' ? (
                  <textarea
                    rows={3}
                    value={materialContentMd}
                    onChange={(e) => setMaterialContentMd(e.target.value)}
                    placeholder="# Tópicos em Markdown&#10;```bash&#10;npm install&#10;```"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                  />
                ) : (
                  <input
                    type="url"
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                    placeholder="Link do Google Drive ou GitHub..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
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
              className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {loading ? 'Salvando...' : status === 'completed' ? 'Salvar e Contabilizar Aula' : 'Salvar no Cronograma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
