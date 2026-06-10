/** Adapter surface for affiliate networks (spec §7.5). */

export interface CatalogItem {
  item_id: string;
  title: string;
  claim: string;
  endpoint: string;
  category: string;
  price_usd: number;
  /** Commission as a fraction of price (0.08 = 8%). */
  commission_pct: number;
}

export interface AffiliatePostback {
  item_id: string;
  order_ref: string;
  commission_usd: number;
  auction_id: string;
}

export interface AffiliateAdapter {
  readonly name: string;
  fetchCatalog(): Promise<CatalogItem[]>;
  /** Click-through URL carrying attribution context. */
  trackingUrl(item: CatalogItem, auctionId: string): string;
  parsePostback(body: unknown): AffiliatePostback;
}

/** Generic CSV catalogs: item_id,title,claim,endpoint,category,price_usd,commission_pct */
export function parseCatalogCsv(text: string): CatalogItem[] {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.split(",").map((h) => h.trim());
  const expected = [
    "item_id",
    "title",
    "claim",
    "endpoint",
    "category",
    "price_usd",
    "commission_pct",
  ];
  if (!header || expected.some((column, i) => header[i] !== column)) {
    throw new Error(`catalog CSV header must be: ${expected.join(",")}`);
  }
  return lines.slice(1).map((line, index) => {
    const cells = line.split(",").map((c) => c.trim());
    if (cells.length !== expected.length) {
      throw new Error(
        `catalog CSV row ${index + 2} has ${cells.length} cells, expected ${expected.length}`,
      );
    }
    const price = Number(cells[5]);
    const commission = Number(cells[6]);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(commission) || commission <= 0) {
      throw new Error(`catalog CSV row ${index + 2}: bad price/commission`);
    }
    return {
      item_id: cells[0]!,
      title: cells[1]!,
      claim: cells[2]!,
      endpoint: cells[3]!,
      category: cells[4]!,
      price_usd: price,
      commission_pct: commission,
    };
  });
}

export class CsvAdapter implements AffiliateAdapter {
  constructor(
    readonly name: string,
    private readonly csv: string,
    private readonly trackingBase: string,
  ) {}

  async fetchCatalog(): Promise<CatalogItem[]> {
    return parseCatalogCsv(this.csv);
  }

  trackingUrl(item: CatalogItem, auctionId: string): string {
    const url = new URL(this.trackingBase);
    url.searchParams.set("item", item.item_id);
    url.searchParams.set("auction", auctionId);
    return url.toString();
  }

  parsePostback(body: unknown): AffiliatePostback {
    const record = body as Record<string, unknown>;
    const postback = {
      item_id: String(record.item_id ?? ""),
      order_ref: String(record.order_ref ?? ""),
      commission_usd: Number(record.commission_usd ?? Number.NaN),
      auction_id: String(record.auction_id ?? ""),
    };
    if (!postback.item_id || !postback.order_ref || !Number.isFinite(postback.commission_usd)) {
      throw new Error("invalid affiliate postback");
    }
    return postback;
  }
}

/** Mock Impact-style adapter with a fixed retail catalog. */
export class MockImpactAdapter extends CsvAdapter {
  constructor() {
    super(
      "mock-impact",
      [
        "item_id,title,claim,endpoint,category,price_usd,commission_pct",
        "sku-101,Trail Backpack 40L,Durable 40L pack with lifetime warranty,https://shop.example.com/p/sku-101,commerce.retail,120,0.08",
        "sku-202,Espresso Grinder,Conical burr grinder for home baristas,https://shop.example.com/p/sku-202,commerce.retail,250,0.06",
        "sku-303,City Hotel Night,Central 4-star hotel night,https://travel.example.com/p/sku-303,commerce.travel,180,0.05",
      ].join("\n"),
      "https://track.impact.example/click",
    );
  }
}
