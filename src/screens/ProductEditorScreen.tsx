import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { RootStackParamList, DimensionRow, Product, Quotation } from '../types';
import {
    getQuotationById,
    saveQuotation,
    recalculateProduct,
    recalculateQuotation,
    generateId,
} from '../storage/quotationStorage';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductEditor'>;

const makeEmptyRow = (): DimensionRow => ({
    id: generateId(),
    width: '',
    length: '',
    qty: '1',
    sqft: 0,
});

const makeEmptyProduct = (srNo: number): Product => ({
    id: generateId(),
    srNo,
    pricingType: 'sqft',
    name: '',
    description: '',
    ratePerSqft: '',
    quantity: '1',
    rows: [makeEmptyRow()],
    totalSqft: 0,
    totalAmount: 0,
});

// ─── TypeButton ─────────────────────────────────────────────────────────────

function TypeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.typeBtn, active && styles.typeBtnActive]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

export default function ProductEditorScreen({ navigation, route }: Props) {
    const { quotationId, productId } = route.params;

    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [product, setProduct] = useState<Product>(makeEmptyProduct(1));

    useEffect(() => {
        getQuotationById(quotationId).then((q) => {
            if (!q) return;
            setQuotation(q);
            if (productId) {
                const existing = q.products.find((p) => p.id === productId);
                if (existing) setProduct(existing);
            } else {
                setProduct(makeEmptyProduct(q.products.length + 1));
            }
        });
    }, [quotationId, productId]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: productId ? 'Edit Product' : 'New Product',
            headerRight: () => (
                <TouchableOpacity onPress={handleSave} style={{ marginRight: 4 }}>
                    <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}>Save</Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation, product, quotation]);

    // ── Real-time computation ──────────────────────────────────────────

    const updateProductField = (field: 'name' | 'description' | 'ratePerSqft' | 'pricingType' | 'quantity', value: string) => {
        setProduct((prev) => {
            const updated = { ...prev, [field]: value };
            return recalculateProduct(updated as Product);
        });
    };

    const updateRow = (rowId: string, field: keyof DimensionRow, value: string) => {
        setProduct((prev) => {
            const rows = prev.rows.map((r) =>
                r.id === rowId ? { ...r, [field]: value } : r
            );
            return recalculateProduct({ ...prev, rows });
        });
    };

    const addRow = () => {
        setProduct((prev) => {
            const rows = [...prev.rows, makeEmptyRow()];
            return recalculateProduct({ ...prev, rows });
        });
    };

    const deleteRow = (rowId: string) => {
        if (product.rows.length === 1) {
            Alert.alert('Cannot Delete', 'A product must have at least one row.');
            return;
        }
        setProduct((prev) => {
            const rows = prev.rows.filter((r) => r.id !== rowId);
            return recalculateProduct({ ...prev, rows });
        });
    };

    // ── Save ──────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!product.name.trim()) {
            Alert.alert('Required', 'Please enter a product name.');
            return;
        }
        if (!quotation) return;

        const recalcProduct = recalculateProduct(product);

        let updatedProducts: Product[];
        if (productId) {
            updatedProducts = quotation.products.map((p) =>
                p.id === productId ? recalcProduct : p
            );
        } else {
            updatedProducts = [...quotation.products, recalcProduct];
        }

        // Renumber Sr No
        updatedProducts = updatedProducts.map((p, i) => ({ ...p, srNo: i + 1 }));

        const updatedQuotation = recalculateQuotation({
            ...quotation,
            products: updatedProducts,
        });

        await saveQuotation(updatedQuotation);
        navigation.goBack();
    };

    if (!quotation) {
        return (
            <View style={styles.loading}>
                <Text style={{ color: COLORS.textSecondary }}>Loading…</Text>
            </View>
        );
    }

    const totalSqft = product.totalSqft;
    const totalAmount = product.totalAmount;
    const rate = parseFloat(product.ratePerSqft) || 0;

    const pType = product.pricingType || 'sqft';

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Pricing Type ── */}
                <View style={[styles.card, { paddingBottom: SPACING.sm }]}>
                    <Text style={styles.cardTitle}>🏷️ Pricing Type</Text>
                    <View style={styles.typeSelectorRow}>
                        <TypeButton
                            label="Sq.ft Based"
                            active={pType === 'sqft'}
                            onPress={() => updateProductField('pricingType', 'sqft')}
                        />
                        <TypeButton
                            label="Item Based"
                            active={pType === 'item'}
                            onPress={() => updateProductField('pricingType', 'item')}
                        />
                        <TypeButton
                            label="Fixed Price"
                            active={pType === 'fixed'}
                            onPress={() => updateProductField('pricingType', 'fixed')}
                        />
                    </View>
                </View>

                {/* ── Product Info ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>📦 Product Info</Text>

                    <FieldInput
                        label="Product Name *"
                        value={product.name}
                        onChangeText={(v) => updateProductField('name', v)}
                        placeholder="e.g. Partition, Toughen Glass"
                    />
                    <FieldInput
                        label="Description"
                        value={product.description}
                        onChangeText={(v) => updateProductField('description', v)}
                        placeholder="e.g. 18mm thick plywood"
                        multiline
                    />

                    {pType === 'item' && (
                        <FieldInput
                            label="Quantity"
                            value={product.quantity || '1'}
                            onChangeText={(v) => updateProductField('quantity', v)}
                            placeholder="e.g. 4"
                            keyboardType="decimal-pad"
                        />
                    )}

                    <FieldInput
                        label={
                            pType === 'sqft' ? 'Rate per Sq.ft (₹)' :
                                pType === 'item' ? 'Price per Item (₹)' : 'Total Amount (₹)'
                        }
                        value={product.ratePerSqft}
                        onChangeText={(v) => updateProductField('ratePerSqft', v)}
                        placeholder={pType === 'sqft' ? 'e.g. 650' : 'e.g. 1500'}
                        keyboardType="decimal-pad"
                    />
                </View>

                {/* ── Dimension Rows (Only for sqft) ── */}
                {pType === 'sqft' && (
                    <View style={styles.card}>
                        <View style={styles.rowsHeader}>
                            <Text style={styles.cardTitle}>📐 Dimensions</Text>
                            <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
                                <MaterialIcons name="add" size={16} color={COLORS.white} />
                                <Text style={styles.addRowText}>Add Row</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Column headers */}
                        <View style={styles.colHeaderRow}>
                            <Text style={[styles.colHeader, { flex: 2 }]}>Width (Ft)</Text>
                            <Text style={[styles.colHeader, { flex: 2 }]}>Length (Ft)</Text>
                            <Text style={[styles.colHeader, { flex: 1.5 }]}>Qty</Text>
                            <Text style={[styles.colHeader, { flex: 2 }]}>Sq.ft</Text>
                            <Text style={[styles.colHeader, { flex: 0.7 }]}></Text>
                        </View>

                        {product.rows.map((row, idx) => (
                            <DimensionRowItem
                                key={row.id}
                                row={row}
                                index={idx}
                                onUpdate={(field, value) => updateRow(row.id, field, value)}
                                onDelete={() => deleteRow(row.id)}
                            />
                        ))}

                        {/* Subtotal strip */}
                        <View style={styles.subtotalStrip}>
                            <View style={styles.subtotalLeft}>
                                <MaterialIcons name="functions" size={16} color={COLORS.white} />
                                <Text style={styles.subtotalLabel}>
                                    {product.rows.length} rows × Total
                                </Text>
                            </View>
                            <Text style={styles.subtotalSqft}>
                                {totalSqft.toFixed(3)} Sq.ft
                            </Text>
                        </View>
                    </View>
                )}

                {/* ── Live Calculation Summary ── */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>💰 Live Calculation</Text>
                    <View style={styles.summaryGrid}>
                        {pType === 'sqft' && (
                            <SummaryItem label="Total Sq.ft" value={totalSqft.toFixed(3)} />
                        )}
                        {pType === 'item' && (
                            <SummaryItem label="Quantity" value={product.quantity || '0'} />
                        )}
                        {pType !== 'fixed' && (
                            <SummaryItem
                                label={pType === 'sqft' ? 'Rate per Sq.ft' : 'Rate per Item'}
                                value={`₹${rate.toFixed(2)}`}
                            />
                        )}
                        <SummaryItem
                            label="Total Amount"
                            value={`₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                            large
                            highlight
                        />
                    </View>
                </View>

                {/* ── Save Button ── */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <MaterialIcons name="save" size={20} color={COLORS.white} />
                    <Text style={styles.saveBtnText}>Save Product</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── DimensionRowItem ─────────────────────────────────────────────────────────

function DimensionRowItem({
    row,
    index,
    onUpdate,
    onDelete,
}: {
    row: DimensionRow;
    index: number;
    onUpdate: (field: keyof DimensionRow, value: string) => void;
    onDelete: () => void;
}) {
    const sqft = row.sqft;
    const isHighQty = parseFloat(row.qty) > 1;

    return (
        <View style={[rowStyles.container, index % 2 === 0 ? rowStyles.evenBg : rowStyles.oddBg]}>
            <View style={rowStyles.indexBadge}>
                <Text style={rowStyles.indexText}>{index + 1}</Text>
            </View>
            <NumberInput
                value={row.width}
                onChangeText={(v) => onUpdate('width', v)}
                placeholder="0.0"
                style={{ flex: 2 }}
            />
            <NumberInput
                value={row.length}
                onChangeText={(v) => onUpdate('length', v)}
                placeholder="0.0"
                style={{ flex: 2 }}
            />
            <NumberInput
                value={row.qty}
                onChangeText={(v) => onUpdate('qty', v)}
                placeholder="1"
                style={[{ flex: 1.5 }, isHighQty && rowStyles.qtyHighlight]}
                textStyle={isHighQty ? rowStyles.qtyHighlightText : undefined}
            />
            {/* Computed sq.ft (read-only) */}
            <View style={[rowStyles.sqftCell, { flex: 2 }]}>
                <Text style={rowStyles.sqftText}>{sqft > 0 ? sqft.toFixed(2) : '—'}</Text>
            </View>
            <TouchableOpacity onPress={onDelete} style={{ flex: 0.7, alignItems: 'center' }}>
                <MaterialIcons name="remove-circle" size={22} color={COLORS.danger} />
            </TouchableOpacity>
        </View>
    );
}

function NumberInput({
    value,
    onChangeText,
    placeholder,
    style,
    textStyle,
}: {
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    style?: object;
    textStyle?: object;
}) {
    return (
        <TextInput
            style={[rowStyles.numInput, style]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#AAB4C8"
            keyboardType="decimal-pad"
            textAlign="center"
        />
    );
}

// ─── Summary card sub-components ─────────────────────────────────────────────

function SummaryItem({
    label,
    value,
    large,
    highlight,
}: {
    label: string;
    value: string;
    large?: boolean;
    highlight?: boolean;
}) {
    return (
        <View style={summaryStyles.item}>
            <Text style={summaryStyles.label}>{label}</Text>
            <Text
                style={[
                    summaryStyles.value,
                    large && summaryStyles.large,
                    highlight && summaryStyles.highlight,
                ]}
            >
                {value}
            </Text>
        </View>
    );
}

function FieldInput({
    label,
    value,
    onChangeText,
    placeholder,
    multiline,
    keyboardType,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'decimal-pad';
}) {
    return (
        <View style={fieldStyles.wrapper}>
            <Text style={fieldStyles.label}>{label}</Text>
            <TextInput
                style={[fieldStyles.input, multiline && { height: 56, textAlignVertical: 'top' }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#AAB4C8"
                multiline={multiline}
                keyboardType={keyboardType || 'default'}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.md, paddingBottom: 80 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.card,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.md },

    typeSelectorRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: RADIUS.sm,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    typeBtnActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primaryLight,
    },
    typeBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    typeBtnTextActive: {
        color: COLORS.white,
    },

    rowsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    addRowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 5,
        borderRadius: RADIUS.sm,
        gap: 4,
    },
    addRowText: { color: COLORS.white, fontWeight: '600', fontSize: 12 },

    colHeaderRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.sm,
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginBottom: SPACING.xs,
        alignItems: 'center',
    },
    colHeader: { color: COLORS.white, fontSize: 10, fontWeight: '700', textAlign: 'center' },

    subtotalStrip: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: RADIUS.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.sm,
        marginTop: SPACING.sm,
    },
    subtotalLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    subtotalLabel: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
    subtotalSqft: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

    summaryCard: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.card,
    },
    summaryTitle: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginBottom: SPACING.sm },
    summaryGrid: { flexDirection: 'row', justifyContent: 'space-between' },

    saveBtn: {
        backgroundColor: COLORS.success,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        gap: 8,
        ...SHADOWS.card,
    },
    saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});

const rowStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        borderRadius: RADIUS.sm,
        paddingVertical: 4,
        paddingHorizontal: 2,
        gap: 3,
    },
    evenBg: { backgroundColor: 'rgba(68,114,196,0.05)' },
    oddBg: { backgroundColor: COLORS.white },
    indexBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
    numInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        padding: 6,
        fontSize: 13,
        color: COLORS.text,
        backgroundColor: COLORS.white,
        height: 38,
    },
    qtyHighlight: { borderColor: COLORS.accent, backgroundColor: 'rgba(255,102,0,0.08)' },
    qtyHighlightText: { color: COLORS.accent, fontWeight: '700' },
    sqftCell: {
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 6,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sqftText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});

const summaryStyles = StyleSheet.create({
    item: { alignItems: 'center', flex: 1 },
    label: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginBottom: 2 },
    value: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
    large: { fontSize: 20, fontWeight: '700' },
    highlight: { color: '#FFD700' },
});

const fieldStyles = StyleSheet.create({
    wrapper: { marginBottom: SPACING.sm },
    label: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
    input: {
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: RADIUS.sm,
        padding: SPACING.sm,
        fontSize: 14,
        color: COLORS.text,
        backgroundColor: COLORS.background,
    },
});
