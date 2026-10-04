"use client";

import { useState, useEffect } from "react";

const CHARS = "!@#$%^&*()_+{}:\"<>?,./;'[]\\=-~`|";

interface TextScrambleProps {
    text: string;
    autostart?: boolean;
    duration?: number;
    delay?: number;
    className?: string;
}

export function TextScramble({ text, autostart = true, duration = 1500, delay = 0, className }: TextScrambleProps) {
    const [displayText, setDisplayText] = useState(text);

    useEffect(() => {
        if (!autostart) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (reducedMotion.matches) {
            setDisplayText(text);
            return;
        }

        let interval: NodeJS.Timeout;

        const startTimer = setTimeout(() => {
            let frame = 0;
            const totalFrames = duration / 16;
            const textLength = text.length;

            interval = setInterval(() => {
                frame++;
                const progress = frame / totalFrames;
                const revealAt = Math.floor(progress * textLength);

                const scrambled = text
                    .split("")
                    .map((char, i) => {
                        if (char === " ") return " ";
                        if (i < revealAt) return char;
                        if (i === revealAt) {
                            return CHARS[Math.floor(Math.random() * CHARS.length)];
                        }
                        return "";
                    })
                    .join("");

                setDisplayText(scrambled);

                if (frame >= totalFrames) {
                    setDisplayText(text);
                    clearInterval(interval);
                }
            }, 16);
        }, delay);

        return () => {
            clearTimeout(startTimer);
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [text, autostart, duration, delay]);

    return <span className={className}>{displayText}</span>;
}
