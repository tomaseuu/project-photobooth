"use client";

import React from "react";
import styles from "./prebooth.module.css";
import Image from "next/image";
import { useEffect } from "react";
import Link from "next/link";

export default function Prebooth() {
  return (
    <div className={styles.page}>
      <div className={styles.textSection}>
        <p>hey there, welcome to Luma Leaf 🍃</p>
        <p>the camera will take 4 shots, one after the other</p>
        <p>you get 3 seconds between each</p>
        <p>be real or be silly, your call</p>
        <p>save and share your best (or weirdest) moment!</p>
      </div>
      <Link href="/photobooth" className={styles.continue}>
        <h1>CONTINUE</h1>
      </Link>
    </div>
  );
}
