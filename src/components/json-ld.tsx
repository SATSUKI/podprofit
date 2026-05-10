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
        sameAs: ["https://x.com/o_satsuki", githubUrl],
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
