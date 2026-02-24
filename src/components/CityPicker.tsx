// City Picker component for quick navigation

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
} from 'react-native';
import { COLORS, CITY_PRESETS } from '../constants';
import { CityPreset } from '../types';

interface CityPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectCity: (city: CityPreset) => void;
}

export const CityPicker: React.FC<CityPickerProps> = ({
  visible,
  onClose,
  onSelectCity,
}) => {
  const renderCity = ({ item }: { item: CityPreset }) => (
    <TouchableOpacity
      style={styles.cityItem}
      onPress={() => onSelectCity(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.cityIcon}>📍</Text>
      <Text style={styles.cityName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select City</Text>
          </View>
          <FlatList
            data={CITY_PRESETS}
            renderItem={renderCity}
            keyExtractor={(item) => item.name}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: '80%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  cityIcon: {
    fontSize: 16,
  },
  cityName: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
});
