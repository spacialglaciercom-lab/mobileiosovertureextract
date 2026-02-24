// Progress Card component for extraction status

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import { ExtractionProgress } from '../types';
import { ProgressBar } from './ProgressBar';

interface ProgressCardProps {
  progress: ExtractionProgress;
}

const STAGE_LABELS: Record<string, string> = {
  downloading: 'Downloading',
  clipping: 'Clipping',
  building_graph: 'Building Graph',
  complete: 'Complete',
  error: 'Error',
};

const STAGE_ICONS: Record<string, string> = {
  downloading: '📡',
  clipping: '✂️',
  building_graph: '🔗',
  complete: '✅',
  error: '❌',
};

export const ProgressCard: React.FC<ProgressCardProps> = ({ progress }) => {
  const isComplete = progress.stage === 'complete';
  const isError = progress.stage === 'error';

  return (
    <View style={[styles.container, isError && styles.errorContainer]}>
      <View style={styles.header}>
        <View style={styles.stageInfo}>
          <Text style={styles.stageIcon}>{STAGE_ICONS[progress.stage]}</Text>
          <Text style={[styles.stageText, isError && styles.errorText]}>
            {STAGE_LABELS[progress.stage]}
          </Text>
        </View>
        <Text style={styles.progressPercent}>{progress.progress}%</Text>
      </View>

      {!isComplete && !isError && (
        <ProgressBar
          progress={progress.progress}
          color={isError ? COLORS.error : COLORS.primary}
        />
      )}

      {isError && progress.error && (
        <Text style={styles.errorMsg}>{progress.error}</Text>
      )}

      {isComplete && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progress.nodes?.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Nodes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progress.edges?.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Edges</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E8F4FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#FDE8E8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageIcon: {
    fontSize: 18,
  },
  stageText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorText: {
    color: COLORS.error,
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  errorMsg: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: 8,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
});
