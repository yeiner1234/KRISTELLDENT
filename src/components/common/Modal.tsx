import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  badge?: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  children: ReactNode;
}

function Modal({ isOpen, onClose, title, badge, footer, maxWidth = 'max-w-[460px]', children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(18,35,43,0.42)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className={`w-full ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-adm-modal`}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-adm-line-div px-[22px] py-5">
              <div className="flex flex-col gap-1.5">
                {title && <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-adm-ink-700">{title}</h3>}
                {badge}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-adm-ink-400 transition-colors hover:bg-adm-line-faint hover:text-adm-ink-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-[22px] py-2">{children}</div>

            {footer && (
              <div className="flex flex-wrap justify-end gap-2 px-[22px] py-[18px]">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
