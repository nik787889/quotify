// ─── Core Data Interfaces ────────────────────────────────────────────────────

/**
 * A single dimension row inside a Product.
 * Width × Length × Qty = Total Sq.ft
 */
export interface DimensionRow {
  id: string;
  width: string;   // user input (string to support partial typing)
  length: string;
  qty: string;
  sqft: number;    // computed: width * length * qty
}

export type PricingType = 'sqft' | 'item' | 'fixed';

/**
 * A Product inside a Quotation.
 * It groups multiple DimensionRows under one Sr No + Product Name.
 */
export interface Product {
  id: string;
  srNo: number;
  pricingType?: PricingType; // default 'sqft'
  name: string;          // e.g. "Partition", "Toughen Glass"
  description: string;   // e.g. "18mm thick plywood"
  ratePerSqft: string;   // user input string (used as price/sqft, price/item, or fixed amount)

  // For 'sqft' type
  rows: DimensionRow[];
  totalSqft: number;     // sum of row.sqft

  // For 'item' type
  quantity?: string;     // user input string for item quantity

  totalAmount: number;   // computed based on pricingType
}

/**
 * Top-level Quotation document.
 * Stored as a JSON blob in AsyncStorage.
 */
export interface Quotation {
  id: string;
  companyName: string;      // "Ganesh Interiors"
  quotationFor: string;     // "Words Worth"
  address: string;          // "204 Silicon Tower…"
  projectName: string;      // "Office Furniture Work - 2nd Floor"
  date: string;             // ISO date string
  products: Product[];
  grandTotal: number;       // sum of product.totalAmount
}

// ─── Navigation Param Lists ───────────────────────────────────────────────────

export type RootStackParamList = {
  Home: undefined;
  QuotationEditor: { quotationId?: string }; // undefined = new
  ProductEditor: { quotationId: string; productId?: string };
  QuotationPreview: { quotationId: string };
};
