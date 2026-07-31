import { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { CATS, catLabel, LOW_STOCK } from "../lib/constants";
import { brl } from "../lib/format";

export default function ProductPicker({ products, onPick, badges = {}, allowOut = false }) {
  const [cat, setCat] = useState("todos");
  const list = useMemo(
    () => products.filter((p) => cat === "todos" || p.category === cat),
    [products, cat]
  );

  return (
    <div>
      <div className="db-chips">
        <button className={"db-chip " + (cat === "todos" ? "on" : "")} onClick={() => setCat("todos")}>Todos</button>
        {CATS.map((c) => (
          <button key={c.key} className={"db-chip " + (cat === c.key ? "on" : "")} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="db-empty sm">
          <Package size={24} className="db-empty-ic" />
          <p>Nenhum produto nessa categoria. Cadastre em Estoque.</p>
        </div>
      ) : (
        <div className="db-grid">
          {list.map((p) => {
            const out = p.stock <= 0 && !allowOut;
            const badge = badges[p.id] || 0;
            return (
              <button key={p.id} className={"db-prod " + (out ? "out" : "")} onClick={() => !out && onPick(p)} disabled={out}>
                <span className="db-prod-cat">{catLabel(p.category)}</span>
                <span className="db-prod-name">{p.name}</span>
                <span className="db-prod-foot">
                  <span className="db-prod-price">{brl(p.price)}</span>
                  <span className={"db-prod-stk " + (p.stock <= 0 ? "z" : p.stock <= LOW_STOCK ? "low" : "")}>
                    {!allowOut && p.stock <= 0 ? "esgotado" : `${p.stock} un`}
                  </span>
                </span>
                {badge > 0 && <span className="db-prod-badge">{badge}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
