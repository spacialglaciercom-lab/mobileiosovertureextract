// Measurement Card component for displaying live measurements

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import { MeasurementMetrics } from '../types';

interface MeasurementCardProps {
  metrics: MeasurementMetrics;
  pointCount: number;
}

export const MeasurementCard: React.FC<MeasurementCardProps> = ({
  metrics,
  pointCount,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.indicator} />
        <Text style={styles.label}>LIVE MEASUREMENTS</Text>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metricRow}>
          <Text style={styles.primaryValue}>{metrics.area.toFixed(3)}</Text>
          <Text style={styles.unit}>km²</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.secondaryValue}>{metrics.perimeter.toFixed(3)}</Text>
          <Text style={styles.secondaryUnit}>km perimeter</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.pointValue}>{pointCount}</Text>
          <Text style={styles.pointLabel}>points</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  metrics: {
    gap: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  primaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  unit: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  secondaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  secondaryUnit: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  pointValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  pointLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
