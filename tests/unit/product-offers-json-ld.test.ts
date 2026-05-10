import { describe, expect, it } from "vitest";
import { ProductOffersJsonLd, type ProductOffer } from "@/components/json-ld";

/**
 * `ProductOffersJsonLd` is a server component returning a single <script>
 * with `dangerouslySetInnerHTML`. We exercise the contract by reading the
 * stringified JSON-LD out of `props` — the same path Google's structured
 * data parser will take when it reads the rendered HTML.
 *
 * Asserting the structured shape (not the textual layout) keeps the test
 * stable across React renderer formatting changes.
 */
function extractJsonLd(element: ReturnType<typeof ProductOffersJsonLd>): unknown {
  // React server components return a `ReactElement` whose `props.dangerouslySetInnerHTML.__html`
  // is the stringified JSON we emit.
  const props = (element as { props: { dangerouslySetInnerHTML: { __html: string } } }).props;
  return JSON.parse(props.dangerouslySetInnerHTML.__html);
}

describe("ProductOffersJsonLd", () => {
  it("emits the schema.org Product type with brand + url", () => {
    const offers: ProductOffer[] = [
      {
        name: "Lifetime",
        price: "149",
        priceCurrency: "USD",
        availability: "https://schema.org/LimitedAvailability",
        inventoryLevel: 92,
      },
    ];
    const json = extractJsonLd(
      ProductOffersJsonLd({
        productName: "PODProfit Lifetime",
        productDescription: "Test description",
        productUrl: "https://getpodprofit.com/lifetime",
        offers,
      }),
    ) as Record<string, unknown>;

    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@type"]).toBe("Product");
    expect(json.name).toBe("PODProfit Lifetime");
    expect(json.url).toBe("https://getpodprofit.com/lifetime");
    expect(json.brand).toEqual({ "@type": "Brand", name: "PODProfit" });
  });

  it("encodes inventoryLevel as a QuantitativeValue (Google's expected shape)", () => {
    const json = extractJsonLd(
      ProductOffersJsonLd({
        productName: "Lifetime",
        productDescription: "x",
        productUrl: "https://getpodprofit.com/lifetime",
        offers: [
          {
            name: "Lifetime",
            price: "149",
            priceCurrency: "USD",
            availability: "https://schema.org/LimitedAvailability",
            inventoryLevel: 7,
          },
        ],
      }),
    ) as { offers: Array<Record<string, unknown>> };

    expect(json.offers[0].inventoryLevel).toEqual({
      "@type": "QuantitativeValue",
      value: 7,
    });
  });

  it("omits inventoryLevel when not provided (avoids Google warning for empty QV)", () => {
    const json = extractJsonLd(
      ProductOffersJsonLd({
        productName: "Pricing",
        productDescription: "x",
        productUrl: "https://getpodprofit.com/pricing",
        offers: [
          {
            name: "Pro Monthly",
            price: "9",
            priceCurrency: "USD",
            availability: "https://schema.org/PreOrder",
            priceValidUntil: "2026-06-09",
          },
        ],
      }),
    ) as { offers: Array<Record<string, unknown>> };

    expect(json.offers[0].inventoryLevel).toBeUndefined();
    expect(json.offers[0].priceValidUntil).toBe("2026-06-09");
  });

  it("uses the schema.org URL form for availability (full IRI, not bare keyword)", () => {
    // Google rejects `availability: "InStock"` — must be the full IRI.
    const json = extractJsonLd(
      ProductOffersJsonLd({
        productName: "Pricing",
        productDescription: "x",
        productUrl: "https://getpodprofit.com/pricing",
        offers: [
          {
            name: "Free",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
        ],
      }),
    ) as { offers: Array<Record<string, unknown>> };

    expect(json.offers[0].availability).toBe("https://schema.org/InStock");
  });

  it("renders prices as decimal strings (per schema.org spec, not numbers)", () => {
    // Google's structured-data tool emits a warning when `price` is a JSON
    // number rather than a string — we keep the string form contract here.
    const json = extractJsonLd(
      ProductOffersJsonLd({
        productName: "Pricing",
        productDescription: "x",
        productUrl: "https://getpodprofit.com/pricing",
        offers: [
          {
            name: "Lifetime",
            price: "149",
            priceCurrency: "USD",
            availability: "https://schema.org/LimitedAvailability",
          },
        ],
      }),
    ) as { offers: Array<Record<string, unknown>> };

    expect(json.offers[0].price).toBe("149");
    expect(typeof json.offers[0].price).toBe("string");
  });
});
