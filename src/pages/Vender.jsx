import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Ticket, ArrowLeftRight, Minus, Plus, X, Lock, Coins } from "lucide-react";
import { useData } from "../context/DataContext";
import { useToast } from "../components/Toast";
import ProductPicker from "../components/ProductPicker";
import PaymentModal from "../components/PaymentModal";
import ManualEntryModal from "../components/ManualEntryModal";
import { brl } from "../lib/format";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "m" + Date.now() + Math.random().toString(16).slice(2);

const MODES = [
  { key: "venda", label: "Venda", icon: ShoppingCart },
  { key: "ficha", label: "Vender ficha", icon: Ticket },
  { key: "troca", label: "Trocar ficha", icon: ArrowLeftRight },
];

export default function Vender() {
  const { products, register, machines, accounts, createSale, lineFrom } = useData();
  const flash = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState("venda");
  const [cart, setCart] = useState({});
  const [manuals, setManuals] = useState([]); // lançamentos de valor manual (só na venda)
  const [sheet, setSheet] = useState(false);
  const [paying, setPaying] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const isFicha = mode === "ficha"; // vende ficha (não baixa estoque, entra dinheiro)
  const isTroca = mode === "troca"; // troca ficha por mercadoria (baixa estoque, sem dinheiro)

  const items = useMemo(
    () => Object.entries(cart)
      .map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty }))
      .filter((x) => x.p && x.qty > 0),
    [cart, products]
  );
  const manualTotal = manuals.reduce((s, m) => s + m.price * m.qty, 0);
  const manualCount = manuals.reduce((s, m) => s + m.qty, 0);
  const total = items.reduce((s, { p, qty }) => s + p.price * qty, 0) + manualTotal;
  const count = items.reduce((s, { qty }) => s + qty, 0) + manualCount;

  if (!register.open) {
    return (
      <div className="db-empty">
        <Lock size={30} className="db-empty-ic" />
        <h2>O caixa está fechado</h2>
        <p>Abra o dia informando o troco inicial para começar a registrar vendas.</p>
        <button className="db-btn gold" onClick={() => navigate("/caixa")}>Abrir o caixa</button>
      </div>
    );
  }

  const clearMode = (m) => { setMode(m); setCart({}); setManuals([]); setSheet(false); };
  const pick = (p) => {
    const cur = cart[p.id] || 0;
    if (!isFicha && cur >= p.stock) { flash("Sem estoque suficiente", "warn"); return; }
    setCart({ ...cart, [p.id]: cur + 1 });
  };
  const setQty = (id, qty) => {
    const p = products.find((x) => x.id === id);
    const cap = isFicha ? 9999 : (p ? p.stock : 0);
    const q = Math.max(0, Math.min(qty, cap));
    const next = { ...cart };
    if (q === 0) delete next[id]; else next[id] = q;
    setCart(next);
  };

  const addManual = ({ name, price }) => {
    setManuals([...manuals, { id: uid(), name, price, qty: 1 }]);
    setManualOpen(false);
  };
  const setManualQty = (id, qty) =>
    setManuals(qty <= 0 ? manuals.filter((m) => m.id !== id) : manuals.map((m) => (m.id === id ? { ...m, qty } : m)));

  const linesOf = () => [
    ...items.map(({ p, qty }) => lineFrom(p, qty, isFicha ? "ficha" : "consumo")),
    ...manuals.map((m) => ({ productId: m.id, name: m.name, category: "diversos", price: m.price, cost: 0, qty: m.qty, kind: "manual" })),
  ];
  const reset = () => { setCart({}); setManuals([]); setSheet(false); setPaying(false); };

  // Troca: sem pagamento — baixa o estoque e não entra dinheiro.
  const confirmTroca = async () => {
    try {
      await createSale({ items: linesOf(), payments: [], origin: "troca" });
      reset();
      flash(`Troca registrada · ${count} ${count === 1 ? "item" : "itens"}`);
    } catch (e) { flash("Erro ao registrar troca", "warn"); }
  };

  // Venda / venda de ficha: recebe pagamento.
  const finish = async (payments) => {
    try {
      await createSale({ items: linesOf(), payments, origin: "avulso" });
      reset();
      flash(isFicha ? `${count} ficha(s) vendida(s) · ${brl(total)}` : `Venda de ${brl(total)} registrada`);
    } catch (e) { flash("Erro ao registrar", "warn"); }
  };

  const hint = isFicha
    ? 'Venda de fichas: entra o dinheiro agora e a mercadoria não sai do estoque. O cliente retira depois em "Trocar ficha".'
    : isTroca
    ? "Troca de ficha: o cliente entrega a ficha e leva a mercadoria. Baixa o estoque e não entra dinheiro (já foi pago quando a ficha foi comprada)."
    : "";

  return (
    <div>
      <div className="db-modeswitch three">
        {MODES.map((m) => {
          const I = m.icon;
          return (
            <button key={m.key} className={mode === m.key ? "on" : ""} onClick={() => clearMode(m.key)}>
              <I size={15} /> {m.label}
            </button>
          );
        })}
      </div>
      {hint && <p className="db-mode-hint">{hint}</p>}

      <ProductPicker products={products} onPick={pick} badges={cart} allowOut={isFicha} />

      {!isFicha && !isTroca && (
        <button className="db-btn ghost block db-manualbtn" onClick={() => setManualOpen(true)}>
          <Coins size={16} /> Lançar valor manual
        </button>
      )}

      {count > 0 && (
        <div className="db-cartbar" onClick={() => setSheet(true)}>
          <span className="db-cartbar-c">
            {isFicha ? <Ticket size={16} /> : isTroca ? <ArrowLeftRight size={16} /> : <ShoppingCart size={16} />}
            {" "}{count} {isFicha ? "ficha(s)" : count === 1 ? "item" : "itens"}
          </span>
          <span className="db-cartbar-t">{brl(total)}</span>
          <span className="db-cartbar-go">Revisar</span>
        </div>
      )}

      {sheet && (
        <div className="db-sheet-wrap" onClick={() => setSheet(false)}>
          <div className="db-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="db-sheet-head">
              <h3>{isFicha ? "Venda de fichas" : isTroca ? "Troca de ficha" : "Venda avulsa"}</h3>
              <button className="db-x" onClick={() => setSheet(false)}><X size={18} /></button>
            </div>
            <div className="db-sheet-body">
              {items.map(({ p, qty }) => (
                <div key={p.id} className="db-cart-row">
                  <div className="db-cart-info">
                    <span className="db-cart-name">{p.name}</span>
                    <span className="db-cart-sub">{brl(p.price)} · {brl(p.price * qty)}</span>
                  </div>
                  <div className="db-stepper">
                    <button onClick={() => setQty(p.id, qty - 1)}><Minus size={15} /></button>
                    <span>{qty}</span>
                    <button onClick={() => setQty(p.id, qty + 1)} disabled={!isFicha && qty >= p.stock}><Plus size={15} /></button>
                  </div>
                </div>
              ))}
              {manuals.map((m) => (
                <div key={m.id} className="db-cart-row">
                  <div className="db-cart-info">
                    <span className="db-cart-name">{m.name} <b className="db-vtag">· valor</b></span>
                    <span className="db-cart-sub">{brl(m.price)} · {brl(m.price * m.qty)}</span>
                  </div>
                  <div className="db-stepper">
                    <button onClick={() => setManualQty(m.id, m.qty - 1)}><Minus size={15} /></button>
                    <span>{m.qty}</span>
                    <button onClick={() => setManualQty(m.id, m.qty + 1)}><Plus size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="db-sheet-total"><span>Total</span><strong>{brl(total)}</strong></div>
            {isTroca ? (
              <button className="db-btn gold block" onClick={confirmTroca}>Confirmar troca</button>
            ) : (
              <button className="db-btn gold block" onClick={() => setPaying(true)}>{isFicha ? "Receber pela ficha" : "Receber pagamento"}</button>
            )}
          </div>
        </div>
      )}

      {paying && !isTroca && (
        <PaymentModal
          total={total} machines={machines} accounts={accounts}
          title={isFicha ? "Receber venda de fichas" : "Receber pagamento"}
          onConfirm={finish} onClose={() => setPaying(false)}
        />
      )}

      {manualOpen && (
        <ManualEntryModal onConfirm={addManual} onClose={() => setManualOpen(false)} />
      )}
    </div>
  );
}
