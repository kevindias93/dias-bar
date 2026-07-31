import { useEffect, useRef } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { doc, getDoc, setDoc, writeBatch, collection } from "firebase/firestore";
import { db } from "./firebase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider, useData } from "./context/DataContext";
import { ToastProvider } from "./components/Toast";
import Login from "./components/Login";
import Layout from "./components/Layout";
import Vender from "./pages/Vender";
import Comandas from "./pages/Comandas";
import Estoque from "./pages/Estoque";
import Caixa from "./pages/Caixa";
import Ajustes from "./pages/Ajustes";
import Balanco from "./pages/Balanco";
import logo from "./assets/logo.png";
import { SEED_PRODUCTS } from "./lib/constants";

function Splash() {
  return (
    <div className="db-root db-center">
      <img src={logo} alt="Dias Bar" className="db-loadlogo" />
    </div>
  );
}

// Cria os produtos de exemplo apenas na primeiríssima execução.
function Seeder() {
  const { ready } = useData();
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    (async () => {
      const flag = doc(db, "meta", "app");
      const snap = await getDoc(flag);
      if (snap.exists() && snap.data().seeded) return;
      const batch = writeBatch(db);
      for (const p of SEED_PRODUCTS) batch.set(doc(collection(db, "products")), p);
      batch.set(flag, { seeded: true });
      await batch.commit();
    })().catch(() => {});
  }, [ready]);
  return null;
}

function Shell() {
  const { ready, user } = useAuth();
  if (!ready) return <Splash />;
  if (!user) return <Login />;
  return (
    <DataProvider>
      <ToastProvider>
        <Seeder />
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Vender />} />
              <Route path="comandas" element={<Comandas />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="caixa" element={<Caixa />} />
              <Route path="balanco" element={<Balanco />} />
              <Route path="ajustes" element={<Ajustes />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
