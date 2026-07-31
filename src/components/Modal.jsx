import { X } from "lucide-react";

export function Modal({ title, children, onClose, wide }) {
  return (
    <div className="db-overlay" onClick={onClose}>
      <div className={"db-modal " + (wide ? "wide" : "")} onClick={(e) => e.stopPropagation()}>
        {title !== null && (
          <div className="db-modal-head">
            <h3>{title}</h3>
            <button className="db-x" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
          </div>
        )}
        {title === null && (
          <button className="db-x float" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        )}
        <div className="db-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({ title, msg, confirmLabel = "Confirmar", onConfirm, onClose, danger }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="db-confirm-msg">{msg}</p>
      <div className="db-modal-actions">
        <button className="db-btn ghost" onClick={onClose}>Cancelar</button>
        <button className={"db-btn " + (danger ? "danger" : "gold")} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
