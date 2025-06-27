"use client";

import React, { useState } from "react";
import styles from "./navbar.module.css";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className={styles.navbar}>
      {/* Hamburger icon */}
      <div className={styles.hamburger} onClick={() => setOpen(!open)}>
        <span />
        <span />
        <span />
      </div>

      <nav className={`${styles.menu} ${open ? styles.show : ""}`}>
        <Link href="/" onClick={() => setOpen(false)}>
          home
        </Link>
        <Link href="/about" onClick={() => setOpen(false)}>
          about
        </Link>
        <Link href="/photobooth" onClick={() => setOpen(false)}>
          photobooth
        </Link>
        <Link href="/faq" onClick={() => setOpen(false)}>
          FAQ
        </Link>
        <Link href="/contact" onClick={() => setOpen(false)}>
          contact
        </Link>
        <div className={styles.flowerImage}>
          <Image
            src="/navflower.png"
            alt="nav flower Logo"
            width={340}
            height={440}
            className={styles.flower}
          />
        </div>
      </nav>
    </header>
  );
}
