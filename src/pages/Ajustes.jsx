import { useState } from "react";
import { Plus, Pencil, Trash2, CreditCard, Landmark } from "lucide-react";
import { useData } from "../context/DataContext";
import { useToast } from "../components/Toast";
import { Modal, ConfirmModal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export default function Ajustes() {
  const {
    machines, accounts,
    addMachine, updateMachine, deleteMachine,
    addAccount, updateAccount, deleteAccount,
  } = useData();
  const { user } = useAuth();
  const flash = useToast();

  const [editMachine, setEditMachine] = useState(null);
  const [editAccount, setEditAccount] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind, item }

  const saveMachine = async (m) => {
    if (m.id) await updateMachine(m.id, { name: m.name.trim(), note: m.note?.trim() || "" });
    else await addMachine({ name: m.name.trim(), note: m.note?.trim() || "" });
    setEditMachine(null); flash("Máquina salva");
  };
  const saveAccount = async (a) => {
    const payload = {
      label: a.label.trim(), bank: a.bank?.trim() || "",
      agency: a.agency?.trim() || "", account: a.account?.trim() || "",
      holder: a.holder?.trim() || "",
    };
    if (a.id) await updateAccount(a.id, payload); else await addAccount(payload);
    setEditAccount(null); flash("Conta salva");
  };
  const doDelete = async () => {
    if (confirm.kind === "machine") { await deleteMachine(confirm.item.id); flash("Máquina removida", "warn"); }
    else { await deleteAccount(confirm.item.id); flash("Conta removida", "warn"); }
    setConfirm(null);
  };

  return (
    <div>
      <h2>Ajustes</h2>

      {/* máquinas */}
      <div className="db-cfg-block">
        <div className="db-cfg-head">
          <span className="db-cfg-title"><CreditCard size={16} /> Máquinas de cartão</span>
          <button className="db-btn gold sm" onClick={() => setEditMachine({})}><Plus size={15} /> Nova</button>
        </div>
        {machines.length === 0 && <p className="db-cat-empty">Nenhuma máquina cadastrada.</p>}
        {machines.map((m) => (
          <div key={m.id} className="db-item">
            <div className="db-item-main">
              <span className="db-item-name">{m.name}</span>
              {m.note && <span className="db-item-meta">{m.note}</span>}
            </div>
            <button className="db-ic-btn" onClick={() => setEditMachine(m)}><Pencil size={15} /></button>
            <button className="db-ic-btn danger" onClick={() => setConfirm({ kind: "machine", item: m })}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {/* contas */}
      <div className="db-cfg-block">
        <div className="db-cfg-head">
          <span className="db-cfg-title"><Landmark size={16} /> Contas bancárias</span>
          <button className="db-btn gold sm" onClick={() => setEditAccount({})}><Plus size={15} /> Nova</button>
        </div>
        {accounts.length === 0 && <p className="db-cat-empty">Nenhuma conta cadastrada.</p>}
        {accounts.map((a) => (
          <div key={a.id} className="db-item">
            <div className="db-item-main">
              <span className="db-item-name">{a.label || a.bank}</span>
              <span className="db-item-meta">
                {[a.bank, a.agency && `ag. ${a.agency}`, a.account && `c/c ${a.account}`].filter(Boolean).join(" · ")}
              </span>
            </div>
            <button className="db-ic-btn" onClick={() => setEditAccount(a)}><Pencil size={15} /></button>
            <button className="db-ic-btn danger" onClick={() => setConfirm({ kind: "account", item: a })}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      <p className="db-cfg-user">Conectado como {user?.email}</p>

      {editMachine && <MachineModal init={editMachine} onSave={saveMachine} onClose={() => setEditMachine(null)} />}
      {editAccount && <AccountModal init={editAccount} onSave={saveAccount} onClose={() => setEditAccount(null)} />}
      {confirm && (
        <ConfirmModal title="Remover" danger confirmLabel="Remover"
          msg={`Remover "${confirm.item.name || confirm.item.label}"?`}
          onConfirm={doDelete} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}

function MachineModal({ init, onSave, onClose }) {
  const [f, setF] = useState({ id: init.id || null, name: init.name || "", note: init.note || "" });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal title={f.id ? "Editar máquina" : "Nova máquina"} onClose={onClose}>
      <label className="db-field">
        <span>Nome / identificação</span>
        <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Máquina 1 — Stone" autoFocus />
      </label>
      <label className="db-field">
        <span>Observação (opcional)</span>
        <input value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Ex: maquininha do balcão" />
      </label>
      <div className="db-modal-actions">
        <button className="db-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="db-btn gold" onClick={() => f.name.trim() && onSave(f)} disabled={!f.name.trim()}>Salvar</button>
      </div>
    </Modal>
  );
}

function AccountModal({ init, onSave, onClose }) {
  const [f, setF] = useState({
    id: init.id || null, label: init.label || "", bank: init.bank || "",
    agency: init.agency || "", account: init.account || "", holder: init.holder || "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal title={f.id ? "Editar conta" : "Nova conta"} onClose={onClose}>
      <label className="db-field">
        <span>Apelido da conta</span>
        <input value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="Ex: Conta PJ — Nubank" autoFocus />
      </label>
      <div className="db-field-row">
        <label className="db-field"><span>Banco</span>
          <input value={f.bank} onChange={(e) => set("bank", e.target.value)} placeholder="Nubank" /></label>
        <label className="db-field"><span>Agência</span>
          <input value={f.agency} onChange={(e) => set("agency", e.target.value)} placeholder="0001" /></label>
      </div>
      <div className="db-field-row">
        <label className="db-field"><span>Conta</span>
          <input value={f.account} onChange={(e) => set("account", e.target.value)} placeholder="12345-6" /></label>
        <label className="db-field"><span>Titular</span>
          <input value={f.holder} onChange={(e) => set("holder", e.target.value)} placeholder="Nome" /></label>
      </div>
      <div className="db-modal-actions">
        <button className="db-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="db-btn gold" onClick={() => f.label.trim() && onSave(f)} disabled={!f.label.trim()}>Salvar</button>
      </div>
    </Modal>
  );
}
