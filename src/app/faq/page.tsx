"use client";

import React from "react";
import styles from "./faq.module.css";

export default function FAQ() {
  const faqs = [
    {
      q: "How does Photobooth work?",
      a: "Photobooth turns your device into a fun, interactive photo booth experience. Just open the site, strike a pose, take a photo or video, and save or print your favorites. No setup needed, just good vibes.",
    },
    {
      q: "Is it free to use?",
      a: "Absolutely. Photobooth was made for fun and connection, so all the core features are free. We may add extras in the future, but the heart of the experience will always stay open.",
    },
    {
      q: "Does Photobooth store photos?",
      a: "Nope! Photos are stored locally in your browser for privacy. Once you close or clear your session, your photos are gone—so make sure to download your favorites before you leave!",
    },
    {
      q: "What image formats can I upload?",
      a: "You can upload images in PNG, JPEG, or JPG formats. HEIC files (used by some iPhones) are not supported yet, so make sure to convert them before uploading!",
    },
    {
      q: "Can I use it for parties or events?",
      a: "Totally! Whether it is a birthday, hangout, or cozy night in, Photobooth adds a playful touch. Just set it up on a laptop or tablet, gather your people, and let the memories bloom.",
    },
    {
      q: "Can I print or share my photos?",
      a: "Yes! After snapping your pics, you can download them and print them at home or through any photo printing service. You can also generate a shareable QR link for your photostrip.",
    },
    {
      q: "Do I need to make an account?",
      a: "No account needed! Photobooth keeps things simple, just open, snap, and save.",
    },
    {
      q: "Does it work on mobile?",
      a: "Yep! Photobooth works on phones, tablets, and computers. Just allow camera access and you are good to go. BUT we recommend to use your laptop!!",
    },
    {
      q: "Can I customize my photo strip?",
      a: "Yes! You can drag, resize, and reorder photos to create your own custom photostrip before exporting it.",
    },
    {
      q: "Who designed these amazing graphics?",
      a: "All the wonderful graphics and visuals in Photobooth were designed by Haixin Huang!",
    },
  ];

  return (
    <main className={styles.faqPage}>
      <h1 className={styles.title}>FAQ</h1>

      <div className={styles.list}>
        {faqs.map((item, index) => (
          <div key={index} className={styles.faqItem}>
            <div className={styles.question}>{item.q}</div>
            <div className={styles.answer}>{item.a}</div>
          </div>
        ))}
      </div>

      <div className={styles.contactNote}>
        If you have any more questions, please contact us!
      </div>
    </main>
  );
}
