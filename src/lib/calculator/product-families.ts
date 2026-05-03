import type { ProductVariant, Vendor } from "@/types/calculator";
import { ALL_PRODUCTS } from "./load-products";

/**
 * A "product family" is the same physical product offered by multiple vendors.
 * E.g., "Bella+Canvas 3001 unisex t-shirt (white, M)" is the same garment whether
 * you order it from Printful or Printify — only the cost / shipping differs.
 *
 * The family ID strips the vendor prefix from the product ID.
 */
export interface ProductFamily {
  familyId: string;
  name: string;
  variants: Partial<Record<Vendor, ProductVariant>>;
}

export function getProductFamilies(): ProductFamily[] {
  const map = new Map<string, ProductFamily>();
  for (const p of ALL_PRODUCTS) {
    // ID format: `<vendor>-<rest>` → familyId is the `<rest>` part.
    const familyId = p.id.replace(/^(printful|printify)-/, "");
    if (!map.has(familyId)) {
      map.set(familyId, { familyId, name: p.name, variants: {} });
    }
    map.get(familyId)!.variants[p.vendor] = p;
  }
  return Array.from(map.values());
}

export function getFamilyById(familyId: string): ProductFamily | undefined {
  return getProductFamilies().find((f) => f.familyId === familyId);
}
