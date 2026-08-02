import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  collection, doc, onSnapshot, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, setDoc, writeBatch, increment, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "s" + Date.now() + Math.random().toString(16).slice(2);

const col = (name) => collection(db, name);
const registerRef = () => doc(db, "meta", "register");
const isConsumo = (it) => (it.kind || "consumo") === "consumo";

export function DataProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [sales, setSales] = useState([]);
  const [days, setDays] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [register, setRegister] = useState({ open: false });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = [
      onSnapshot(query(col("products"), orderBy("name")), (s) =>
        setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(col("cardMachines"), (s) =>
        setMachines(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(col("bankAccounts"), (s) =>
        setAccounts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(query(col("tabs"), where("status", "==", "open")), (s) =>
        setTabs(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(query(col("days"), orderBy("closedAt", "desc"), limit(180)), (s) =>
        setDays(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(col("expenses"), (s) =>
        setExpenses(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(col("withdrawals"), (s) =>
        setWithdrawals(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(registerRef(), (d) => {
        setRegister(d.exists() ? d.data() : { open: false });
        setReady(true);
      }),
    ];
    return () => unsub.forEach((u) => u());
  }, []);

  // Vendas da sessão atual do caixa.
  useEffect(() => {
    if (!register.open || !register.sessionId) { setSales([]); return; }
    const q = query(col("sales"), where("sessionId", "==", register.sessionId));
    return onSnapshot(q, (s) => setSales(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [register.open, register.sessionId]);

  // Retiradas (sangrias) da sessão atual do caixa.
  const sessionWithdrawals = useMemo(
    () => withdrawals.filter((w) => w.sessionId === register.sessionId),
    [withdrawals, register.sessionId]
  );
  const withdrawalsTotal = useMemo(
    () => sessionWithdrawals.reduce((a, w) => a + (w.amount || 0), 0),
    [sessionWithdrawals]
  );

  /* ---------------- produtos ---------------- */
  const addProduct = (p) => addDoc(col("products"), p);
  const updateProduct = (id, p) => updateDoc(doc(db, "products", id), p);
  const deleteProduct = (id) => deleteDoc(doc(db, "products", id));
  const adjustStock = (id, delta) => updateDoc(doc(db, "products", id), { stock: increment(delta) });

  /* ---------------- máquinas / contas ---------------- */
  const addMachine = (m) => addDoc(col("cardMachines"), m);
  const updateMachine = (id, m) => updateDoc(doc(db, "cardMachines", id), m);
  const deleteMachine = (id) => deleteDoc(doc(db, "cardMachines", id));
  const addAccount = (a) => addDoc(col("bankAccounts"), a);
  const updateAccount = (id, a) => updateDoc(doc(db, "bankAccounts", id), a);
  const deleteAccount = (id) => deleteDoc(doc(db, "bankAccounts", id));

  /* ---------------- despesas ---------------- */
  const addExpense = (e) => addDoc(col("expenses"), { ...e, createdAt: serverTimestamp() });
  const updateExpense = (id, e) => updateDoc(doc(db, "expenses", id), e);
  const deleteExpense = (id) => deleteDoc(doc(db, "expenses", id));

  /* ---------------- retiradas / sangrias ---------------- */
  // Tira dinheiro da gaveta. isExpense=true também entra no Balanço como despesa.
  const addWithdrawal = ({ amount, reason, isExpense, category }) =>
    addDoc(col("withdrawals"), {
      amount: Number(amount) || 0,
      reason: (reason || "").trim(),
      isExpense: !!isExpense,
      category: isExpense ? (category || "outros") : null,
      sessionId: register.sessionId || null,
      createdAt: serverTimestamp(),
    });
  const deleteWithdrawal = (id) => deleteDoc(doc(db, "withdrawals", id));

  /* ---------------- caixa ---------------- */
  const openRegister = (openingCash) =>
    setDoc(registerRef(), {
      open: true,
      openingCash: Number(openingCash) || 0,
      openedAt: serverTimestamp(),
      sessionId: uid(),
    });

  const closeRegister = async () => {
    const s = summarize(sales, register.openingCash || 0, withdrawalsTotal);
    await addDoc(col("days"), {
      closedAt: serverTimestamp(),
      openedAt: register.openedAt || null,
      openingCash: register.openingCash || 0,
      sessionId: register.sessionId || null,
      ...s,
    });
    await setDoc(registerRef(), { open: false });
  };

  /* ---------------- linha de item ---------------- */
  // kind: "consumo" (baixa estoque) | "ficha" (não baixa estoque, é venda de ficha)
  const lineFrom = (product, qty, kind = "consumo") => ({
    productId: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    cost: product.cost || 0,
    qty,
    kind,
  });

  /* ---------------- comandas ---------------- */
  const openTab = (customer) =>
    addDoc(col("tabs"), {
      customer: customer.trim(),
      status: "open",
      items: [],
      total: 0,
      sessionId: register.sessionId || null,
      createdAt: serverTimestamp(),
    });

  const addItemToTab = async (tab, product, kind = "consumo") => {
    const items = [...(tab.items || [])];
    const i = items.findIndex((x) => x.productId === product.id && (x.kind || "consumo") === kind);
    if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + 1 };
    else items.push(lineFrom(product, 1, kind));
    const total = items.reduce((a, it) => a + it.price * it.qty, 0);

    const batch = writeBatch(db);
    batch.update(doc(db, "tabs", tab.id), { items, total });
    if (kind === "consumo") batch.update(doc(db, "products", product.id), { stock: increment(-1) });
    await batch.commit();
  };

  // Lança um valor livre (avulso) na comanda: não baixa estoque e não tem produto cadastrado.
  const addManualToTab = async (tab, { name, price }) => {
    const line = {
      productId: uid(),
      name: (name || "Diversos").trim() || "Diversos",
      category: "diversos",
      price: Number(price) || 0,
      cost: 0,
      qty: 1,
      kind: "manual",
    };
    const items = [...(tab.items || []), line];
    const total = items.reduce((a, it) => a + it.price * it.qty, 0);
    await updateDoc(doc(db, "tabs", tab.id), { items, total });
  };

  const removeItemFromTab = async (tab, productId, kind = "consumo") => {
    let items = [...(tab.items || [])];
    const i = items.findIndex((x) => x.productId === productId && (x.kind || "consumo") === kind);
    if (i < 0) return;
    if (items[i].qty > 1) items[i] = { ...items[i], qty: items[i].qty - 1 };
    else items = items.filter((_, idx) => idx !== i);
    const total = items.reduce((a, it) => a + it.price * it.qty, 0);

    const batch = writeBatch(db);
    batch.update(doc(db, "tabs", tab.id), { items, total });
    if (kind === "consumo") batch.update(doc(db, "products", productId), { stock: increment(1) });
    await batch.commit();
  };

  const closeTab = async (tab, payments) => {
    const batch = writeBatch(db);
    const saleRef = doc(col("sales"));
    batch.set(saleRef, {
      origin: "comanda",
      customer: tab.customer,
      items: tab.items || [],
      total: tab.total || 0,
      payments,
      sessionId: register.sessionId || null,
      paidAt: serverTimestamp(),
    });
    // Estoque de consumo já baixou ao lançar; fichas não baixam estoque.
    batch.delete(doc(db, "tabs", tab.id));
    await batch.commit();
  };

  // Recebe pagamento de uma comanda, aceitando pagamento PARCIAL.
  // Se o valor pago quita o restante, fecha a comanda (registra a venda com os itens).
  // Se pagar menos, registra só o dinheiro que entrou e mantém a comanda aberta
  // com o saldo restante (os itens continuam na comanda até a quitação).
  const payTab = async (tab, payments) => {
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const paid = round2((payments || []).reduce((a, p) => a + (p.amount || 0), 0));
    const total = round2(tab.total || 0);
    const already = round2(tab.paidSoFar || 0);
    const remaining = round2(total - already);
    const settle = paid >= remaining - 0.01; // quita o que faltava

    const batch = writeBatch(db);
    const saleRef = doc(col("sales"));
    if (settle) {
      // Quitação: registra a venda com todos os itens (custo/estoque já baixaram ao lançar).
      batch.set(saleRef, {
        origin: "comanda",
        customer: tab.customer,
        items: tab.items || [],
        total: paid,            // dinheiro que entrou agora
        fullTotal: total,       // valor total da conta (referência)
        priorPaid: already,     // quanto já havia sido pago em parciais
        partial: false,
        payments,
        sessionId: register.sessionId || null,
        paidAt: serverTimestamp(),
      });
      batch.delete(doc(db, "tabs", tab.id));
    } else {
      // Pagamento parcial: registra só o dinheiro; itens seguem na comanda.
      batch.set(saleRef, {
        origin: "comanda",
        customer: tab.customer,
        items: [],
        total: paid,
        partial: true,
        payments,
        sessionId: register.sessionId || null,
        paidAt: serverTimestamp(),
      });
      batch.update(doc(db, "tabs", tab.id), { paidSoFar: round2(already + paid) });
    }
    await batch.commit();
  };

  const cancelTab = async (tab) => {
    const batch = writeBatch(db);
    for (const it of tab.items || [])
      if (isConsumo(it)) batch.update(doc(db, "products", it.productId), { stock: increment(it.qty) });
    batch.delete(doc(db, "tabs", tab.id));
    await batch.commit();
  };

  /* ---------------- venda avulsa / troca de ficha ---------------- */
  // origin: "avulso" (venda ou venda de ficha) | "troca" (troca de ficha por mercadoria)
  const createSale = async ({ items, payments = [], origin = "avulso" }) => {
    const total = items.reduce((a, it) => a + it.price * it.qty, 0);
    const batch = writeBatch(db);
    const saleRef = doc(col("sales"));
    batch.set(saleRef, {
      origin,
      items,
      total,
      payments,
      sessionId: register.sessionId || null,
      paidAt: serverTimestamp(),
    });
    for (const it of items)
      if (isConsumo(it)) batch.update(doc(db, "products", it.productId), { stock: increment(-it.qty) });
    await batch.commit();
  };

  const voidSale = async (sale) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, "sales", sale.id));
    for (const it of sale.items || [])
      if (isConsumo(it)) batch.update(doc(db, "products", it.productId), { stock: increment(it.qty) });
    await batch.commit();
  };

  const value = {
    products, machines, accounts, tabs, sales, days, expenses, register, ready,
    lineFrom,
    addProduct, updateProduct, deleteProduct, adjustStock,
    addMachine, updateMachine, deleteMachine,
    addAccount, updateAccount, deleteAccount,
    addExpense, updateExpense, deleteExpense,
    withdrawals, sessionWithdrawals, addWithdrawal, deleteWithdrawal,
    openRegister, closeRegister,
    openTab, addItemToTab, addManualToTab, removeItemFromTab, closeTab, payTab, cancelTab,
    createSale, voidSale,
    summary: useMemo(() => summarize(sales, register.openingCash || 0, withdrawalsTotal), [sales, register.openingCash, withdrawalsTotal]),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/* ---------------- agregação do dia ---------------- */
// cashIn = dinheiro que entrou (dinheiro + pix + cartão). Inclui fichas vendidas.
// fichaSold = valor das fichas vendidas (dinheiro entrou, mercadoria não saiu).
// fichaOut = valor retirado em trocas de ficha (mercadoria saiu, sem dinheiro novo).
export function summarize(sales, openingCash, withdrawalsTotal = 0) {
  const byMethod = { dinheiro: 0, pix: 0, cartao: 0 };
  const byMachine = {};
  const byAccount = {};
  const topMap = {};
  let cashIn = 0;
  let fichaSold = 0;
  let fichaOut = 0;
  let custoSaidas = 0;

  for (const s of sales) {
    if (s.origin === "troca") fichaOut += s.total || 0;
    for (const it of s.items || []) {
      if (it.kind === "ficha") {
        fichaSold += it.price * it.qty;
      } else if (it.kind === "manual") {
        // Valor avulso digitado na hora: sem custo e não conta no "mais vendido".
      } else {
        custoSaidas += (it.cost || 0) * it.qty;
        topMap[it.name] = (topMap[it.name] || 0) + it.qty;
      }
    }
    for (const p of s.payments || []) {
      byMethod[p.method] = (byMethod[p.method] || 0) + (p.amount || 0);
      cashIn += p.amount || 0;
      if (p.method === "cartao" && p.machineName)
        byMachine[p.machineName] = (byMachine[p.machineName] || 0) + (p.amount || 0);
      if (p.method === "pix" && p.accountName)
        byAccount[p.accountName] = (byAccount[p.accountName] || 0) + (p.amount || 0);
    }
  }

  const top = Object.entries(topMap).sort((a, b) => b[1] - a[1]);
  return {
    cashIn,
    salesCount: sales.length,
    byMethod,
    byMachine,
    byAccount,
    fichaSold,
    fichaOut,
    withdrawalsTotal,
    expectedCash: (openingCash || 0) + byMethod.dinheiro - (withdrawalsTotal || 0),
    profit: cashIn - custoSaidas,
    topProduct: top.length ? `${top[0][0]} (${top[0][1]}×)` : "—",
  };
}