"use client";

import { useState, useEffect, useCallback } from "react";

const CHARS = "!@#$%^&*()_+{}:\"<>?,./;'[]\\=-~`|";

interface TextScrambleProps {
    text: string;
    autostart?: boolean;
    duration?: number;
    delay?: number;
}

export function TextScramble({ text, autostart = true, duration = 1500, delay = 0 }: TextScrambleProps) {
    const [displayText, setDisplayText] = useState(text);
    const [isAnimating, setIsAnimating] = useState(false);

    const scramble = useCallback(() => {
        if (isAnimating) return;
        setIsAnimating(true);

        let frame = 0;
        const totalFrames = duration / 16;
        const textLength = text.length;

        const interval = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            const revealAt = Math.floor(progress * textLength);

            const scrambled = text
                .split("")
                .map((char, i) => {
                    if (char === " ") return " ";

                    // Already settled characters
                    if (i < revealAt) return char;

                    // Currently "typing" character (the one at revealAt or revealAt+1)
                    // We give it a brief flicker of 2-3 frames before it settles
                    if (i === revealAt) {
                        return CHARS[Math.floor(Math.random() * CHARS.length)];
                    }

                    // Not yet reached characters are invisible (or hidden)
                    return "";
                })
                .join("");

            setDisplayText(scrambled);

            if (frame >= totalFrames) {
                setDisplayText(text);
                setIsAnimating(false);
                clearInterval(interval);
            }
        }, 16);

        return () => clearInterval(interval);
    }, [text, duration, isAnimating]);

    useEffect(() => {
        if (autostart) {
            const timer = setTimeout(scramble, delay);
            return () => clearTimeout(timer);
        }
    }, [autostart, scramble, delay]);

    return <span className="font-mono">{displayText}</span>;
}
