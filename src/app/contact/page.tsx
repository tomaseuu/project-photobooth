"use client";

import React, { useState } from "react";
import styles from "./contact.module.css";

export default function Contact() {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.firstname ||
      !formData.lastname ||
      !formData.email ||
      !formData.message
    ) {
      setStatus("Please fill in all fields.");
      return;
    }

    setStatus("Thank you for your message!");
  };

  return (
    <div>
      <div className={styles.contactPage}>
        <div className={styles.contactName}>
          <h1>CONTACT</h1>
        </div>

        <div className={styles.form}>
          <form id="contact-form" onSubmit={handleSubmit}>
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label htmlFor="firstname" className="label">
                  <b>First Name</b>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  id="firstname"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="lastname" className="label">
                  <b>Last Name</b>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  id="lastname"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <label htmlFor="email" className="label">
              <b>Email Address</b>
            </label>
            <input
              className={styles.input}
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <label htmlFor="message" className="label">
              <b>Message</b>
            </label>
            <textarea
              className={styles.textarea}
              id="message"
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>
            <input className={styles.input} type="submit" value="submit" />
          </form>

          {status && <p>{status}</p>}
        </div>
      </div>
    </div>
  );
}
