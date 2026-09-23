"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type publicIndex from "../../../../../data/catalog/public-index.json";

type PublicReference = (typeof publicIndex)[number];

const suitLabels: Record<string, string> = {
  spanish: "Sistema español",
  italian: "Sistema italiano",
  french: "Sistema francés",
  german: "Sistema alemán",
  swiss: "Sistema suizo",
  portuguese_historical: "Sistema portugués histórico",
  hanafuda: "Hanafuda",
  tarot_game: "Tarot",
  regional: "Regional",
  hybrid: "Híbrido",
  other: "Otro sistema",
  unknown: "Sistema sin determinar",
};

function normalized(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export default function CatalogBrowser({ references }: { references: PublicReference[] }) {
  const [query, setQuery] = useState("");
  const [suitSystem, setSuitSystem] = useState("all");
  const visibleReferences = useMemo(() => {
    const search = normalized(query.trim());
    return references.filter((reference) => {
      if (suitSystem !== "all" && reference.suitSystem !== suitSystem) return false;
      if (!search) return true;
      const searchable = normalized(
        [
          reference.title,
          ...reference.aliases,
          reference.publicId,
          reference.manufacturer ?? "",
          reference.pattern ?? "",
          reference.regionalVariant ?? "",
          reference.dateLabel ?? "",
          ...reference.catalogCodes.map((code) => code.code),
        ].join(" "),
      );
      return searchable.includes(search);
    });
  }, [query, references, suitSystem]);
  const systems = [...new Set(references.map((reference) => reference.suitSystem))];

  return (
    <section className="pb-16">
      <div className="mb-8 grid gap-4 rounded-sm border border-[var(--line)] bg-white/35 p-4 sm:grid-cols-[1fr_14rem] sm:p-5">
        <label className="block text-sm font-semibold">
          Buscar en las fichas
          <input
            className="mt-2 block w-full rounded-sm border border-[var(--line)] bg-[var(--paper)] px-3 py-3 font-normal outline-none focus:border-[var(--accent)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, fabricante, año, código…"
            type="search"
            value={query}
          />
        </label>
        <label className="block text-sm font-semibold">
          Sistema de palos
          <select
            className="mt-2 block w-full rounded-sm border border-[var(--line)] bg-[var(--paper)] px-3 py-3 font-normal outline-none focus:border-[var(--accent)]"
            onChange={(event) => setSuitSystem(event.target.value)}
            value={suitSystem}
          >
            <option value="all">Todos los sistemas</option>
            {systems.map((system) => (
              <option key={system} value={system}>
                {suitLabels[system] ?? system}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p aria-live="polite" className="mb-4 text-sm text-[var(--muted)]">
        {visibleReferences.length} {visibleReferences.length === 1 ? "referencia" : "referencias"}
      </p>

      {visibleReferences.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleReferences.map((reference) => (
            <article
              className="flex min-h-64 flex-col border border-[var(--line)] bg-white/25 p-5 sm:p-7"
              key={reference.publicId}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-mono text-xs text-[var(--muted)]">{reference.publicId}</p>
                <p className="text-right text-sm text-[var(--muted)]">
                  {reference.dateLabel ?? "Sin datación"}
                </p>
              </div>
              <h2 className="mt-6 text-2xl font-semibold leading-tight">
                <Link
                  className="decoration-[var(--line)] underline-offset-4 hover:underline"
                  href={`/catalogo/${reference.slug}`}
                >
                  {reference.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-[var(--accent)]">
                {suitLabels[reference.suitSystem] ?? reference.suitSystem}
                {reference.regionalVariant ? ` · ${reference.regionalVariant}` : ""}
              </p>
              <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-7 text-sm text-[var(--muted)]">
                {reference.manufacturer && <p>{reference.manufacturer}</p>}
                {reference.catalogCodes.map((code) => (
                  <p key={`${code.authority}:${code.code}`}>
                    {code.authority}: {code.code}
                  </p>
                ))}
              </div>
              <Link
                className="mt-6 self-start text-sm font-semibold underline decoration-[var(--line)] underline-offset-4"
                href={`/catalogo/${reference.slug}`}
              >
                Ver ficha y fuentes
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="border border-dashed border-[var(--line)] p-8 text-[var(--muted)]">
          No hay fichas que coincidan con esa búsqueda.
        </p>
      )}
    </section>
  );
}
