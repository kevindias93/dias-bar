import { useState } from "react";
import { Plus, Minus, Trash2, Pencil } from "lucide-react";
import { useData } from "../context/DataContext";
import { useToast } from "../components/Toast";
import { Modal, ConfirmModal } from "../components/Modal";
import { CATS, catLabel, LOW_STOCK } from "../lib/constants";
import { brl, num } from "../lib/format";

export default function Estoque() {
  const { products, addProduct, updateProduct, deleteProduct, adjustStock } = useData();
  const flash = useToast();
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const grouped = CATS.map((c) => ({ ...c, items: products.filter((p) => p.category === c.key) }));

  const save = async (data) => {
    if (data.id) { await updateProduct(data.id, strip(data)); flash("Produto atualizado"); }
    else { await addProduct(strip(data)); flash("Produto adicionado"); }
    setEditing(null);
  };
  const remove = async (p) => { await deleteProduct(p.id); setConfirm(null); flash("Produto removido", "warn"); };

  return (
    <div>
      <div className="db-section-head">
        <h2>Estoque</h2>
        <button className="db-btn gold sm" onClick={() => setEditing({ category: "cerveja" })}><Plus size={16} /> Novo</button>
      </div>

      {grouped.map((g) => (
        <div key={g.key} className="db-cat-block">
          <div className="db-cat-title"><g.icon size={16} /> {g.label} <span>{g.items.length}</span></div>
          {g.items.length === 0 && <p className="db-cat-empty">Nenhum item.</p>}
          {g.items.map((p) => (
            <div key={p.id} className="db-item">
              <div className="db-item-main">
                <span className="db-item-name">{p.name}</span>
                <span className="db-item-meta">{brl(p.price)}{p.cost > 0 && <em> · custo {brl(p.cost)}</em>}</span>
              </div>
              <div className={"db-item-stk " + (p.stock <= 0 ? "z" : p.stock <= LOW_STOCK ? "low" : "")}>{p.stock} un</div>
              <div className="db-stepper sm">
                <button onClick={() => p.stock > 0 && adjustStock(p.id, -1)}><Minus size={14} /></button>
                <button onClick={() => adjustStock(p.id, +1)}><Plus size={14} /></button>
              </div>
              <button className="db-ic-btn" onClick={() => setEditing(p)}><Pencil size={15} /></button>
              <button className="db-ic-btn danger" onClick={() => setConfirm(p)}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      ))}

      {editing && <ProductModal init={editing} onSave={save} onClose={() => setEditing(null)} />}
      {confirm && (
        <ConfirmModal title="Remover produto" danger confirmLabel="Remover"
          msg={`Remover "${confirm.name}" do estoque?`}
          onConfirm={() => remove(confirm)} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}

const strip = (d) => ({
  name: d.name.trim(),
  category: d.category,
  price: num(d.price),
  cost: num(d.cost),
  stock: Math.max(0, Math.floor(num(d.stock))),
});

function ProductModal({ init, onSave, onClose }) {
  const [f, setF] = useState({
    id: init.id || null,
    name: init.name || "",
    category: init.category || "cerveja",
    price: init.price ?? "",
    cost: init.cost ?? "",
    stock: init.stock ?? "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const valid = f.name.trim() && f.price !== "";

  return (
    <Modal title={f.id ? "Editar produto" : "Novo produto"} onClose={onClose}>
      <label className="db-field">
        <span>Nome</span>
        <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Skol Lata 350ml" autoFocus />
      </label>
      <label className="db-field">
        <span>Categoria</span>
        <select value={f.category} onChange={(e) => set("category", e.target.value)}>
          {CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>
      <div className="db-field-row">
        <label className="db-field">
          <span>Preço de venda (R$)</span>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="0,00" />
        </label>
        <label className="db-field">
          <span>Custo (opcional)</span>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0,00" />
        </label>
      </div>
      <label className="db-field">
        <span>Quantidade em estoque</span>
        <input type="number" inputMode="numeric" min="0" step="1" value={f.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" />
      </label>
      <div className="db-modal-actions">
        <button className="db-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="db-btn gold" onClick={() => valid && onSave(f)} disabled={!valid}>Salvar</button>
      </div>
    </Modal>
  );
}
