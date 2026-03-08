import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { RootStackParamList, Quotation } from '../types';
import { getAllQuotations, deleteQuotation } from '../storage/quotationStorage';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const fmt = (n: number) =>
    '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function HomeScreen({ navigation }: Props) {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        const data = await getAllQuotations();
        setQuotations(data);
        setRefreshing(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const handleDelete = (id: string, name: string) => {
        Alert.alert('Delete Quotation', `Delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteQuotation(id);
                    load();
                },
            },
        ]);
    };

    const renderItem = ({ item }: { item: Quotation }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() =>
                navigation.navigate('QuotationEditor', { quotationId: item.id })
            }
        >
            {/* Left accent bar */}
            <View style={styles.accentBar} />

            <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {item.products.length} Products
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleDelete(item.id, item.quotationFor)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialIcons name="delete-outline" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.quotationFor}
                </Text>
                <Text style={styles.cardProject} numberOfLines={1}>
                    📁 {item.projectName}
                </Text>
                <Text style={styles.cardAddress} numberOfLines={1}>
                    📍 {item.address}
                </Text>

                <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>
                        {new Date(item.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </Text>
                    <Text style={styles.cardTotal}>{fmt(item.grandTotal)}</Text>
                </View>
            </View>

            {/* Preview button */}
            <TouchableOpacity
                style={styles.previewBtn}
                onPress={() =>
                    navigation.navigate('QuotationPreview', { quotationId: item.id })
                }
            >
                <MaterialIcons name="picture-as-pdf" size={20} color={COLORS.white} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Sub-header */}
            <View style={styles.subHeader}>
                <Text style={styles.subHeaderText}>
                    {quotations.length} Quotation{quotations.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.subHeaderHint}>Tap card to edit • PDF icon to export</Text>
            </View>

            <FlatList
                data={quotations}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialIcons name="description" size={72} color={COLORS.surfaceVariant} />
                        <Text style={styles.emptyTitle}>No Quotations Yet</Text>
                        <Text style={styles.emptyHint}>
                            Tap the + button to create your first quotation
                        </Text>
                    </View>
                }
            />

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('QuotationEditor', {})}
            >
                <MaterialIcons name="add" size={28} color={COLORS.white} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    subHeader: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subHeaderText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
    subHeaderHint: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

    list: { padding: SPACING.md, paddingBottom: 100 },

    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.md,
        flexDirection: 'row',
        overflow: 'hidden',
        ...SHADOWS.card,
    },
    accentBar: {
        width: 5,
        backgroundColor: COLORS.primaryLight,
    },
    cardBody: { flex: 1, padding: SPACING.md },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    badgeRow: { flexDirection: 'row', gap: 6 },
    badge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    badgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },

    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    cardProject: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 1 },
    cardAddress: { fontSize: 11, color: COLORS.textSecondary, marginBottom: SPACING.sm },

    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardDate: { fontSize: 12, color: COLORS.textSecondary },
    cardTotal: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
    },

    previewBtn: {
        backgroundColor: COLORS.accent,
        width: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },

    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
    },
    emptyHint: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: SPACING.sm,
        textAlign: 'center',
        paddingHorizontal: SPACING.lg,
    },

    fab: {
        position: 'absolute',
        bottom: 28,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.card,
    },
});
