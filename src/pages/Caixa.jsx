import { useState } from "react";
import { Wallet, Unlock, Lock, Clock, TrendingUp, Ticket, HandCoins, Trash2, X, Copy, Check } from "lucide-react";
import { useData } from "../context/DataContext";
import { useToast } from "../components/Toast";
import { Modal, ConfirmModal } from "../components/Modal";
import { PAYS, payLabel, EXPENSE_CATS, expenseLabel } from "../lib/constants";
import { brl, num, timeStr, dateStr, dateTimeStr } from "../lib/format";
import logo from "../assets/logo.png";

const dayCashIn = (d) => d.cashIn ?? d.salesTotal ?? 0; // salesTotal: compat. dias antigos

export default function Caixa() {
  const { register, sales, days, summary, sessionWithdrawals, addWithdrawal, deleteWithdrawal, openRegister, closeRegister, voidSale } = useData();
  const flash = useToast();
  const [openingCash, setOpeningCash] = useState("");
  const [report, setReport] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [withdraw, setWithdraw] = useState(false);

  const openDay = async () => { await openRegister(openingCash); setOpeningCash(""); flash("Caixa aberto"); };
  const closeDay = async () => {
    const localDay = { closedAt: new Date(), openedAt: register.openedAt, openingCash: register.openingCash || 0, ...summary };
    await closeRegister();
    setConfirmClose(false);
    setReport(localDay);
    flash("Dia fechado");
  };
  const doVoid = async () => { await voidSale(voidTarget); setVoidTarget(null); flash("Lançamento estornado", "warn"); };
  const doWithdraw = async (w) => {
    try { await addWithdrawal(w); setWithdraw(false); flash("Retirada registrada", "warn"); }
    catch (e) { flash("Erro ao registrar retirada", "warn"); }
  };

  if (!register.open) {
    return (
      <div>
        <div className="db-openwrap">
          <div className="db-openhead"><Wallet size={22} /><h2>Abrir o dia</h2></div>
          <p className="db-open-sub">Quanto vai ficar na gaveta como troco inicial?</p>
          <label className="db-field big">
            <span>Fundo de caixa (R$)</span>
            <input type="number" inputMode="decimal" min="0" step="10" value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)} placeholder="0,00" autoFocus />
          </label>
          <button className="db-btn gold block" onClick={openDay}><Unlock size={16} /> Abrir caixa</button>
        </div>

        {days.length > 0 && (
          <div className="db-history">
            <h3>Dias anteriores</h3>
            {days.map((d) => (
              <button key={d.id} className="db-hist-row" onClick={() => setReport(d)}>
                <div>
                  <span className="db-hist-date">{dateStr(d.closedAt)}</span>
                  <span className="db-hist-sub">{d.salesCount} lançamentos · {timeStr(d.closedAt)}</span>
                </div>
                <span className="db-hist-total">{brl(dayCashIn(d))}</span>
              </button>
            ))}
          </div>
        )}

        {report && <ReportModal day={report} onClose={() => setReport(null)} flash={flash} />}
      </div>
    );
  }

  const ordered = [...sales].sort((a, b) => (b.paidAt?.seconds || 0) - (a.paidAt?.seconds || 0));
  const saleLabel = (s) =>
    s.origin === "comanda" ? (s.customer + (s.partial ? " · parcial" : ""))
      : s.origin === "troca" ? "Troca de ficha"
      : (s.items || []).length && (s.items || []).every((i) => i.kind === "ficha") ? "Venda de ficha"
      : "Avulso";

  return (
    <div>
      <div className="db-livehead">
        <span className="db-live-label"><Clock size={13} /> Aberto às {timeStr(register.openedAt)}</span>
        <h2>Resumo do dia</h2>
      </div>

      <div className="db-bignum">
        <span>Entrou em caixa hoje</span>
        <strong>{brl(summary.cashIn)}</strong>
        <em>{summary.salesCount} {summary.salesCount === 1 ? "lançamento" : "lançamentos"}</em>
      </div>

      <div className="db-paygrid">
        {PAYS.map((p) => {
          const I = p.icon;
          return (
            <div key={p.key} className="db-paycard">
              <I size={15} /><span>{p.label}</span>
              <strong>{brl(summary.byMethod[p.key])}</strong>
            </div>
          );
        })}
      </div>

      {(summary.fichaSold > 0 || summary.fichaOut > 0) && (
        <div className="db-ficha-summary">
          <div className="db-ficha-cell">
            <span><Ticket size={13} /> Fichas vendidas</span>
            <strong>{brl(summary.fichaSold)}</strong>
            <em>entrou dinheiro, mercadoria não saiu</em>
          </div>
          <div className="db-ficha-cell">
            <span><Ticket size={13} /> Trocado por ficha</span>
            <strong>{brl(summary.fichaOut)}</strong>
            <em>saiu do estoque, sem dinheiro novo</em>
          </div>
        </div>
      )}

      <div className="db-drawer">
        <div className="db-drawer-row"><span>Fundo de caixa</span><span>{brl(register.openingCash)}</span></div>
        <div className="db-drawer-row"><span>+ Vendas em dinheiro</span><span>{brl(summary.byMethod.dinheiro)}</span></div>
        {summary.withdrawalsTotal > 0 && (
          <div className="db-drawer-row"><span>− Retiradas (sangria)</span><span>{brl(summary.withdrawalsTotal)}</span></div>
        )}
        <div className="db-drawer-row total"><span>Esperado na gaveta</span><strong>{brl(summary.expectedCash)}</strong></div>
        {summary.profit > 0 && (
          <div className="db-drawer-row profit"><span><TrendingUp size={13} /> Resultado estimado</span><span>{brl(summary.profit)}</span></div>
        )}
      </div>

      <div className="db-sales">
        <h3>Lançamentos de hoje</h3>
        {ordered.length === 0 && <p className="db-cat-empty">Nenhum lançamento ainda.</p>}
        {ordered.map((s) => (
          <div key={s.id} className="db-sale-row">
            <div className="db-sale-info">
              <span className="db-sale-top">
                {timeStr(s.paidAt)} · {saleLabel(s)}{(s.payments || []).length ? " · " + s.payments.map((p) => payLabel(p.method)).join("+") : ""}
              </span>
              <span className="db-sale-items">{(s.items || []).length ? (s.items || []).map((i) => `${i.qty}× ${i.name}${i.kind === "ficha" ? " (ficha)" : ""}`).join(", ") : s.partial ? "Pagamento parcial da comanda" : ""}</span>
            </div>
            <span className="db-sale-total">{brl(s.total)}</span>
            <button className="db-ic-btn danger" onClick={() => setVoidTarget(s)} title="Estornar"><X size={15} /></button>
          </div>
        ))}
      </div>

      {sessionWithdrawals.length > 0 && (
        <div className="db-sales">
          <h3>Retiradas de hoje</h3>
          {[...sessionWithdrawals].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((w) => (
            <div key={w.id} className="db-sale-row">
              <div className="db-sale-info">
                <span className="db-sale-top">{timeStr(w.createdAt)} · {w.reason || "Retirada"}{w.isExpense ? ` · ${expenseLabel(w.category)} (Balanço)` : ""}</span>
              </div>
              <span className="db-sale-total neg">− {brl(w.amount)}</span>
              <button className="db-ic-btn danger" onClick={() => deleteWithdrawal(w.id)} title="Excluir retirada"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <button className="db-btn ghost block" onClick={() => setWithdraw(true)} style={{ marginBottom: 10 }}><HandCoins size={16} /> Registrar retirada (sangria)</button>
      <button className="db-btn close block" onClick={() => setConfirmClose(true)}><Lock size={16} /> Fechar o dia</button>
      {withdraw && <WithdrawModal onConfirm={doWithdraw} onClose={() => setWithdraw(false)} />}

      {confirmClose && (
        <ConfirmModal title="Fechar o dia" confirmLabel="Fechar dia"
          msg={`Entrou em caixa: ${brl(summary.cashIn)}. Esperado na gaveta: ${brl(summary.expectedCash)}. Fechar o caixa agora?`}
          onConfirm={closeDay} onClose={() => setConfirmClose(false)} />
      )}
      {voidTarget && (
        <ConfirmModal title="Estornar lançamento" danger confirmLabel="Estornar"
          msg={`Estornar o lançamento de ${brl(voidTarget.total)}? Os itens de consumo voltam ao estoque.`}
          onConfirm={doVoid} onClose={() => setVoidTarget(null)} />
      )}
      {report && <ReportModal day={report} onClose={() => setReport(null)} flash={flash} />}
    </div>
  );
}

function ReportModal({ day, onClose, flash }) {
  const machineRows = Object.entries(day.byMachine || {});
  const accountRows = Object.entries(day.byAccount || {});
  const cashIn = day.cashIn ?? day.salesTotal ?? 0;
  const fichaSold = day.fichaSold || 0;
  const fichaOut = day.fichaOut || 0;
  const withdrawalsTotal = day.withdrawalsTotal || 0;

  const copy = () => {
    const L = [
      "DIAS BAR — Fechamento do dia",
      dateTimeStr(day.closedAt),
      "-----------------------------",
      `Fundo de caixa: ${brl(day.openingCash)}`,
      `Entrou em caixa: ${brl(cashIn)} (${day.salesCount})`,
      `  Dinheiro: ${brl(day.byMethod.dinheiro)}`,
      `  Pix: ${brl(day.byMethod.pix)}`,
      `  Cartão: ${brl(day.byMethod.cartao)}`,
      ...machineRows.map(([n, v]) => `    ${n}: ${brl(v)}`),
      ...accountRows.map(([n, v]) => `    Pix ${n}: ${brl(v)}`),
      withdrawalsTotal > 0 ? `Retiradas (sangria): ${brl(withdrawalsTotal)}` : null,
      (fichaSold > 0 || fichaOut > 0) ? "Fichas:" : null,
      fichaSold > 0 ? `  Vendidas (entrou): ${brl(fichaSold)}` : null,
      fichaOut > 0 ? `  Trocadas (saiu do estoque): ${brl(fichaOut)}` : null,
      `Esperado na gaveta: ${brl(day.expectedCash)}`,
      day.profit > 0 ? `Resultado estimado: ${brl(day.profit)}` : null,
      `Mais vendido: ${day.topProduct}`,
    ].filter(Boolean).join("\n");
    try { navigator.clipboard.writeText(L); flash("Resumo copiado"); }
    catch (e) { flash("Não foi possível copiar", "warn"); }
  };

  return (
    <Modal title={null} onClose={onClose} wide>
      <div className="db-receipt">
        <img src={logo} alt="Dias Bar" className="db-receipt-logo" />
        <div className="db-receipt-h">Fechamento do dia</div>
        <div className="db-receipt-date">{dateTimeStr(day.closedAt)}</div>
        <div className="db-receipt-rule" />

        <RRow label="Fundo de caixa" val={brl(day.openingCash)} />
        <RRow label="Entrou em caixa" val={brl(cashIn)} strong />
        <div className="db-receipt-sub">
          <RRow label="Dinheiro" val={brl(day.byMethod.dinheiro)} small />
          <RRow label="Pix" val={brl(day.byMethod.pix)} small />
          <RRow label="Cartão" val={brl(day.byMethod.cartao)} small />
        </div>

        {machineRows.length > 0 && (
          <div className="db-receipt-block">
            <div className="db-receipt-blocktitle">Por máquina</div>
            {machineRows.map(([n, v]) => <RRow key={n} label={n} val={brl(v)} small />)}
          </div>
        )}
        {accountRows.length > 0 && (
          <div className="db-receipt-block">
            <div className="db-receipt-blocktitle">Pix por conta</div>
            {accountRows.map(([n, v]) => <RRow key={n} label={n} val={brl(v)} small />)}
          </div>
        )}
        {(fichaSold > 0 || fichaOut > 0) && (
          <div className="db-receipt-block">
            <div className="db-receipt-blocktitle">Fichas</div>
            {fichaSold > 0 && <RRow label="Vendidas (entrou)" val={brl(fichaSold)} small />}
            {fichaOut > 0 && <RRow label="Trocadas (saiu do estoque)" val={brl(fichaOut)} small />}
          </div>
        )}

        {withdrawalsTotal > 0 && <RRow label="Retiradas (sangria)" val={`− ${brl(withdrawalsTotal)}`} small />}
        <div className="db-receipt-rule" />
        <RRow label="Esperado na gaveta" val={brl(day.expectedCash)} big />
        {day.profit > 0 && <RRow label="Resultado estimado" val={brl(day.profit)} accent />}
        <div className="db-receipt-rule dot" />
        <RRow label="Nº de lançamentos" val={String(day.salesCount)} small />
        <RRow label="Mais vendido" val={day.topProduct} small />
      </div>
      <div className="db-modal-actions">
        <button className="db-btn ghost" onClick={copy}><Copy size={15} /> Copiar resumo</button>
        <button className="db-btn gold" onClick={onClose}><Check size={16} /> Concluir</button>
      </div>
    </Modal>
  );
}

function WithdrawModal({ onConfirm, onClose }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [category, setCategory] = useState("cache");
  const valid = num(amount) > 0;
  return (
    <Modal title="Registrar retirada" onClose={onClose}>
      <p className="db-mode-hint">Tira dinheiro da gaveta (ex: pagar o cachê do show). Isso baixa o "esperado na gaveta". Se for um gasto do bar, deixe marcado para entrar no Balanço como despesa.</p>
      <div className="db-field-row">
        <label className="db-field"><span>Valor (R$)</span>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" autoFocus /></label>
        <label className="db-field"><span>Motivo</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: cachê do show" /></label>
      </div>
      <label className="db-check">
        <input type="checkbox" checked={isExpense} onChange={(e) => setIsExpense(e.target.checked)} />
        <span>Entra no Balanço como despesa</span>
      </label>
      {isExpense && (
        <label className="db-field"><span>Tipo de despesa</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATS.map((cc) => <option key={cc.key} value={cc.key}>{cc.label}</option>)}
          </select>
        </label>
      )}
      <div className="db-modal-actions">
        <button className="db-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="db-btn gold" disabled={!valid} onClick={() => valid && onConfirm({ amount, reason, isExpense, category })}>Registrar</button>
      </div>
    </Modal>
  );
}

function RRow({ label, val, strong, big, small, accent }) {
  const cls = ["db-rrow"];
  if (big) cls.push("big");
  if (small) cls.push("small");
  if (accent) cls.push("accent");
  return (
    <div className={cls.join(" ")}>
      <span>{label}</span>
      {strong || big ? <strong>{val}</strong> : <span className="v">{val}</span>}
    </div>
  );
}