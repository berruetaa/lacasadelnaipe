import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import publicIndex from "../../../../../../data/catalog/public-index.json";
import redirectIndex from "../../../../../../data/catalog/redirect-index.json";

type PublicReference = (typeof publicIndex)[number];
type ReferenceRedirect = {
  slug: string;
  publicId: string;
  targetSlug: string;
  targetPublicId: string;
};
const referenceRedirects = redirectIndex as ReferenceRedirect[];

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

const attributeLabels: Record<string, string> = {
  title: "Título",
  suitSystem: "Sistema de palos",
  originCountry: "País de origen",
  originRegion: "Región de origen",
  dateLabel: "Datación",
  catalogCodes: "Código de catálogo",
  dimensions: "Dimensiones",
  material: "Material",
  backDesign: "Reverso",
  manufacturer: "Fabricante",
  printer: "Impresor",
  publisher: "Editor",
  brand: "Marca",
  regionalVariant: "Variante regional",
  pattern: "Patrón",
  editionCode: "Código de edición",
  cardCount: "Cantidad de cartas",
};

const certaintyLabels: Record<string, string> = {
  confirmed: "Confirmado",
  highly_probable: "Altamente probable",
  probable: "Probable",
  possible: "Posible",
  unknown: "Desconocido",
};

export function generateStaticParams() {
  return [
    ...publicIndex.map((reference) => ({ slug: reference.slug })),
    ...referenceRedirects.map((reference) => ({ slug: reference.slug })),
  ];
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const reference = publicIndex.find((entry) => entry.slug === slug);
    return { title: reference?.title ?? "Referencia de catálogo" };
  });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-[var(--line)] py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className="leading-7">{children}</dd>
    </div>
  );
}

function valueLabel(value: unknown) {
  if (value === null || value === undefined) return "Sin dato";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

export default async function CatalogReferencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const reference = publicIndex.find((entry) => entry.slug === slug) as PublicReference | undefined;
  const mergedReference = referenceRedirects.find((entry) => entry.slug === slug);
  if (mergedReference) redirect(`/catalogo/${mergedReference.targetSlug}`);
  if (!reference) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 sm:px-10 lg:px-14">
      <header className="flex items-center justify-between border-b border-[var(--line)] pb-5 text-sm">
        <Link className="font-semibold tracking-[0.16em] uppercase" href="/">
          LCDN
        </Link>
        <Link
          className="text-[var(--muted)] underline decoration-[var(--line)] underline-offset-4"
          href="/catalogo"
        >
          Catálogo público
        </Link>
      </header>

      <article className="py-14 sm:py-20">
        <p className="mb-4 font-mono text-xs text-[var(--muted)]">{reference.publicId}</p>
        <h1 className="max-w-4xl text-5xl leading-[0.97] font-semibold tracking-[-0.04em] sm:text-7xl">
          {reference.title}
        </h1>
        <p className="mt-5 text-lg text-[var(--accent)]">
          {suitLabels[reference.suitSystem] ?? reference.suitSystem}
          {reference.dateLabel ? ` · ${reference.dateLabel}` : ""}
        </p>

        <dl className="mt-12 border-b border-[var(--line)]">
          <Field label="Fabricante">{reference.manufacturer ?? "No determinado"}</Field>
          <Field label="Impresor">{reference.printer ?? "No determinado"}</Field>
          <Field label="Editor">{reference.publisher ?? "No determinado"}</Field>
          <Field label="País de origen">{reference.originCountry ?? "No determinado"}</Field>
          <Field label="Región">{reference.originRegion ?? "No determinada"}</Field>
          <Field label="Patrón">{reference.pattern ?? "No determinado"}</Field>
          <Field label="Variante regional">{reference.regionalVariant ?? "No determinada"}</Field>
          <Field label="Composición">
            {reference.cardCount ? `${reference.cardCount} cartas` : "No determinada"}
            {reference.cardsPerSuit ? ` · ${reference.cardsPerSuit} por palo` : ""}
          </Field>
          <Field label="Dimensiones">
            {reference.cardWidthMm && reference.cardHeightMm
              ? `${reference.cardWidthMm} × ${reference.cardHeightMm} mm`
              : "No determinadas"}
          </Field>
          <Field label="Material">{reference.material ?? "No determinado"}</Field>
          <Field label="Reverso">{reference.backDesign ?? "No descrito"}</Field>
          <Field label="Códigos de catálogo">
            {reference.catalogCodes.length
              ? reference.catalogCodes.map((code) => (
                  <p key={`${code.authority}:${code.code}`}>
                    {code.authority}: {code.code}
                  </p>
                ))
              : "Sin código registrado"}
          </Field>
        </dl>

        {reference.notes && (
          <section className="mt-12 max-w-3xl">
            <h2 className="text-2xl font-semibold">Nota de revisión</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{reference.notes}</p>
          </section>
        )}

        <section className="mt-14">
          <h2 className="text-2xl font-semibold">Afirmaciones y certeza</h2>
          <p className="mt-2 max-w-2xl leading-7 text-[var(--muted)]">
            La certeza se asigna a cada dato. La ficha enlaza el pasaje de la fuente institucional
            que respalda cada afirmación.
          </p>
          <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {reference.claims.map((claim) => (
              <li
                className="grid gap-2 py-5 sm:grid-cols-[12rem_1fr] sm:gap-6"
                key={`${claim.attribute}-${claim.sourceIds.join("-")}`}
              >
                <p className="text-sm text-[var(--muted)]">
                  {attributeLabels[claim.attribute] ?? claim.attribute}
                </p>
                <div>
                  <p className="leading-7">{valueLabel(claim.value)}</p>
                  <p className="mt-1 text-sm text-[var(--accent)]">
                    {certaintyLabels[claim.certainty] ?? claim.certainty}
                  </p>
                  {claim.locator && (
                    <p className="mt-1 text-sm text-[var(--muted)]">{claim.locator}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {claim.sourceIds.map((sourceId) => {
                      const source = reference.sources.find((entry) => entry.id === sourceId);
                      return source ? (
                        <a
                          className="underline decoration-[var(--line)] underline-offset-4"
                          href={source.url}
                          key={sourceId}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {source.title}
                        </a>
                      ) : null;
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold">Fuentes</h2>
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {reference.sources.map((source) => (
              <li className="py-5" key={source.id}>
                <a
                  className="font-semibold underline decoration-[var(--line)] underline-offset-4"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.title}
                </a>
                <p className="mt-1 text-sm text-[var(--muted)]">{source.organization}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{source.locator}</p>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <footer className="mt-auto border-t border-[var(--line)] py-7 text-sm text-[var(--muted)]">
        La Casa del Naipe · Cada dato conserva su fuente y su grado de certeza en el registro
        editorial.
      </footer>
    </main>
  );
}
