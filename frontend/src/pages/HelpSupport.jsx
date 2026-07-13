import React, { useState } from 'react';
import { LifeBuoy, MessageCircle, Mail, Phone, Send, CheckCircle2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

// TODO: swap these for your real support contact details.
const SUPPORT_CONTACT = {
    whatsapp: '+1 555 010 2020',       // shown to the user; digits below are used for the wa.me link
    whatsappLink: '15550102020',
    email: 'support@yourcompany.com',
    phone: '+1 555 010 2020',
    phoneLink: '+15550102020',
};

const CATEGORIES = ['General question', 'Bug report', 'Feature request', 'Account / access', 'Other'];

export default function HelpSupport() {
    const [form, setForm] = useState({ name: '', email: '', category: CATEGORIES[0], message: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        // UI only for now — nothing is sent anywhere yet.
        setSubmitted(true);
    };

    const handleSendAnother = () => {
        setForm({ name: '', email: '', category: CATEGORIES[0], message: '' });
        setSubmitted(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col p-8">
            <div className="max-w-4xl mx-auto w-full">

                {/* Header */}
                <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-center gap-4">
                    <LifeBuoy size={40} className="text-primary-600 dark:text-primary-400" />
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Help & Support</h1>
                        <div className="text-sm font-semibold tracking-normal text-gray-700 dark:text-gray-300 mt-1">
                            Reach us directly, or send us a message below
                        </div>
                    </div>
                </div>

                <div className="space-y-8 pb-20">

                    {/* Contact options */}
                    <div className="aiq-card p-8">
                        <h2 className="text-xl font-bold mb-6">Contact Us</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <a
                                href={`https://wa.me/${SUPPORT_CONTACT.whatsappLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col gap-3 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all"
                            >
                                <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">WhatsApp</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{SUPPORT_CONTACT.whatsapp}</p>
                                </div>
                            </a>

                            <a
                                href={`mailto:${SUPPORT_CONTACT.email}`}
                                className="flex flex-col gap-3 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-400 dark:hover:border-primary-600 transition-all"
                            >
                                <div className="w-11 h-11 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">Email</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{SUPPORT_CONTACT.email}</p>
                                </div>
                            </a>

                            <a
                                href={`tel:${SUPPORT_CONTACT.phoneLink}`}
                                className="flex flex-col gap-3 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all"
                            >
                                <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">Phone</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{SUPPORT_CONTACT.phone}</p>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Help request form */}
                    <div className="aiq-card p-8">
                        <h2 className="text-xl font-bold mb-2">Send a Help Request</h2>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-6">
                            Describe your issue and we'll get back to you as soon as we can.
                        </p>

                        {submitted ? (
                            <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                                <CheckCircle2 size={56} className="text-emerald-500" />
                                <div>
                                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Request sent</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                        Thanks — we've received your message and will be in touch shortly.
                                    </p>
                                </div>
                                <button
                                    onClick={handleSendAnother}
                                    className="mt-2 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:border-primary-400 dark:hover:border-primary-600 transition-colors"
                                >
                                    Send another request
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1.5 block">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={e => handleChange('name', e.target.value)}
                                            placeholder="Your name"
                                            className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1.5 block">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={form.email}
                                            onChange={e => handleChange('email', e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1.5 block">
                                        Category
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={form.category}
                                            onChange={e => handleChange('category', e.target.value)}
                                            className="w-full appearance-none bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors"
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1.5 block">
                                        Message
                                    </label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={form.message}
                                        onChange={e => handleChange('message', e.target.value)}
                                        placeholder="Tell us what's going on..."
                                        className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className={clsx(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors",
                                        "bg-primary-600 text-white hover:bg-primary-700"
                                    )}
                                >
                                    <Send size={16} /> Submit Request
                                </button>
                            </form>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}