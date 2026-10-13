import React, { useState } from 'react';
import { QrCode, Copy, Check, MessageCircle, Banknote, ChevronDown, ChevronUp, Sparkles, Receipt } from 'lucide-react';
import { PackageInfo, Tenant } from '../types';

interface PixPaymentCardProps {
  packageInfo: PackageInfo;
  tenant?: Tenant;
  studentName?: string;
}

export const PixPaymentCard: React.FC<PixPaymentCardProps> = ({
  packageInfo,
  tenant,
  studentName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (packageInfo.pix_payload) {
      navigator.clipboard.writeText(packageInfo.pix_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getWhatsAppLink = () => {
    const phone = tenant?.phone_whatsapp || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const valor = Number(packageInfo.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const text = encodeURIComponent(
      `Olá ${tenant?.name || 'Professor'}! Meu nome é ${studentName || 'Aluno'}. Segue o comprovante de pagamento do meu ciclo de ${packageInfo.total_classes} aulas (${valor}).`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const formattedPrice = Number(packageInfo.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 backdrop-blur-sm transition-all shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 shrink-0">
            <Receipt size={18} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Acerto do Ciclo Pedagógico ({packageInfo.total_classes} Aulas)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Aulas Concluídas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pacote finalizado. Valor: <strong className="text-white">{formattedPrice}</strong>. Pagamento pós-pago via Pix ou dinheiro.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer whitespace-nowrap self-end sm:self-auto"
        >
          <QrCode size={14} className="text-emerald-400" />
          <span>{isOpen ? 'Ocultar Opções Pix' : 'Opções de Pagamento Pix'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Conteúdo Expansível (Discreto e Elegante) */}
      {isOpen && (
        <div className="mt-5 pt-5 border-t border-slate-800/80 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* QR Code Container */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-slate-950 rounded-xl border border-slate-800">
              {packageInfo.pix_qrcode ? (
                <div className="bg-white p-2.5 rounded-lg shadow-md">
                  <img
                    src={packageInfo.pix_qrcode}
                    alt="QR Code Pix"
                    className="w-36 h-36 object-contain"
                  />
                </div>
              ) : (
                <div className="w-36 h-36 flex flex-col items-center justify-center text-slate-500">
                  <QrCode size={32} className="mb-1 opacity-40" />
                  <span className="text-[10px]">QR Code indisponível</span>
                </div>
              )}
              <span className="text-[11px] text-slate-400 mt-2 text-center">
                Aponte a câmera no app do seu banco
              </span>
            </div>

            {/* Informações e Ações */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Pix Copia e Cola
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={packageInfo.pix_payload || ''}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>Enviar Comprovante via WhatsApp</span>
                </a>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 w-full sm:w-auto">
                  <Banknote size={14} className="text-amber-400 shrink-0" />
                  <span>Dinheiro pode ser entregue na aula presencial.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
