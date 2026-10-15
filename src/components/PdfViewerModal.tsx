import React, { useState, useEffect } from 'react';
import { X, Download, Maximize2, Minimize2, BookOpen, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface PdfViewerModalProps {
  title: string;
  pdfUrl: string;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  title,
  pdfUrl,
  onClose
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Suporte a fechamento via tecla Escape (ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 dark:bg-slate-950/85 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen ? 'h-full max-h-screen rounded-none' : 'max-w-5xl h-[90vh]'
        }`}
      >
        {/* Barra Superior / Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <BookOpen size={16} />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {title}
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                <ShieldCheck size={11} className="text-emerald-500 dark:text-emerald-400" />
                Visualizador de E-book Integrado • Leitura na Plataforma
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Abrir em Tela Cheia */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Reduzir janela' : 'Tela cheia'}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="hidden sm:inline text-xs">{isFullscreen ? 'Janela' : 'Tela Cheia'}</span>
            </button>

            {/* Download opcional */}
            <a
              href={pdfUrl}
              download
              title="Baixar cópia local do PDF"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Download size={15} />
              <span className="hidden sm:inline text-xs">Baixar</span>
            </a>

            {/* Fechar */}
            <button
              onClick={onClose}
              title="Fechar leitor (ESC)"
              className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500/30 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Área do Documento PDF com link de Fallback para Mobile */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden relative flex flex-col">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            title={title}
            className="w-full flex-1 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-inner"
          />

          {/* Link de fallback visível ou caso não renderize no mobile */}
          <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1 text-[11px]">
              <AlertCircle size={13} className="text-amber-500 shrink-0" />
              O leitor não abriu no seu celular?
            </span>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <ExternalLink size={12} />
              Toque aqui para abrir diretamente o PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
