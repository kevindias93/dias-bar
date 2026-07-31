import { NavLink, Outlet } from "react-router-dom";
import { ShoppingCart, ClipboardList, Package, Wallet, BarChart3, Settings, Lock, Unlock, LogOut } from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const TABS = [
  { to: "/", label: "Vender", icon: ShoppingCart, end: true },
  { to: "/comandas", label: "Comandas", icon: ClipboardList },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/caixa", label: "Caixa", icon: Wallet },
  { to: "/balanco", label: "Balanço", icon: BarChart3 },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

export default function Layout() {
  const { register } = useData();
  const { logout } = useAuth();

  return (
    <div className="db-shell">
      <header className="db-header">
        <img src={logo} alt="Dias Bar" className="db-logo" />
        <div className="db-header-right">
          <span className={"db-status " + (register.open ? "on" : "off")}>
            {register.open ? <Unlock size={13} /> : <Lock size={13} />}
            {register.open ? "Caixa aberto" : "Caixa fechado"}
          </span>
          <button className="db-x" onClick={logout} title="Sair" aria-label="Sair"><LogOut size={16} /></button>
        </div>
      </header>

      <main className="db-main">
        <Outlet />
      </main>

      <nav className="db-tabbar six">
        {TABS.map((t) => {
          const I = t.icon;
          return (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => "db-tab " + (isActive ? "active" : "")}>
              <I size={19} />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
