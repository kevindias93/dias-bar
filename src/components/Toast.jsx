import { createContext, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const flash = (msg, kind = "ok") => {
    setToast({ msg, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  };

  return (
    <ToastContext.Provider value={flash}>
      {children}
      {toast && <div className={"db-toast " + toast.kind}>{toast.msg}</div>}
    </ToastContext.Provider>
  );
}
