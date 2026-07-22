import Link from "next/link";

export function MediaShell({
  title,
  eyebrow,
  description,
  children,
  backHref,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
  backHref: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-marquee-gold">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">{title}</h1>
          <p className="mt-3 max-w-2xl text-marquee-textDim">{description}</p>
        </div>
        <Link href={backHref} className="rounded border border-marquee-line px-4 py-2 text-sm text-marquee-text hover:border-marquee-gold">
          Back to hub
        </Link>
      </div>
      {children}
    </div>
  );
}
