import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface TabBarProps {
    activeTab: 'all' | 'cm';
    onTabChange: (tab: 'all' | 'cm') => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
    return (
        <View style={styles.tabBar}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'cm' && styles.tabActive]}
                onPress={() => onTabChange('cm')}
                activeOpacity={0.7}
            >
                <Text style={[styles.tabText, activeTab === 'cm' && styles.tabTextActive]}>
                    Device Coating
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                onPress={() => onTabChange('all')}
                activeOpacity={0.7}
            >
                <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                    Show All
                </Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: '#E0E0E0',
        borderRadius: 10,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: '#1976D2',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#757575',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
});