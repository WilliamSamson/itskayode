import { cn } from "@/lib/utils";

export function DoodleSquiggle({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 20"
            className={cn("text-accent-red w-24", className)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="M0 10 Q 12.5 0, 25 10 T 50 10 T 75 10 T 100 10" />
        </svg>
    );
}

export function DoodleLoop({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn("text-accent-red w-24", className)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="M20 80 Q 50 10, 80 80 T 20 80" />
        </svg>
    );
}

export function DoodleStar({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={cn("text-text w-8", className)}
            fill="currentColor"
        >
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
    );
}
