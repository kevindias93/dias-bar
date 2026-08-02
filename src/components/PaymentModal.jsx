import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { Modal } from "./Modal";
import { PAYS, payLabel } from "../lib/constants";
import { brl, num } from "../lib/format";

export default function PaymentModal({ total, machines, accounts, onConfirm, onClose, title = "Receber pagamento", allowPartial = false }) {
  const [mode, setMode] = useState("single");

  /* ---------- simples ---------- */
  const [method, setMethod] = useState("dinheiro");
  const [received, setReceived] = useState("");
  const [machineId, setMachineId] = useState(machines[0]?.id || "");
  const [cardType, setCardType] = useState("credito");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  // Com pagamento parcial: o campo "valor recebido" define quanto entra agora (vazio = total).
  const receivedNum = received === "" ? total : num(received);
  const singleAmount = allowPartial ? Math.min(receivedNum, total) : total;
  const singleLeft = allowPartial ? r2(total - singleAmount) : 0;
  const change = method === "dinheiro" && receivedNum > total ? r2(receivedNum - total) : 0;

  const confirmSingle = () => {
    const p = { method, amount: singleAmount };
    if (method === "cartao") {
      p.cardType = cardType;
      const m = machines.find((x) => x.id === machineId);
      if (m) { p.machineId = m.id; p.machineName = m.name; }
    }
    if (method === "pix") {
      const a = accounts.find((x) => x.id === accountId);
      if (a) { p.accountId = a.id; p.accountName = a.label || a.bank; }
    }
    onConfirm([p]);
  };

  /* ---------- dividido ---------- */
  const [lines, setLines] = useState([{ method: "dinheiro", amount: total, machineId: machines[0]?.id || "", cardType: "credito", accountId: accounts[0]?.id || "" }]);
  const applied = lines.reduce((a, l) => a + num(l.amount), 0);
  const remaining = Math.round((total - applied) * 100) / 100;
  const setLine = (i, patch) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines([...lines, { method: "dinheiro", amount: remaining > 0 ? remaining : 0, machineId: machines[0]?.id || "", cardType: "credito", accountId: accounts[0]?.id || "" }]);
  const delLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

  const confirmSplit = () => {
    const payments = lines
      .filter((l) => num(l.amount) > 0)
      .map((l) => {
        const p = { method: l.method, amount: num(l.amount) };
        if (l.method === "cartao") {
          p.cardType = l.cardType;
          const m = machines.find((x) => x.id === l.machineId);
          if (m) { p.machineId = m.id; p.machineName = m.name; }
        }
        if (l.method === "pix") {
          const a = accounts.find((x) => x.id === l.accountId);
          if (a) { p.accountId = a.id; p.accountName = a.label || a.bank; }
        }
        return p;
      });
    onConfirm(payments);
  };

  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="db-pay-total">
        <span>Total a receber</span>
        <strong>{brl(total)}</strong>
      </div>

      {mode === "single" ? (
        <>
          <div className="db-pay-methods">
            {PAYS.map((p) => {
              const I = p.icon;
              return (
                <button key={p.key} className={"db-paybtn " + (method === p.key ? "on" : "")} onClick={() => setMethod(p.key)}>
                  <I size={18} /> {p.label}
                </button>
              );
            })}
          </div>

          {(method === "dinheiro" || allowPartial) && (
            <label className="db-field">
              <span>{allowPartial ? "Valor pago agora (deixe vazio p/ tudo)" : "Valor recebido (opcional)"}</span>
              <input type="number" inputMode="decimal" min="0" step="0.5" value={received}
                onChange={(e) => setReceived(e.target.value)} placeholder={brl(total)} />
              {change > 0 && <em className="db-change">Troco: {brl(change)}</em>}
              {allowPartial && singleLeft > 0.009 && (
                <em className="db-partial-hint">Fica {brl(singleLeft)} na comanda para pagar depois</em>
              )}
            </label>
          )}

          {method === "cartao" && (
            <>
              <div className="db-cardtype">
                <button className={cardType === "credito" ? "on" : ""} onClick={() => setCardType("credito")}>Crédito</button>
                <button className={cardType === "debito" ? "on" : ""} onClick={() => setCardType("debito")}>Débito</button>
              </div>
              <label className="db-field">
                <span>Máquina</span>
                {machines.length ? (
                  <select value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                    {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                ) : <em className="db-hintline">Nenhuma máquina cadastrada — vá em Ajustes.</em>}
              </label>
            </>
          )}

          {method === "pix" && (
            <label className="db-field">
              <span>Conta que vai receber</span>
              {accounts.length ? (
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.label || a.bank}</option>)}
                </select>
              ) : <em className="db-hintline">Nenhuma conta cadastrada — vá em Ajustes.</em>}
            </label>
          )}

          <button className="db-linkbtn" onClick={() => setMode("split")}>Dividir pagamento</button>
          <div className="db-modal-actions">
            <button className="db-btn ghost" onClick={onClose}>Cancelar</button>
            <button className="db-btn gold" onClick={confirmSingle} disabled={allowPartial && singleAmount <= 0}>
              <Check size={16} /> {allowPartial && singleLeft > 0.009 ? "Receber parcial" : "Confirmar"}
            </button>
          </div>
        </>
      ) : (
        <>
          {lines.map((l, i) => (
            <div key={i} className="db-splitline">
              <div className="db-splitline-top">
                <select value={l.method} onChange={(e) => setLine(i, { method: e.target.value })}>
                  {PAYS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
                <input type="number" inputMode="decimal" min="0" step="0.5" value={l.amount}
                  onChange={(e) => setLine(i, { amount: e.target.value })} placeholder="0,00" />
                {lines.length > 1 && (
                  <button className="db-ic-btn danger" onClick={() => delLine(i)}><Trash2 size={14} /></button>
                )}
              </div>
              {l.method === "cartao" && (
                <div className="db-splitline-detail">
                  <select value={l.cardType} onChange={(e) => setLine(i, { cardType: e.target.value })}>
                    <option value="credito">Crédito</option>
                    <option value="debito">Débito</option>
                  </select>
                  {machines.length > 0 && (
                    <select value={l.machineId} onChange={(e) => setLine(i, { machineId: e.target.value })}>
                      {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  )}
                </div>
              )}
              {l.method === "pix" && accounts.length > 0 && (
                <div className="db-splitline-detail">
                  <select value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })}>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.label || a.bank}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))}

          <button className="db-linkbtn" onClick={addLine}><Plus size={14} /> Adicionar forma</button>

          <div className={"db-split-status " + (Math.abs(remaining) < 0.01 ? "ok" : allowPartial && remaining > 0 ? "partial" : "")}>
            {Math.abs(remaining) < 0.01
              ? "Valores conferem"
              : remaining > 0
                ? (allowPartial ? `Fica ${brl(remaining)} na comanda` : `Falta ${brl(remaining)}`)
                : `Excede em ${brl(-remaining)}`}
          </div>

          <button className="db-linkbtn" onClick={() => setMode("single")}>Voltar ao pagamento simples</button>
          <div className="db-modal-actions">
            <button className="db-btn ghost" onClick={onClose}>Cancelar</button>
            <button className="db-btn gold" onClick={confirmSplit}
              disabled={allowPartial ? (applied <= 0 || remaining < -0.01) : Math.abs(remaining) >= 0.01}>
              <Check size={16} /> {allowPartial && remaining > 0.01 ? "Receber parcial" : "Confirmar"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
