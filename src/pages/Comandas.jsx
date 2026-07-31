import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, X, Lock, ClipboardList, UserPlus, ChevronLeft, Ticket } from "lucide-react";
import { useData } from "../context/DataContext";
import { useToast } from "../components/Toast";
import { Modal, ConfirmModal } from "../components/Modal";
import ProductPicker from "../components/ProductPicker";
import PaymentModal from "../components/PaymentModal";
import { brl, timeStr } from "../lib/format";

export default function Comandas() {
  const { tabs, products, register, machines, accounts, openTab, addItemToTab, removeItemFromTab, closeTab, cancelTab } = useData();
  const flash = useToast();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [addKind, setAddKind] = useState(null); // "consumo" | "ficha" | null
  const [paying, setPaying] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const tab = useMemo(() => tabs.find((t) => t.id === selectedId) || null, [tabs, selectedId]);
  const ordered = useMemo(() => [...tabs].sort((a, b) => (a.customer || "").localeCompare(b.customer || "")), [tabs]);

  if (!register.open) {
    return (
      <div className="db-empty">
        <Lock size={30} className="db-empty-ic" />
        <h2>O caixa está fechado</h2>
        <p>Abra o dia no caixa para começar a lançar comandas dos clientes.</p>
        <button className="db-btn gold" onClick={() => navigate("/caixa")}>Abrir o caixa</button>
      </div>
    );
  }

  const create = async () => {
    if (!customer.trim()) return;
    await openTab(customer);
    setCustomer("");
    setNewOpen(false);
    flash("Comanda aberta");
  };
  const pay = async (payments) => {
    await closeTab(tab, payments);
    setPaying(false);
    setSelectedId(null);
    flash(`Comanda de ${tab.customer} fechada`);
  };
  const doCancel = async () => {
    await cancelTab(tab);
    setConfirmCancel(false);
    setSelectedId(null);
    flash("Comanda cancelada", "warn");
  };

  if (tab) {
    const consumo = (tab.items || []).filter((i) => (i.kind || "consumo") === "consumo");
    const fichas = (tab.items || []).filter((i) => i.kind === "ficha");
    const badges = Object.fromEntries((addKind === "ficha" ? fichas : consumo).map((i) => [i.productId, i.qty]));
    return (
      <div>
        <button className="db-back" onClick={() => setSelectedId(null)}><ChevronLeft size={18} /> Comandas</button>
        <div className="db-tabhead">
          <div>
            <span className="db-tabhead-label">Comanda · aberta {timeStr(tab.createdAt)}</span>
            <h2>{tab.customer}</h2>
          </div>
          <strong className="db-tabhead-total">{brl(tab.total)}</strong>
        </div>

        <div className="db-tabitems">
          {(tab.items || []).length === 0 && <p className="db-cat-empty">Nenhum item lançado ainda.</p>}
          {consumo.map((it) => {
            const prod = products.find((p) => p.id === it.productId);
            const noStock = !prod || prod.stock <= 0;
            return (
              <div key={"c" + it.productId} className="db-cart-row">
                <div className="db-cart-info">
                  <span className="db-cart-name">{it.name}</span>
                  <span className="db-cart-sub">{brl(it.price)} · {brl(it.price * it.qty)}</span>
                </div>
                <div className="db-stepper">
                  <button onClick={() => removeItemFromTab(tab, it.productId, "consumo")}><Minus size={15} /></button>
                  <span>{it.qty}</span>
                  <button onClick={() => prod && addItemToTab(tab, prod, "consumo")} disabled={noStock}><Plus size={15} /></button>
                </div>
              </div>
            );
          })}
          {fichas.map((it) => {
            const prod = products.find((p) => p.id === it.productId);
            return (
              <div key={"f" + it.productId} className="db-cart-row">
                <div className="db-cart-info">
                  <span className="db-cart-name">{it.name} <b className="db-vtag">· ficha</b></span>
                  <span className="db-cart-sub">{brl(it.price)} · {brl(it.price * it.qty)}</span>
                </div>
                <div className="db-stepper">
                  <button onClick={() => removeItemFromTab(tab, it.productId, "ficha")}><Minus size={15} /></button>
                  <span>{it.qty}</span>
                  <button onClick={() => prod && addItemToTab(tab, prod, "ficha")}><Plus size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="db-tab-actions three">
          <button className="db-btn ghost" onClick={() => setAddKind("consumo")}><Plus size={16} /> Itens</button>
          <button className="db-btn ghost" onClick={() => setAddKind("ficha")}><Ticket size={16} /> Ficha</button>
          <button className="db-btn gold" disabled={(tab.total || 0) <= 0} onClick={() => setPaying(true)}>Fechar</button>
        </div>
        <button className="db-linkbtn danger center" onClick={() => setConfirmCancel(true)}>Cancelar comanda</button>

        {addKind && (
          <div className="db-sheet-wrap" onClick={() => setAddKind(null)}>
            <div className="db-sheet tall" onClick={(e) => e.stopPropagation()}>
              <div className="db-sheet-head">
                <h3>{addKind === "ficha" ? "Vender ficha em " : "Lançar em "}{tab.customer}</h3>
                <button className="db-x" onClick={() => setAddKind(null)}><X size={18} /></button>
              </div>
              {addKind === "ficha" && <p className="db-mode-hint">A ficha entra na conta do cliente sem baixar o estoque. A mercadoria sai quando ele retirar.</p>}
              <ProductPicker
                products={products}
                badges={badges}
                allowOut={addKind === "ficha"}
                onPick={(p) => addItemToTab(tab, p, addKind)}
              />
            </div>
          </div>
        )}

        {paying && (
          <PaymentModal
            total={tab.total || 0} machines={machines} accounts={accounts}
            title={`Fechar conta · ${tab.customer}`}
            onConfirm={pay} onClose={() => setPaying(false)}
          />
        )}
        {confirmCancel && (
          <ConfirmModal
            title="Cancelar comanda" danger confirmLabel="Cancelar comanda"
            msg={`Cancelar a comanda de ${tab.customer}? Os itens de consumo voltam ao estoque e nada é cobrado.`}
            onConfirm={doCancel} onClose={() => setConfirmCancel(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="db-section-head">
        <h2>Comandas abertas</h2>
        <button className="db-btn gold sm" onClick={() => setNewOpen(true)}><UserPlus size={16} /> Nova</button>
      </div>

      {ordered.length === 0 ? (
        <div className="db-empty sm">
          <ClipboardList size={26} className="db-empty-ic" />
          <p>Nenhuma comanda aberta. Toque em “Nova” para começar a anotar o consumo de um cliente.</p>
        </div>
      ) : (
        <div className="db-tabgrid">
          {ordered.map((t) => (
            <button key={t.id} className="db-tabcard" onClick={() => setSelectedId(t.id)}>
              <span className="db-tabcard-name">{t.customer}</span>
              <span className="db-tabcard-meta">{(t.items || []).reduce((a, i) => a + i.qty, 0)} itens</span>
              <strong className="db-tabcard-total">{brl(t.total)}</strong>
            </button>
          ))}
        </div>
      )}

      {newOpen && (
        <Modal title="Nova comanda" onClose={() => setNewOpen(false)}>
          <label className="db-field">
            <span>Nome do cliente ou mesa</span>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()} placeholder="Ex: Mesa 3, João" autoFocus />
          </label>
          <div className="db-modal-actions">
            <button className="db-btn ghost" onClick={() => setNewOpen(false)}>Cancelar</button>
            <button className="db-btn gold" onClick={create} disabled={!customer.trim()}>Abrir comanda</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
