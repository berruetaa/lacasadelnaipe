const pillars = [
  {
    number: "01",
    title: "Catálogo",
    copy: "Documentar lo conocido, incluso cuando el ejemplar físico esté en otra colección.",
  },
  {
    number: "02",
    title: "Colección",
    copy: "Conservar objetos, procedencias y estados materiales sin borrar su historia.",
  },
  {
    number: "03",
    title: "Archivo",
    copy: "Reunir fuentes, fabricantes, catálogos, publicidad y conocimiento alrededor del naipe.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-14">
      <header className="flex items-center justify-between border-b border-[var(--line)] pb-5 text-sm">
        <p className="font-semibold tracking-[0.16em] uppercase">LCDN</p>
        <p className="text-[var(--muted)]">Maldonado, Uruguay · En construcción</p>
      </header>

      <section className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.35fr_0.65fr] lg:py-28">
        <div>
          <p className="mb-6 text-sm font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
            Archivo · Catálogo · Colección
          </p>
          <h1 className="max-w-4xl text-6xl leading-[0.92] font-semibold tracking-[-0.045em] sm:text-7xl lg:text-8xl">
            La Casa
            <br />
            del Naipe
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
            Un proyecto para identificar, conservar y documentar el naipe como objeto histórico,
            cultural y material. Empezamos por Uruguay.
          </p>
        </div>

        <aside className="border-l border-[var(--line)] pl-7">
          <p className="text-sm leading-6 text-[var(--muted)]">
            La colección recién empieza. El sistema no: cada pieza deberá poder explicar qué es,
            de dónde vino, qué sabemos de ella y con qué certeza lo sabemos.
          </p>
        </aside>
      </section>

      <section className="grid border-y border-[var(--line)] md:grid-cols-3">
        {pillars.map((pillar) => (
          <article
            className="border-b border-[var(--line)] py-8 md:border-r md:border-b-0 md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
            key={pillar.number}
          >
            <p className="mb-8 font-mono text-xs text-[var(--muted)]">{pillar.number}</p>
            <h2 className="text-2xl font-semibold">{pillar.title}</h2>
            <p className="mt-3 max-w-sm leading-7 text-[var(--muted)]">{pillar.copy}</p>
          </article>
        ))}
      </section>

      <footer className="flex flex-col gap-2 py-7 text-sm text-[var(--muted)] sm:flex-row sm:justify-between">
        <p>La Casa del Naipe</p>
        <p>El catálogo público abrirá cuando existan las primeras fichas verificadas.</p>
      </footer>
    </main>
  );
}
