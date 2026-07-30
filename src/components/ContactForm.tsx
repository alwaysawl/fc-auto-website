"use client";

import { useState } from "react";
import { Translations } from "@/lib/translations";

interface ContactFormProps {
  t: Translations;
}

export default function ContactForm({ t }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-gold/10 border border-gold/30 rounded-sm p-8 text-center">
        <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gold font-medium">{t.contact.form.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
          {t.contact.form.name}
        </label>
        <input type="text" required className="input-dark" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
          {t.contact.form.email}
        </label>
        <input type="email" required className="input-dark" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
          {t.contact.form.phone}
        </label>
        <input type="tel" className="input-dark" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
          {t.contact.form.message}
        </label>
        <textarea required rows={5} className="input-dark resize-none" />
      </div>
      <button type="submit" className="btn-primary w-full">
        {t.contact.form.submit}
      </button>
    </form>
  );
}
