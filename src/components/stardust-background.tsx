interface StarSpec {
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

const stars: StarSpec[] = Array.from({ length: 90 }, (_, i) => ({
  x: (i * 37) % 100,
  y: (i * 53) % 100,
  size: i % 11 === 0 ? 2 : 1,
  opacity: i % 7 === 0 ? 0.8 : 0.45,
  delay: (i % 9) * 0.35,
  duration: 2.8 + (i % 6) * 0.45
}));

export function StardustBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {stars.map((star, idx) => (
        <span
          key={`star-${idx}`}
          className="stardust-star absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`
          }}
        />
      ))}
    </div>
  );
}
