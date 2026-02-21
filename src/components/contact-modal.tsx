"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { siteContent } from "@/content/site";
import { cn } from "@/lib/utils";

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
    const [redirectingTo, setRedirectingTo] = useState<string | null>(null);
    const phoneDigits = siteContent.phone.replace(/\D/g, "");
    const chatHref = phoneDigits ? `https://wa.me/${phoneDigits}` : "#";

    const contactOptions = [
        {
            label: "Email",
            id: "email",
            description: "Send me a direct message",
            href: `mailto:${siteContent.email}`,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
            color: "bg-blue-500/10 text-blue-400"
        },
        {
            label: "LinkedIn",
            id: "linkedin",
            description: "Professional networking",
            href: siteContent.socials.find(s => s.label === "LinkedIn")?.href || "#",
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
            ),
            color: "bg-sky-500/10 text-sky-400"
        },
        {
            label: "Chat",
            id: "chat",
            description: phoneDigits ? "WhatsApp message" : "Phone number not configured",
            href: chatHref,
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.301-.15-1.779-.877-2.053-.976-.275-.099-.476-.15-.675.15-.199.3-.771.976-.944 1.176-.173.199-.347.225-.648.075-.301-.15-1.267-.467-2.414-1.491-.893-.797-1.495-1.782-1.671-2.081-.176-.3-.019-.462.131-.611.135-.134.301-.351.451-.525.15-.173.199-.299.299-.498.1-.199.05-.374-.025-.525s-.675-1.625-.925-2.227c-.243-.584-.489-.505-.675-.514-.175-.008-.375-.01-.575-.01s-.525.075-.8.375c-.275.3-1.05.1.05.1-1.05 1.026-1.05 1.026 2.501 0-2.31 4.704-.707 5.922-.843 6.104-.136.182-1.026 1.05-1.026 2.556 0 1.506.976 2.964 1.112 3.146.136.182 1.921 2.934 4.653 4.114.65.28 1.157.447 1.551.572.653.208 1.248.179 1.717.108.523-.078 1.779-.726 2.03-1.426.251-.7 2.03-1.426.251-.701 1.272-1.426 1.536-1.426s.251-.274.251-.274-.251.274-.251.274c-.301-.15-1.779-.877-2.053-.976z" />
                </svg>
            ),
            color: "bg-green-500/10 text-green-400"
        }
    ];

    const handleContactClick = (e: React.MouseEvent, id: string, href: string) => {
        e.preventDefault();
        setRedirectingTo(id);

        if (!href || href === "#") {
            setRedirectingTo(null);
            return;
        }

        setTimeout(() => {
            if (href.startsWith('mailto:')) {
                window.location.href = href;
            } else {
                window.open(href, '_blank', 'noopener,noreferrer');
            }

            // Allow more time for the browser to initiate the action
            // before resetting the UI and closing the modal.
            setTimeout(() => {
                setRedirectingTo(null);
                onClose();
            }, 1000);
        }, 1200);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm cursor-pointer"
                    />
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-surface border border-white/5 rounded-3xl overflow-hidden pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="p-8 md:p-10 border-b border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Let&apos;s talk</span>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <h2 className="text-3xl font-heading font-black text-white tracking-tighter uppercase leading-none">
                                    Choose your <br /> <span className="text-primary italic font-light">Channel</span>
                                </h2>
                            </div>

                            {/* Options */}
                            <div className="p-6 md:p-8 space-y-3">
                                {contactOptions.map((option, i) => (
                                    <motion.button
                                        disabled={redirectingTo !== null}
                                        key={option.label}
                                        onClick={(e) => handleContactClick(e, option.id, option.href)}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                            scale: redirectingTo === option.id ? 1.02 : 1,
                                        }}
                                        transition={{ delay: 0.1 + i * 0.1 }}
                                        className={cn(
                                            "w-full group relative flex items-center gap-6 p-6 rounded-2xl transition-all text-left",
                                            "bg-white/[0.02] border border-white/0 hover:border-white/5 hover:bg-white/[0.04]",
                                            redirectingTo === option.id && "bg-white/[0.08] border-primary/20 scale-[1.02]",
                                            redirectingTo && redirectingTo !== option.id && "opacity-40 grayscale-[0.5]"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-14 h-14 rounded-xl flex items-center justify-center transition-transform",
                                            option.color,
                                            redirectingTo === option.id ? "scale-110 rotate-[10deg]" : "group-hover:scale-110"
                                        )}>
                                            {redirectingTo === option.id ? (
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                                    className="w-6 h-6 border-2 border-current border-t-transparent rounded-full"
                                                />
                                            ) : option.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-lg uppercase tracking-wider group-hover:text-primary transition-colors">
                                                {redirectingTo === option.id ? "Connecting..." : option.label}
                                            </h3>
                                            <p className="text-white/40 text-sm font-medium tracking-tight line-clamp-1">
                                                {redirectingTo === option.id ? `Opening ${option.label} ` : option.description}
                                            </p>
                                        </div>

                                        {/* Tiered Decorative Lines */}
                                        <div className="absolute top-6 right-6 flex flex-col items-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                            <div className={cn("h-[1px] bg-primary/40 transition-all duration-500", redirectingTo === option.id ? "w-12 animate-pulse" : "w-8 group-hover:w-12")} />
                                            <div className={cn("h-[1px] bg-primary transition-all duration-500 delay-75", redirectingTo === option.id ? "w-8 animate-pulse" : "w-5 group-hover:w-8")} />
                                        </div>

                                        <div className={cn(
                                            "transition-all duration-300",
                                            redirectingTo === option.id ? "opacity-100 scale-125 translate-x-0" : "opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
                                        )}>
                                            {redirectingTo === option.id ? (
                                                <div className="flex gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                                                </div>
                                            ) : (
                                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            )}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-8 bg-white/[0.01] border-t border-white/5 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
                                    Kayode Olalere &copy; 2026
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
