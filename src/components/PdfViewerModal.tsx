import React, { useState } from 'react';
import { X, Download, Maximize2, Minimize2, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div
        className={`relative w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen ? 'h-full max-h-screen rounded-none' : 'max-w-5xl h-[90vh]'
        }`}
      >
        {/* Barra Superior / Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <BookOpen size={16} />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {title}
              </h3>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <ShieldCheck size={11} className="text-emerald-400" />
                Visualizador de E-book Integrado • Leitura na Plataforma
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Abrir em Tela Cheia */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Reduzir janela' : 'Tela cheia'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="hidden sm:inline text-xs">{isFullscreen ? 'Janela' : 'Tela Cheia'}</span>
            </button>

            {/* Download opcional */}
            <a
              href={pdfUrl}
              download
              title="Baixar cópia local do PDF"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Download size={15} />
              <span className="hidden sm:inline text-xs">Baixar</span>
            </a>

            {/* Fechar */}
            <button
              onClick={onClose}
              title="Fechar leitor"
              className="p-2 rounded-xl bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Área do Documento PDF */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden relative">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            title={title}
            className="w-full h-full rounded-xl border border-slate-800/80 bg-slate-900 shadow-inner"
          />
        </div>
      </div>
    </div>
  );
};
