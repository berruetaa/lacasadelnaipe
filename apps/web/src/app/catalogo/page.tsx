import type { Metadata } from "next";
import publicIndex from "../../../../../data/catalog/public-index.json";
import CatalogBrowser from "./catalog-browser";

export const metadata: Metadata = {
  title: "Catálogo público",
  description: "Referencias documentadas de naipes con evidencia y enlaces a sus fuentes.",
};

export default function CatalogPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-14">
      <header className="flex items-center justify-between border-b border-[var(--line)] pb-5 text-sm">
        <a className="font-semibold tracking-[0.16em] uppercase" href="/">
          LCDN
        </a>
        <a
          className="text-[var(--muted)] underline decoration-[var(--line)] underline-offset-4"
          href="/"
        >
          La Casa del Naipe
        </a>
      </header>

      <section className="py-14 sm:py-20">
        <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
          Referencias verificadas
        </p>
        <h1 className="text-5xl leading-none font-semibold tracking-[-0.04em] sm:text-7xl">
          Catálogo público
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Cada ficha describe una referencia documental, no necesariamente un ejemplar que
          pertenezca a LCDN. Los registros pendientes de revisión no aparecen en esta lista.
        </p>
      </section>

      <CatalogBrowser references={publicIndex} />

      <footer className="mt-auto flex flex-col gap-2 border-t border-[var(--line)] py-7 text-sm text-[var(--muted)] sm:flex-row sm:justify-between">
        <p>La Casa del Naipe · Maldonado, Uruguay</p>
        <a className="underline decoration-[var(--line)] underline-offset-4" href="/">
          Volver al inicio
        </a>
      </footer>
    </main>
  );
}
