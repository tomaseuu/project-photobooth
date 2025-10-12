"use client";

import React, { useState } from "react";
import styles from "./contact.module.css";
import emailjs from "emailjs-com";

export default function Contact() {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // basic validation
    if (
      !formData.firstname ||
      !formData.lastname ||
      !formData.email ||
      !formData.message
    ) {
      setStatus("Please fill in all fields.");
      return;
    }

    setStatus("");
    setIsSending(true);

    // MUST match your EmailJS template fields
    const templateParams = {
      from_name: `${formData.firstname} ${formData.lastname}`,
      firstname: formData.firstname,
      lastname: formData.lastname,
      email: formData.email,
      message: formData.message,
      reply_to: formData.email,
    };

    try {
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID as string;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID as string;
      const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY as string;

      await emailjs.send(serviceId, templateId, templateParams, publicKey);

      setStatus("Thank you! Your message has been sent.");
      setFormData({ firstname: "", lastname: "", email: "", message: "" });
    } catch (err) {
      console.error(err);
      setStatus("Oops—something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <div className={styles.contactPage}>
        <div className={styles.contactName}>
          <h1>Contact</h1>
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
            />

            <button
              className={styles.input}
              type="submit"
              disabled={isSending}
              aria-busy={isSending}
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </form>

          {status && <p>{status}</p>}
        </div>
      </div>
    </div>
  );
}
