import { useState } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

// Traduz o código de erro do Firebase para uma mensagem útil.
function messageFor(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos. Confira se está usando o mesmo e-mail/senha cadastrados neste projeto.";
    case "auth/invalid-email":
      return "E-mail em formato inválido.";
    case "auth/operation-not-allowed":
      return "Ative o método E-mail/Senha em Authentication → Sign-in method no Console do Firebase.";
    case "auth/invalid-api-key":
    case "auth/configuration-not-found":
      return "Configuração do Firebase inválida. Confira o arquivo .env e reinicie o servidor.";
    case "auth/network-request-failed":
      return "Sem conexão com o Firebase. Verifique a internet.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    default:
      return `Não foi possível entrar${code ? ` (${code})` : ""}.`;
  }
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      console.error("Falha no login:", e?.code, e?.message, e);
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="db-login">
      <div className="db-login-card">
        <img src={logo} alt="Dias Bar" className="db-login-logo" />
        <p className="db-login-sub">Acesso restrito</p>
        <label className="db-field">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} autoComplete="username" />
        </label>
        <label className="db-field">
          <span>Senha</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} autoComplete="current-password" />
        </label>
        {error && <p className="db-login-err">{error}</p>}
        <button className="db-btn gold block" onClick={submit} disabled={busy || !email || !password}>
          <LogIn size={16} /> {busy ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
