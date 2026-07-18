import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore, type Toast } from '@/lib/game/ui';
import { cn } from '@/lib/utils';

/**
 * XPToast — bottom-right stack, mono `+25 XP — lab complete`, gold left
 * border, slide-in 250 ms, auto-dismiss 2.4 s. Max 3 stacked (enforced by
 * the ui store). Mount once inside Layout.
 */

const KIND_STYLES: Record<Toast['kind'], string> = {
  xp: 'border-l-xp text-xp',
  success: 'border-l-success text-success',
  danger: 'border-l-danger text-danger',
  info: 'border-l-focus text-focus',
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((s) => s.dismissToast);
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 2400);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);

  return (
    <motion.div
      layout="position"
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'pointer-events-auto w-[320px] max-w-[calc(100vw-32px)] rounded-lg border border-line border-l-[3px] bg-surface-2/95 px-4 py-3 shadow-lg backdrop-blur',
        KIND_STYLES[toast.kind],
      )}
    >
      <p className="font-mono text-[13px] lowercase leading-snug">{toast.text}</p>
    </motion.div>
  );
}

export default function XPToast() {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
