export default function Footer() {
  return (
    <footer className="border-t border-marquee-line mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="bulb-row" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="bulb"
              style={{ animationDelay: `${i * 0.25}s` }}
            />
          ))}
        </div>
        <p className="text-xs text-marquee-textDim font-mono">
          Marquee — AI recommendations can be wrong. Verify before you decide.
        </p>
      </div>
    </footer>
  );
}
