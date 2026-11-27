import { useRef } from "react";
import { createPortal } from "react-dom";
import useFocusTrap from "./useFocusTrap";

export default function ConfirmDialog({
  open,
  title = "Confirmar ação",
  description = "Tem certeza que deseja continuar?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  confirming = false,
}) {
  const dialogRef = useRef(null);
  // Item 10: modal de verdade — Tab fica entre a sobreposição, Cancelar e
  // Confirmar, e o foco volta ao botão "Excluir" que abriu o diálogo. A
  // sobreposição fica fora de `aria-modal` para não capturar o foco inicial.
  useFocusTrap({ active: Boolean(open), containerRef: dialogRef, returnFocusTo: null });

  if (!open) return null;

  // O trap escuta o Tab no documento; a sobreposição e o cartão vivem sob
  // este nó, que também recebe foco quando não há nenhum focável.
  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel?.();
      }}
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="confirm-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            autoFocus
            className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {confirming ? "Excluindo..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
