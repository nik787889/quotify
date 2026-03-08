import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { RootStackParamList, Quotation, Product } from '../types';
import { getQuotationById } from '../storage/quotationStorage';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'QuotationPreview'>;

const fmt = (n: number) =>
    n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

const fmtCur = (n: number) => '₹' + fmt(n);

export default function QuotationPreviewScreen({ navigation, route }: Props) {
    const { quotationId } = route.params;
    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

    useEffect(() => {
        getQuotationById(quotationId).then(setQuotation);
    }, [quotationId]);

    const handleExportPDF = async () => {
        if (!quotation) return;
        setExporting('pdf');
        try {
            await exportToPDF(quotation);
        } catch (e: any) {
            Alert.alert('Export Failed', e.message || 'Could not generate PDF.');
        } finally {
            setExporting(null);
        }
    };

    const handleExportExcel = async () => {
        if (!quotation) return;
        setExporting('excel');
        try {
            await exportToExcel(quotation);
        } catch (e: any) {
            Alert.alert('Export Failed', e.message || 'Could not generate file.');
        } finally {
            setExporting(null);
        }
    };

    if (!quotation) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* ── Company Header ── */}
                <View style={styles.companyHeader}>
                    <Text style={styles.companyName}>{quotation.companyName}</Text>
                    <Text style={styles.companySubtitle}>Quotation For: {quotation.quotationFor}</Text>
                    <Text style={styles.companySubtitle}>{quotation.address}</Text>
                    <Text style={styles.companyDate}>
                        {new Date(quotation.date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'long', year: 'numeric',
                        })}
                    </Text>
                </View>

                {/* ── Product Table (Excel-style) ── */}
                <View style={styles.tableCard}>
                    {/* Column header row */}
                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                        <Text style={[styles.th, { flex: 0.6 }]}>Sr{'\n'}No</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>Product</Text>
                        <Text style={[styles.th, { flex: 1.2 }]}>W (Ft)</Text>
                        <Text style={[styles.th, { flex: 1.2 }]}>L (Ft)</Text>
                        <Text style={[styles.th, { flex: 0.8 }]}>Qty</Text>
                        <Text style={[styles.th, { flex: 1.2 }]}>Sq.ft</Text>
                        <Text style={[styles.th, { flex: 1.2 }]}>Rate/Sq.ft</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>Amount</Text>
                    </View>

                    {quotation.products.map((product) => (
                        <ProductTableGroup key={product.id} product={product} />
                    ))}
                </View>

                {/* ── Grand Total ── */}
                <View style={styles.grandTotalCard}>
                    <Text style={styles.grandTotalLabel}>Grand Total</Text>
                    <Text style={styles.grandTotalValue}>{fmtCur(quotation.grandTotal)}</Text>
                </View>

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>
                    <StatTile
                        icon="inventory-2"
                        label="Products"
                        value={String(quotation.products.length)}
                    />
                    <StatTile
                        icon="table-rows"
                        label="Total Rows"
                        value={String(
                            quotation.products.reduce((s, p) => s + p.rows.length, 0)
                        )}
                    />
                    <StatTile
                        icon="straighten"
                        label="Total Sq.ft"
                        value={fmt(quotation.products.reduce((s, p) => s + p.totalSqft, 0))}
                    />
                </View>
            </ScrollView>

            {/* ── Sticky Export Bar ── */}
            <View style={styles.exportBar}>
                <TouchableOpacity
                    style={[styles.exportBtn, styles.pdfBtn]}
                    onPress={handleExportPDF}
                    disabled={exporting !== null}
                >
                    {exporting === 'pdf' ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <MaterialIcons name="picture-as-pdf" size={22} color={COLORS.white} />
                    )}
                    <Text style={styles.exportBtnText}>Export PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.exportBtn, styles.excelBtn]}
                    onPress={handleExportExcel}
                    disabled={exporting !== null}
                >
                    {exporting === 'excel' ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <MaterialCommunityIcons name="microsoft-excel" size={22} color={COLORS.white} />
                    )}
                    <Text style={styles.exportBtnText}>Export CSV/Excel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Product Table Group ──────────────────────────────────────────────────────

function ProductTableGroup({ product }: { product: Product }) {
    const pType = product.pricingType || 'sqft';

    return (
        <View>
            {product.rows.map((row, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === product.rows.length - 1;

                let w = row.width || '—';
                let l = row.length || '—';
                let q = row.qty || '—';
                let s = row.sqft > 0 ? fmt(row.sqft) : '—';
                let rate = product.ratePerSqft || '0';

                if (pType === 'fixed') {
                    w = '—';
                    l = '—';
                    q = '—';
                    s = '—';
                    rate = '—';
                } else if (pType === 'item') {
                    w = '—';
                    l = '—';
                    q = product.quantity || '1';
                    s = '—';
                }

                return (
                    <View
                        key={row.id}
                        style={[
                            styles.tableRow,
                            idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
                        ]}
                    >
                        <View style={[styles.tdCell, { flex: 0.6 }]}>
                            {isFirst ? (
                                <Text style={styles.tdSr}>{product.srNo}</Text>
                            ) : null}
                        </View>

                        <View style={[styles.tdCell, { flex: 1.5 }]}>
                            {isFirst ? (
                                <Text style={styles.tdProduct} numberOfLines={2}>
                                    {product.name}
                                </Text>
                            ) : null}
                        </View>

                        <Text style={[styles.td, { flex: 1.2 }]}>{w}</Text>
                        <Text style={[styles.td, { flex: 1.2 }]}>{l}</Text>
                        <Text
                            style={[
                                styles.td,
                                { flex: 0.8 },
                            ]}
                        >
                            {q}
                        </Text>
                        <Text style={[styles.td, { flex: 1.2 }]}>
                            {s}
                        </Text>

                        {/* Rate and Amount only shown on last row of product group */}
                        {isLast ? (
                            <>
                                <Text style={[styles.td, styles.tdTotal, { flex: 1.2 }]}>
                                    {pType === 'fixed' ? '—' : `₹${rate}`}
                                </Text>
                                <Text style={[styles.td, styles.tdAmount, { flex: 1.5 }]}>
                                    ₹{fmt(product.totalAmount)}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={[styles.td, { flex: 1.2 }]}></Text>
                                <Text style={[styles.td, { flex: 1.5 }]}></Text>
                            </>
                        )}
                    </View>
                );
            })}

            {/* Product subtotal strip */}
            <View style={styles.productSubtotal}>
                <Text style={styles.productSubtotalText}>
                    {product.name} — {pType === 'sqft' ? 'Total Sq.ft: ' : pType === 'item' ? 'Quantity: ' : 'Fixed Amount'}
                    {pType === 'sqft' && <Text style={{ fontWeight: '700' }}>{fmt(product.totalSqft)}</Text>}
                    {pType === 'item' && <Text style={{ fontWeight: '700' }}>{product.quantity || '0'}</Text>}
                </Text>
                <Text style={styles.productSubtotalAmount}>₹{fmt(product.totalAmount)}</Text>
            </View>

            <View style={styles.productDivider} />
        </View>
    );
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({
    icon,
    label,
    value,
}: {
    icon: string;
    label: string;
    value: string;
}) {
    return (
        <View style={statStyles.tile}>
            <MaterialIcons name={icon as any} size={24} color={COLORS.primary} />
            <Text style={statStyles.value}>{value}</Text>
            <Text style={statStyles.label}>{label}</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: COLORS.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1 },
    content: { padding: SPACING.md, paddingBottom: 120 },

    companyHeader: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.card,
    },
    companyName: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 1,
        marginBottom: 6,
    },
    companySubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 2,
        textAlign: 'center',
    },
    companyDate: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

    tableCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.md,
        ...SHADOWS.card,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    tableHeaderRow: { backgroundColor: COLORS.primary },
    rowEven: { backgroundColor: COLORS.white },
    rowOdd: { backgroundColor: COLORS.surfaceVariant },

    th: {
        color: COLORS.white,
        fontSize: 9,
        fontWeight: '700',
        textAlign: 'center',
        padding: 6,
        borderRightWidth: 0.5,
        borderRightColor: 'rgba(255,255,255,0.3)',
    },
    td: {
        fontSize: 11,
        color: COLORS.text,
        textAlign: 'center',
        padding: 5,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.border,
    },
    tdCell: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.border,
    },
    tdSr: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
    tdProduct: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
    },
    tdOrangeQty: { color: COLORS.accent, fontWeight: '700' },
    tdTotal: { backgroundColor: 'rgba(68,114,196,0.1)', fontWeight: '600' },
    tdAmount: {
        backgroundColor: COLORS.surfaceVariant,
        fontWeight: '700',
        color: COLORS.primary,
    },

    productSubtotal: {
        backgroundColor: COLORS.surfaceVariant,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
    },
    productSubtotalText: { fontSize: 11, color: COLORS.textSecondary },
    productSubtotalAmount: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
    productDivider: { height: 6, backgroundColor: COLORS.background },

    grandTotalCard: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.card,
    },
    grandTotalLabel: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
    grandTotalValue: { color: '#FFD700', fontSize: 26, fontWeight: '700' },

    statsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },

    exportBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        ...SHADOWS.card,
    },
    exportBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm + 2,
        borderRadius: RADIUS.md,
        gap: 8,
    },
    pdfBtn: { backgroundColor: COLORS.danger },
    excelBtn: { backgroundColor: COLORS.success },
    exportBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});

const statStyles = StyleSheet.create({
    tile: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        padding: SPACING.md,
        ...SHADOWS.card,
    },
    value: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 4 },
    label: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
