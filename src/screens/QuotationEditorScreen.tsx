import React, { useCallback, useLayoutEffect, useState } from 'react';
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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { RootStackParamList, Quotation, Product } from '../types';
import {
    getQuotationById,
    saveQuotation,
    recalculateQuotation,
    generateId,
    deleteQuotation,
} from '../storage/quotationStorage';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'QuotationEditor'>;

const DEFAULT_COMPANY = 'Ganesh Interiors';

export default function QuotationEditorScreen({ navigation, route }: Props) {
    const { quotationId } = route.params || {};
    const isNew = !quotationId;

    const [quotation, setQuotation] = useState<Quotation>({
        id: generateId(),
        companyName: DEFAULT_COMPANY,
        quotationFor: '',
        address: '',
        projectName: '',
        date: new Date().toISOString(),
        products: [],
        grandTotal: 0,
    });

    const currentId = quotationId || quotation.id;

    // Load existing quotation every time screen is focused
    useFocusEffect(
        useCallback(() => {
            getQuotationById(currentId).then((q) => {
                if (q) {
                    setQuotation(q);
                    // Update route params so it's no longer treated as 'new' internally
                    if (!quotationId) {
                        navigation.setParams({ quotationId: q.id });
                    }
                }
            });
        }, [currentId, quotationId, navigation])
    );

    useLayoutEffect(() => {
        navigation.setOptions({
            title: isNew ? 'New Quotation' : 'Edit Quotation',
            headerRight: () => (
                <TouchableOpacity onPress={handleSave} style={{ marginRight: 4 }}>
                    <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}>Save</Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation, quotation, isNew]);

    const update = (field: keyof Quotation, value: string) => {
        setQuotation((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!quotation.quotationFor.trim()) {
            Alert.alert('Required', 'Please enter "Quotation For" (client name).');
            return;
        }
        const recalc = recalculateQuotation(quotation);
        await saveQuotation(recalc);
        Alert.alert('Saved ✓', 'Quotation saved successfully.', [
            {
                text: 'OK',
                onPress: () => {
                    if (isNew) navigation.replace('QuotationEditor', { quotationId: recalc.id });
                },
            },
        ]);
    };

    const handleDeleteProduct = (productId: string, productName: string) => {
        Alert.alert('Delete Product', `Remove "${productName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    setQuotation((prev) => {
                        const products = prev.products
                            .filter((p) => p.id !== productId)
                            .map((p, i) => ({ ...p, srNo: i + 1 }));
                        return recalculateQuotation({ ...prev, products });
                    });
                },
            },
        ]);
    };

    const grandTotal = quotation.products.reduce((s, p) => s + p.totalAmount, 0);

    const fmt = (n: number) =>
        '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

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
                {/* ── Header Info ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Quotation Info</Text>

                    <LabelInput
                        label="Company Name"
                        value={quotation.companyName}
                        onChangeText={(v) => update('companyName', v)}
                        placeholder="Ganesh Interiors"
                    />
                    <LabelInput
                        label="Quotation For (Client)*"
                        value={quotation.quotationFor}
                        onChangeText={(v) => update('quotationFor', v)}
                        placeholder="e.g. Words Worth"
                    />
                    <LabelInput
                        label="Address"
                        value={quotation.address}
                        onChangeText={(v) => update('address', v)}
                        placeholder="204 Silicon Tower, Navrangpura…"
                        multiline
                    />
                    <LabelInput
                        label="Project Name"
                        value={quotation.projectName}
                        onChangeText={(v) => update('projectName', v)}
                        placeholder="Office Furniture Work - 2nd Floor"
                    />
                </View>

                {/* ── Products List ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🏗️ Products</Text>
                        <TouchableOpacity
                            style={styles.addProductBtn}
                            onPress={async () => {
                                // Save first so ProductEditor can load the latest
                                const recalc = recalculateQuotation(quotation);
                                await saveQuotation(recalc);
                                setQuotation(recalc);
                                navigation.navigate('ProductEditor', { quotationId: recalc.id });
                            }}
                        >
                            <MaterialIcons name="add" size={18} color={COLORS.white} />
                            <Text style={styles.addProductText}>Add Product</Text>
                        </TouchableOpacity>
                    </View>

                    {quotation.products.length === 0 ? (
                        <View style={styles.emptyProducts}>
                            <MaterialIcons name="inventory" size={40} color={COLORS.surfaceVariant} />
                            <Text style={styles.emptyProductsText}>No products yet. Tap "Add Product".</Text>
                        </View>
                    ) : (
                        quotation.products.map((product) => (
                            <ProductSummaryCard
                                key={product.id}
                                product={product}
                                onEdit={() =>
                                    navigation.navigate('ProductEditor', {
                                        quotationId: quotation.id,
                                        productId: product.id,
                                    })
                                }
                                onDelete={() => handleDeleteProduct(product.id, product.name)}
                                fmt={fmt}
                            />
                        ))
                    )}
                </View>

                {/* ── Grand Total ── */}
                {quotation.products.length > 0 && (
                    <View style={styles.grandTotalCard}>
                        <Text style={styles.grandTotalLabel}>Grand Total</Text>
                        <Text style={styles.grandTotalValue}>{fmt(grandTotal)}</Text>
                    </View>
                )}

                {/* ── Action Buttons ── */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                        <MaterialIcons name="save" size={20} color={COLORS.white} />
                        <Text style={styles.saveBtnText}>Save Quotation</Text>
                    </TouchableOpacity>

                    {!isNew && (
                        <TouchableOpacity
                            style={styles.previewBtn}
                            onPress={async () => {
                                const recalc = recalculateQuotation(quotation);
                                await saveQuotation(recalc);
                                navigation.navigate('QuotationPreview', { quotationId: quotation.id });
                            }}
                        >
                            <MaterialIcons name="picture-as-pdf" size={20} color={COLORS.white} />
                            <Text style={styles.previewBtnText}>Preview & Export</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LabelInput({
    label,
    value,
    onChangeText,
    placeholder,
    multiline,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    multiline?: boolean;
}) {
    return (
        <View style={inputStyles.wrapper}>
            <Text style={inputStyles.label}>{label}</Text>
            <TextInput
                style={[inputStyles.input, multiline && { height: 64, textAlignVertical: 'top' }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#AAB4C8"
                multiline={multiline}
            />
        </View>
    );
}

function ProductSummaryCard({
    product,
    onEdit,
    onDelete,
    fmt,
}: {
    product: Product;
    onEdit: () => void;
    onDelete: () => void;
    fmt: (n: number) => string;
}) {
    const pType = product.pricingType || 'sqft';
    let label1 = 'Total Sq.ft';
    let val1 = product.totalSqft.toFixed(2);
    let label2 = 'Rate/Sq.ft';
    let val2 = `₹${product.ratePerSqft || '0'}`;

    if (pType === 'fixed') {
        label1 = 'Type';
        val1 = 'Fixed';
        label2 = 'Rate';
        val2 = '—';
    } else if (pType === 'item') {
        label1 = 'Quantity';
        val1 = product.quantity || '0';
        label2 = 'Price/Item';
    }

    return (
        <View style={productStyles.card}>
            <View style={productStyles.leftStripe} />
            <View style={productStyles.body}>
                <View style={productStyles.row}>
                    <View style={productStyles.srBadge}>
                        <Text style={productStyles.srText}>{product.srNo}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={productStyles.name}>{product.name || '—'}</Text>
                        <Text style={productStyles.desc} numberOfLines={1}>
                            {product.description}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onEdit} style={productStyles.iconBtn}>
                        <MaterialIcons name="edit" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDelete} style={productStyles.iconBtn}>
                        <MaterialIcons name="delete-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
                <View style={productStyles.statsRow}>
                    <Stat label="Rows" value={pType === 'fixed' || pType === 'item' ? '—' : String(product.rows.length)} />
                    <Stat label={label1} value={val1} />
                    <Stat label={label2} value={val2} />
                    <Stat label="Amount" value={fmt(product.totalAmount)} highlight />
                </View>
            </View>
        </View>
    );
}

function Stat({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[productStyles.statValue, highlight && { color: COLORS.primary }]}>
                {value}
            </Text>
            <Text style={productStyles.statLabel}>{label}</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.md, paddingBottom: 60 },

    section: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.card,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: SPACING.md,
    },

    addProductBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: RADIUS.sm,
        gap: 4,
    },
    addProductText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },

    emptyProducts: { alignItems: 'center', paddingVertical: SPACING.lg },
    emptyProductsText: { color: COLORS.textSecondary, marginTop: SPACING.sm, fontSize: 13 },

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
    grandTotalValue: { color: COLORS.white, fontSize: 24, fontWeight: '700' },

    actions: { gap: SPACING.sm },
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
    previewBtn: {
        backgroundColor: COLORS.accent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        gap: 8,
        ...SHADOWS.card,
    },
    previewBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});

const inputStyles = StyleSheet.create({
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

const productStyles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.sm,
        overflow: 'hidden',
    },
    leftStripe: { width: 4, backgroundColor: COLORS.primary },
    body: { flex: 1, padding: SPACING.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    srBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    srText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
    name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    desc: { fontSize: 12, color: COLORS.textSecondary },
    iconBtn: { padding: 4 },
    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(68,114,196,0.2)',
        paddingTop: SPACING.xs,
    },
    statValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    statLabel: { fontSize: 10, color: COLORS.textSecondary },
});
