import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  consumeSignupAttribution,
  extractReferrerHost,
  stashSignupAttribution,
} from "@/lib/analytics/signup-attribution";

/**
 * The signup-attribution module is browser-only, so we install a minimal
 * sessionStorage shim on globalThis for these tests (vitest's default
 * environment is "node" — see `vitest.config.ts`). Keeping the shim local
 * avoids flipping the global env to jsdom for one feature.
 */

interface TestStorage {
  data: Map<string, string>;
}

function installSessionStorage(): TestStorage {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  // jsdom-like minimal Window
  (globalThis as unknown as { window: { sessionStorage: typeof shim } }).window = {
    sessionStorage: shim,
  };
  return { data: store };
}

function uninstallSessionStorage() {
  delete (globalThis as unknown as { window?: unknown }).window;
}

describe("extractReferrerHost", () => {
  it("returns null for empty / nullish input", () => {
    expect(extractReferrerHost(null)).toBeNull();
    expect(extractReferrerHost(undefined)).toBeNull();
    expect(extractReferrerHost("")).toBeNull();
  });

  it("returns the host portion of a normal URL", () => {
    expect(extractReferrerHost("https://www.reddit.com/r/printondemand/")).toBe(
      "www.reddit.com",
    );
    expect(extractReferrerHost("https://news.ycombinator.com/item?id=42")).toBe(
      "news.ycombinator.com",
    );
  });

  it("preserves the port when present", () => {
    expect(extractReferrerHost("http://localhost:3000/")).toBe("localhost:3000");
  });

  it("returns null for a malformed URL", () => {
    expect(extractReferrerHost("not a url")).toBeNull();
  });

  it("caps host at 64 chars (DB column constraint)", () => {
    const longHost = "a".repeat(80) + ".example.com";
    const url = `https://${longHost}/`;
    const result = extractReferrerHost(url);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(64);
  });
});

describe("stash + consume signup attribution", () => {
  beforeEach(() => {
    installSessionStorage();
  });
  afterEach(() => {
    uninstallSessionStorage();
  });

  it("round-trips method + host, then clears the stash", () => {
    stashSignupAttribution("magic_link", "https://www.indiehackers.com/post/x");
    const first = consumeSignupAttribution();
    expect(first?.signup_method).toBe("magic_link");
    expect(first?.signup_referrer_host).toBe("www.indiehackers.com");

    // Second consume returns null — the stash is single-use.
    const second = consumeSignupAttribution();
    expect(second).toBeNull();
  });

  it("preserves null referrer when document.referrer is empty", () => {
    stashSignupAttribution("google", null);
    const result = consumeSignupAttribution();
    expect(result?.signup_method).toBe("google");
    expect(result?.signup_referrer_host).toBeNull();
  });

  it("returns null when the stash is older than the TTL", () => {
    stashSignupAttribution("magic_link", "https://www.example.com");
    const w = (globalThis as unknown as {
      window: { sessionStorage: { setItem: (k: string, v: string) => void } };
    }).window;
    // Manually rewrite stashed_at to 31 minutes ago.
    w.sessionStorage.setItem(
      "podprofit:signup-attribution",
      JSON.stringify({
        signup_method: "magic_link",
        signup_referrer_host: "www.example.com",
        stashed_at: Date.now() - 31 * 60 * 1000,
      }),
    );
    expect(consumeSignupAttribution()).toBeNull();
  });

  it("rejects malformed payloads (defensive parsing)", () => {
    const w = (globalThis as unknown as {
      window: { sessionStorage: { setItem: (k: string, v: string) => void } };
    }).window;
    w.sessionStorage.setItem("podprofit:signup-attribution", "{not json");
    expect(consumeSignupAttribution()).toBeNull();
  });

  it("rejects unknown signup_method values", () => {
    const w = (globalThis as unknown as {
      window: { sessionStorage: { setItem: (k: string, v: string) => void } };
    }).window;
    w.sessionStorage.setItem(
      "podprofit:signup-attribution",
      JSON.stringify({
        signup_method: "carrier_pigeon",
        signup_referrer_host: null,
        stashed_at: Date.now(),
      }),
    );
    expect(consumeSignupAttribution()).toBeNull();
  });
});
