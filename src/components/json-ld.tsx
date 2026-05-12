/**
 * JSON-LD structured data for AIO/SEO.
 *
 * Per analytics-monitoring-design: SoftwareApplication + FAQPage are the two
 * highest-leverage schemas for LLM citation rate.
 */

const SITE_URL = "https://getpodprofit.com";

export function SoftwareApplicationJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PODProfit",
    description:
      "Vendor-neutral, multi-currency, share-able profit calculator for Print-on-Demand sellers (Etsy, Shopify, Printful, Printify).",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description: "Full calculator + share-able URLs, no signup required.",
      },
      {
        "@type": "Offer",
        name: "Pro Monthly",
        price: "9",
        priceCurrency: "USD",
        description: "Saved calculations, multi-store dashboards, exports.",
      },
      {
        "@type": "Offer",
        name: "Pro Annual",
        price: "79",
        priceCurrency: "USD",
        description: "Pro features billed annually (save vs monthly).",
      },
      {
        "@type": "Offer",
        name: "Lifetime",
        price: "149",
        priceCurrency: "USD",
        description: "One-time payment, lifetime access. Limited to 100 customers.",
        availability: "https://schema.org/LimitedAvailability",
        inventoryLevel: { "@type": "QuantitativeValue", value: 92 },
      },
    ],
    creator: {
      "@type": "Person",
      name: "Satsuki Okazaki",
      url: "https://getpodprofit.com",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

/**
 * Person + Organization graph for the /about page.
 *
 * Required by Stripe risk review for public founder identity (E-E-A-T) and
 * also feeds Google sitelinks + AI-overview citations. Keep founder.url and
 * organization.url anchored to canonical https://getpodprofit.com URLs so the
 * @id references stay stable.
 */
export function AboutPersonOrgJsonLd({
  githubUrl,
}: {
  githubUrl: string;
}) {
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/about#founder`,
        name: "Satsuki Okazaki",
        url: `${SITE_URL}/about`,
        // X (Twitter) is intentionally absent from `sameAs`.
        // Per memory `user_founder_identity` (2026-05-12) the active X
        // handle is `@lastarna` — a Japanese-language personal account
        // mismatched with PODProfit's English-speaking POD-seller
        // audience. The previously-listed `https://x.com/o_satsuki` URL
        // pointed at a Reddit handle that is permanently banned (Reddit
        // 2026-05-04) and was never an actual X account; surfacing it
        // in JSON-LD let knowledge-graph crawlers resolve a dead link.
        // GitHub is the only first-party identity surface we want
        // crawlers to follow from this page.
        sameAs: [githubUrl],
        jobTitle: "Founder",
        worksFor: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "PODProfit",
        url: SITE_URL,
        founder: { "@id": `${SITE_URL}/about#founder` },
        address: {
          "@type": "PostalAddress",
          streetAddress: "5-3 Maruyama-cho, 8F MIEUX Shibuya Building",
          addressLocality: "Shibuya-ku",
          addressRegion: "Tokyo",
          postalCode: "150-0044",
          addressCountry: "JP",
        },
        contactPoint: {
          "@type": "ContactPoint",
          // Email-only ContactPoint on purpose. Per memory
          // `feedback_contact_channel_policy` (2026-05-12) the support
          // phone is only published on /legal/tokushoho (statutory
          // disclosure). Exposing `telephone` here would surface a
          // call button in Google's knowledge panel and conflict with
          // the email-first SLA, so the field is omitted along with
          // `areaServed`, `availableLanguage`, and `hoursAvailable`
          // (those properties only make sense alongside a phone).
          email: "hello@getpodprofit.com",
          contactType: "customer support",
        },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export function FaqPageJsonLd(items: Array<{ q: string; a: string }>) {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.a,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

/**
 * Product + Offers schema for the pricing-style pages.
 *
 * Why a dedicated schema instead of stretching the existing
 * SoftwareApplication offers list?
 *
 *   - SoftwareApplication.offers is the authoritative *application-level*
 *     pricing description, but Google's pricing-page rich result requires
 *     `@type: Product` with a price-bearing `offers` block — different
 *     surface, different rich result.
 *   - AIO citation rate is meaningfully better when each page surfaces a
 *     schema that exactly matches its visible content (per
 *     analytics-monitoring-design.md). A pricing page citing only
 *     SoftwareApplication is "metadata-correct, content-mismatched".
 *
 * The shape mirrors https://developers.google.com/search/docs/appearance/structured-data/product
 * with `aggregateRating` deliberately omitted (we have zero reviews
 * pre-launch and faking the count would be a Google-quality penalty).
 */
export interface ProductOffer {
  /** Plan display name (e.g. "Pro Monthly"). */
  name: string;
  /** Decimal string — `"9"` not `9` per schema.org guidance. */
  price: string;
  priceCurrency: "USD";
  /** Schema.org availability URL — `InStock` / `LimitedAvailability` / `SoldOut`. */
  availability:
    | "https://schema.org/InStock"
    | "https://schema.org/LimitedAvailability"
    | "https://schema.org/SoldOut"
    | "https://schema.org/PreOrder";
  /** Optional inventory hint (Lifetime seats remaining). */
  inventoryLevel?: number;
  /** Optional ISO date for `priceValidUntil` — Pro launch date for pre-orders. */
  priceValidUntil?: string;
}

export function ProductOffersJsonLd({
  productName,
  productDescription,
  productUrl,
  offers,
}: {
  productName: string;
  productDescription: string;
  productUrl: string;
  offers: ProductOffer[];
}) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    description: productDescription,
    url: productUrl,
    brand: { "@type": "Brand", name: "PODProfit" },
    offers: offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      availability: offer.availability,
      url: productUrl,
      ...(offer.inventoryLevel !== undefined
        ? {
            inventoryLevel: {
              "@type": "QuantitativeValue",
              value: offer.inventoryLevel,
            },
          }
        : {}),
      ...(offer.priceValidUntil
        ? { priceValidUntil: offer.priceValidUntil }
        : {}),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
