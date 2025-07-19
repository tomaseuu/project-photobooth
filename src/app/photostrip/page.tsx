"use client";

import React from "react";
import styles from "./photostrip.module.css";

export default function Page() {
  return (
    <div className={styles.page}>
      <h1>LUMA LEAF</h1>
   <div className={styles.palette}>
    <p className={styles.chooseText}>select your shade!</p>
        <div className={styles.paletteBox}>
            <h2>Palette</h2>
            <p>white</p>
            <p>blue</p>
            <p>green</p>
            <p>purple</p>
            <p>red</p>
            <p>black</p>
        </div>
        <p>choose:</p>

    <div className={styles.themes}>
    <p className={styles.chooseText}>choose a sticker!</p>
        <div className={styles.paletteBox}>
            <h2>Themes</h2>
            <p>none</p>
            <p>cute</p>
            <p>leaf</p>
            <p>BTS</p>
            <p>TWICE</p>
            <p>Miffy</p>
        </div>
    </div>
    <div className={styles.rightGroup}>
          <button className={styles.boxButton}>NEW</button>
          <button className={styles.boxButton}>REDO</button>
          <button className={styles.boxButton}>VIDEO GIF</button>
          <button className={styles.boxButton}>QR CODE</button>
          <button className={styles.boxButton}>DOWNLOAD</button>
          </div>
    </div>
    </div>
        );
}
