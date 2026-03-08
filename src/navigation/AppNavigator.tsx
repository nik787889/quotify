import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/theme';

import HomeScreen from '../screens/HomeScreen';
import QuotationEditorScreen from '../screens/QuotationEditorScreen';
import ProductEditorScreen from '../screens/ProductEditorScreen';
import QuotationPreviewScreen from '../screens/QuotationPreviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{
                    headerStyle: { backgroundColor: COLORS.primary },
                    headerTintColor: COLORS.white,
                    headerTitleStyle: { fontWeight: '700', fontSize: 18 },
                    headerBackTitle: '',
                    contentStyle: { backgroundColor: COLORS.background },
                }}
            >
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: '🏠 Ganesh Interiors', headerLargeTitle: false }}
                />
                <Stack.Screen
                    name="QuotationEditor"
                    component={QuotationEditorScreen}
                    options={{ title: 'Quotation Details' }}
                />
                <Stack.Screen
                    name="ProductEditor"
                    component={ProductEditorScreen}
                    options={{ title: 'Add / Edit Product' }}
                />
                <Stack.Screen
                    name="QuotationPreview"
                    component={QuotationPreviewScreen}
                    options={{ title: 'Preview & Export' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
