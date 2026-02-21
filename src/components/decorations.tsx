export function DecorationsDots({ className }: { className?: string }) {
    return (
        <svg width="84" height="84" viewBox="0 0 84 84" fill="none" className={className}>
            <pattern id="dot-pattern" x="0" y="0" width="21" height="21" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="2" fill="#FFFFFF" fillOpacity="0.55" />
            </pattern>
            <rect width="84" height="84" fill="url(#dot-pattern)" />
        </svg>
    );
}

export function DecorationsLogo({ className }: { className?: string }) {
    return (
        <svg width="64" height="64" viewBox="0 0 50 50" fill="none" className={className}>
            <path d="M10 20 L25 5 L40 20" stroke="#7A1118" strokeWidth="2" fill="none" />
            <path d="M10 30 L25 45 L40 30" stroke="#7A1118" strokeWidth="2" fill="none" />
            <circle cx="25" cy="25" r="5" fill="#7A1118" />
        </svg>
    );
}

export function DecorationsSquareOutline({ className }: { className?: string }) {
    return (
        <svg width="155" height="155" viewBox="0 0 155 155" fill="none" className={className}>
            <rect x="0.5" y="0.5" width="154" height="154" stroke="#FFFFFF" strokeOpacity="0.45" />
        </svg>
    );
}
