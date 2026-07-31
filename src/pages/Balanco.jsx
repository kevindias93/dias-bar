import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Plus, Pencil, Trash2 } from "lucide-react";
import { useData } from "../context/DataContext";
import { useToast } from "../components/Toast";
import { Modal, ConfirmModal } from "../components/Modal";
import { EXPENSE_CATS, expenseLabel } from "../lib/constants";
import { brl, num, dateStr, monthKey, monthKeyISO, monthLabel, todayISO } from "../lib/format";

const dayCashIn = (d) => d.cashIn ?? d.salesTotal ?? 0;

export default function Balanco() {
  const { days, expenses, withdrawals, addExpense, updateExpense, deleteExpense, deleteWithdrawal } = useData();
  const flash = useToast();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const monthDays = useMemo(
    () => days.filter((d) => monthKey(d.closedAt) === month).sort((a, b) => (b.closedAt?.seconds || 0) - (a.closedAt?.seconds || 0)),
    [days, month]
  );
  const monthExp = useMemo(
    () => expenses.filter((e) => monthKeyISO(e.date) === month).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [expenses, month]
  );
  // Sangrias marcadas como despesa também entram no Balanço.
  const monthWd = useMemo(
    () => withdrawals.filter((w) => w.isExpense && monthKey(w.createdAt) === month)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)),
    [withdrawals, month]
  );
  const vendas = monthDays.reduce((a, d) => a + dayCashIn(d), 0);
  const despesas = monthExp.reduce((a, e) => a + (e.amount || 0), 0) + monthWd.reduce((a, w) => a + (w.amount || 0), 0);
  const resultado = vendas - despesas;
  const byCat = EXPENSE_CATS
    .map((c) => ({
      ...c,
      val: monthExp.filter((e) => e.category === c.key).reduce((a, e) => a + e.amount, 0)
        + monthWd.filter((w) => w.category === c.key).reduce((a, w) => a + w.amount, 0),
    }))
    .filter((c) => c.val > 0);

  const shift = (delta) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(monthKey(new Date(y, m - 1 + delta, 1)));
  };

  const saveExp = async (e) => {
    const payload = { category: e.category, label: (e.label || "").trim(), amount: num(e.amount), date: e.date || todayISO() };
    try {
      if (e.id) { await updateExpense(e.id, payload); flash("Despesa atualizada"); }
      else { await addExpense(payload); flash("Despesa lançada"); }
      setEditing(null);
    } catch (err) { flash("Erro ao salvar despesa", "warn"); }
  };
  const removeExp = async () => {
    try { await deleteExpense(confirm.id); flash("Despesa removida", "warn"); }
    catch (e) { flash("Erro ao remover", "warn"); }
    setConfirm(null);
  };

  return (
    <div>
      <div className="db-section-head"><h2>Balanço</h2></div>

      <div className="db-monthnav">
        <button onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
        <span>{monthLabel(month)}</span>
        <button onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight size={18} /></button>
      </div>

      <div className="db-balance">
        <div className="db-bal-row"><span><TrendingUp size={15} /> Vendas do mês</span><strong className="pos">{brl(vendas)}</strong></div>
        <div className="db-bal-row"><span><TrendingDown size={15} /> Despesas do mês</span><strong className="neg">− {brl(despesas)}</strong></div>
        <div className={"db-bal-result " + (resultado >= 0 ? "pos" : "neg")}>
          <span>Resultado</span><strong>{brl(resultado)}</strong>
        </div>
      </div>
      <p className="db-mode-hint">
        As vendas somam só o que <b>entrou</b> em cada dia fechado (dinheiro, pix e cartão, incluindo fichas vendidas).
        O fundo de caixa e as trocas por ficha não entram nessa conta.
      </p>

      <div className="db-section-head sub">
        <h3>Despesas</h3>
        <button className="db-btn gold sm" onClick={() => setEditing({ category: "aluguel", date: todayISO() })}><Plus size={15} /> Lançar</button>
      </div>
      {byCat.length > 0 && (
        <div className="db-catsum">
          {byCat.map((c) => <div key={c.key} className="db-catsum-cell"><span>{c.label}</span><strong>{brl(c.val)}</strong></div>)}
        </div>
      )}
      {monthExp.length === 0 && monthWd.length === 0 ? (
        <p className="db-cat-empty">Nenhuma despesa lançada neste mês.</p>
      ) : (
        <div className="db-explist">
          {monthExp.map((e) => (
            <div key={e.id} className="db-item">
              <div className="db-item-main">
                <span className="db-item-name">{expenseLabel(e.category)}{e.label ? ` · ${e.label}` : ""}</span>
                <span className="db-item-meta">{dateStr(e.date + "T12:00:00")}</span>
              </div>
              <div className="db-exp-val">{brl(e.amount)}</div>
              <button className="db-ic-btn" onClick={() => setEditing(e)}><Pencil size={15} /></button>
              <button className="db-ic-btn danger" onClick={() => setConfirm(e)}><Trash2 size={15} /></button>
            </div>
          ))}
          {monthWd.map((w) => (
            <div key={w.id} className="db-item">
              <div className="db-item-main">
                <span className="db-item-name">{expenseLabel(w.category)}{w.reason ? ` · ${w.reason}` : ""} <b className="db-vtag">· sangria</b></span>
                <span className="db-item-meta">{dateStr(w.createdAt)}</span>
              </div>
              <div className="db-exp-val">{brl(w.amount)}</div>
              <button className="db-ic-btn danger" onClick={() => deleteWithdrawal(w.id)} title="Excluir retirada"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="db-section-head sub"><h3>Dias fechados no mês</h3></div>
      {monthDays.length === 0 ? (
        <p className="db-cat-empty">Nenhum dia fechado neste mês ainda.</p>
      ) : (
        <div className="db-explist">
          {monthDays.map((d) => (
            <div key={d.id} className="db-hist-row static">
              <div>
                <span className="db-hist-date">{dateStr(d.closedAt)}</span>
                <span className="db-hist-sub">{d.salesCount} lançamentos</span>
              </div>
              <span className="db-hist-total">{brl(dayCashIn(d))}</span>
            </div>
          ))}
        </div>
      )}

      {editing && <ExpenseModal init={editing} onSave={saveExp} onClose={() => setEditing(null)} />}
      {confirm && (
        <ConfirmModal title="Remover despesa" danger confirmLabel="Remover"
          msg={`Remover a despesa de ${expenseLabel(confirm.category)} (${brl(confirm.amount)})?`}
          onConfirm={removeExp} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}

function ExpenseModal({ init, onSave, onClose }) {
  const [f, setF] = useState({
    id: init.id || null,
    category: init.category || "aluguel",
    label: init.label || "",
    amount: init.amount ?? "",
    date: init.date || todayISO(),
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const valid = f.amount !== "" && num(f.amount) > 0;
  return (
    <Modal title={f.id ? "Editar despesa" : "Lançar despesa"} onClose={onClose}>
      <label className="db-field">
        <span>Tipo</span>
        <select value={f.category} onChange={(e) => set("category", e.target.value)}>
          {EXPENSE_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>
      <label className="db-field">
        <span>Descrição (opcional)</span>
        <input value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="Ex: conta de julho" />
      </label>
      <div className="db-field-row">
        <label className="db-field">
          <span>Valor (R$)</span>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={f.amount}
            onChange={(e) => set("amount", e.target.value)} placeholder="0,00" autoFocus />
        </label>
        <label className="db-field">
          <span>Data</span>
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </label>
      </div>
      <div className="db-modal-actions">
        <button className="db-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="db-btn gold" onClick={() => valid && onSave(f)} disabled={!valid}>Salvar</button>
      </div>
    </Modal>
  );
}