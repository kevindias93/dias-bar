import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "./Modal";
import { num } from "../lib/format";

// Modal para lançar um valor de venda manual (avulso), sem produto cadastrado.
// Útil para "Diversos", doses combinadas, ou qualquer cobrança de valor livre.
export default function ManualEntryModal({ onConfirm, onClose, title = "Lançar valor manual" }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const valid = num(price) > 0;

  const confirm = () => {
    if (!valid) return;
    onConfirm({ name: name.trim() || "Diversos", price: num(price) });
  };

  return (
    <Modal title={title} onClose={onClose}>
      <p className="db-mode-hint">Digite o valor desejado. Entra na conta sem baixar estoque — ideal para itens fora do cardápio.</p>
      <label className="db-field">
        <span>Descrição (opcional)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Diversos, Dose dupla" autoFocus />
      </label>
      <label className="db-field">
        <span>Valor de venda (R$)</span>
        <input type="number" inputMode="decimal" min="0" step="0.5" value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirm()} placeholder="0,00" />
      </label>
      <div className="db-modal-actions">
        <button className="db-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="db-btn gold" onClick={confirm} disabled={!valid}><Check size={16} /> Lançar</button>
      </div>
    </Modal>
  );
}
