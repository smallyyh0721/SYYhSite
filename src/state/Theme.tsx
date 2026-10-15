"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Theme } from "@/lib/contracts";
const Context = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "night",
  setTheme: () => {},
});
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setValue] = useState<Theme>("night");
  useEffect(() => {
    setValue(
      document.documentElement.dataset.theme === "day" ? "day" : "night",
    );
    document.documentElement.dataset.clientReady = "true";
    return () => { delete document.documentElement.dataset.clientReady; };
  }, []);
  const setTheme = (value: Theme) => {
    document.documentElement.dataset.theme = value;
    setValue(value);
    try {
      localStorage.setItem("syyh-theme", value);
    } catch {}
  };
  return (
    <Context.Provider value={{ theme, setTheme }}>{children}</Context.Provider>
  );
}
export const useTheme = () => useContext(Context);
