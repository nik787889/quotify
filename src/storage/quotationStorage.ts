import AsyncStorage from '@react-native-async-storage/async-storage';
import { Quotation } from '../types';

const STORAGE_KEY = '@ganesh_interiors:quotations';

/** Generate a simple unique id without external libraries */
export const generateId = (): string =>
    `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// ─── CRUD Operations ──────────────────────────────────────────────────────────

export const getAllQuotations = async (): Promise<Quotation[]> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Quotation[]) : [];
    } catch {
        return [];
    }
};

export const getQuotationById = async (id: string): Promise<Quotation | null> => {
    const all = await getAllQuotations();
    return all.find((q) => q.id === id) ?? null;
};

export const saveQuotation = async (quotation: Quotation): Promise<void> => {
    const all = await getAllQuotations();
    const idx = all.findIndex((q) => q.id === quotation.id);
    if (idx >= 0) {
        all[idx] = quotation;
    } else {
        all.unshift(quotation);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
};

export const deleteQuotation = async (id: string): Promise<void> => {
    const all = await getAllQuotations();
    const updated = all.filter((q) => q.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// ─── Computation helpers ──────────────────────────────────────────────────────

export const recalculateProduct = (product: import('../types').Product): import('../types').Product => {
    const pType = product.pricingType || 'sqft';
    const rate = parseFloat(product.ratePerSqft) || 0;

    if (pType === 'fixed') {
        let totalAmount = rate;
        const fSqft = parseFloat(product.fixedTotalSqft || '') || 0;
        const fRate = parseFloat(product.fixedRatePerSqft || '') || 0;

        // If both are entered and greater than 0, calculate total amount automatically
        if (fSqft > 0 && fRate > 0) {
            totalAmount = fSqft * fRate;
            return {
                ...product,
                totalSqft: fSqft,
                totalAmount,
                quantity: '1',
                ratePerSqft: totalAmount.toString() // Update 'Total Amount' field text automatically
            };
        }

        return { ...product, totalSqft: fSqft > 0 ? fSqft : 0, totalAmount, quantity: '1' };
    }

    if (pType === 'item') {
        const qty = parseFloat(product.quantity || '1') || 0;
        const totalAmount = qty * rate;
        return { ...product, totalSqft: 0, totalAmount };
    }

    // Default 'sqft'
    const rows = product.rows.map((row) => {
        const w = parseFloat(row.width) || 0;
        const l = parseFloat(row.length) || 0;
        const q = parseFloat(row.qty) || 0;
        return { ...row, sqft: w * l * q };
    });
    const totalSqft = rows.reduce((s, r) => s + r.sqft, 0);
    const totalAmount = totalSqft * rate;
    return { ...product, rows, totalSqft, totalAmount };
};

export const recalculateQuotation = (q: Quotation): Quotation => {
    const products = q.products.map(recalculateProduct);
    const grandTotal = products.reduce((s, p) => s + p.totalAmount, 0);
    return { ...q, products, grandTotal };
};
