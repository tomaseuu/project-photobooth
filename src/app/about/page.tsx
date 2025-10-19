"use client";

import React from "react";
import styles from "./about.module.css";
import Image from "next/image";
import { useEffect } from "react";

export default function About() {
  return (
    <div data-page="about" className={styles.page}>
      <div className={styles.textSection}>
        <h2>Learn More</h2>
        <h1>About Us</h1>
        <p>
          Photobooth started as a small personal project, born from a passion
          for capturing life’s little moments. What began with a camera, some
          creativity, and a love for memories has grown into a fun and easy way
          to bring the photo booth experience home.
        </p>
        <p>
          Whether you are celebrating with friends or just feeling spontaneous,
          Photobooth makes it simple to snap, laugh, and print memories that
          stick with you. More than just photos, it is about connection,
          creativity, and letting good times take root.
        </p>
        <p> -------------------------------------------------------- </p>
        <p>
          Developer: Thomas Le
        </p>
        <p>
          Graphic Designer: Haixin Huang
        </p>
      </div>
      <div className={styles.aboutImage}>
        <Image
          src="/aboutpic.png"
          alt="about picture"
          width={600}
          height={600}
          className={styles.about}
        />
      </div>
    </div>
  );
}
