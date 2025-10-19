"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./theme.module.css";

const DARK_CLASS = "ll-dark";
const STORAGE_KEY = "site-dark";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  const apply = (enable: boolean) => {
    const root = document.documentElement; // <html>
    if (enable) {
      root.classList.add(DARK_CLASS);
      localStorage.setItem(STORAGE_KEY, "1");
    } else {
      root.classList.remove(DARK_CLASS);
      localStorage.removeItem(STORAGE_KEY);
    }
    setDark(enable);
  };

  useEffect(() => {
    apply(localStorage.getItem(STORAGE_KEY) === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      onClick={() => apply(!dark)}
      aria-label="Toggle dark mode"
      className={styles.btn}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
