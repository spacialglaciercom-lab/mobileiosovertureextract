// Privacy Policy Modal component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../constants';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface PrivacyPolicyProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.header}>
              <Text style={styles.title}>Privacy Policy</Text>
              <Text style={styles.subtitle}>Last updated: March 2, 2026</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>1. Introduction</Text>
                  <Text style={styles.sectionText}>
                    Welcome to Overture OSM Extractor. This Privacy Policy explains how we collect, 
                    use, and protect your information when you use our road network extraction service.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>2. Information We Collect</Text>
                  <Text style={styles.sectionText}>
                    We collect minimal information necessary to provide our service:
                  </Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bulletItem}>
                      • <Text style={styles.bold}>Geographic Data:</Text> Polygon coordinates you draw on the map to define 
                      extraction areas. This data is processed temporarily and not stored permanently.
                    </Text>
                    <Text style={styles.bulletItem}>
                      • <Text style={styles.bold}>Usage Data:</Text> Basic analytics about how the service is used, including 
                      page views and feature usage, to help us improve the service.
                    </Text>
                    <Text style={styles.bulletItem}>
                      • <Text style={styles.bold}>Location Data:</Text> If you use the geolocation feature, your approximate 
                      location is used only to center the map and is not stored.
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
                  <Text style={styles.sectionText}>Your information is used solely to:</Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bulletItem}>• Process your road network extraction requests</Text>
                    <Text style={styles.bulletItem}>• Generate downloadable GeoJSON and graph files</Text>
                    <Text style={styles.bulletItem}>• Improve and maintain the service</Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
                  <Text style={styles.sectionText}>
                    Extracted data files are temporarily stored on our servers and automatically deleted 
                    after a short period. We do not permanently store your polygon selections or extracted 
                    road network data. All data transmission uses secure HTTPS/WSS connections.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>5. Third-Party Services</Text>
                  <Text style={styles.sectionText}>
                    Our service uses the following third-party data sources and services:
                  </Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bulletItem}>
                      • <Text style={styles.bold}>Overture Maps Foundation:</Text> Road network data is sourced from Overture 
                      Maps open data, which is derived from OpenStreetMap and other sources.
                    </Text>
                    <Text style={styles.bulletItem}>
                      • <Text style={styles.bold}>CARTO:</Text> Base map tiles are provided by CARTO.
                    </Text>
                    <Text style={styles.bulletItem}>
                      • <Text style={styles.bold}>OpenStreetMap:</Text> Map data © OpenStreetMap contributors.
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>6. Cookies</Text>
                  <Text style={styles.sectionText}>
                    This service does not use cookies for tracking purposes. Any cookies used are 
                    strictly necessary for the technical operation of the service.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>7. Your Rights</Text>
                  <Text style={styles.sectionText}>
                    Since we do not permanently store personal data, there is no personal data to access, 
                    modify, or delete. If you have questions about data processing, please contact us.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>8. Open Source</Text>
                  <Text style={styles.sectionText}>
                    This application is open source. You can review the code to verify our data handling 
                    practices and run your own instance if you prefer complete control over your data.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
                  <Text style={styles.sectionText}>
                    We may update this Privacy Policy from time to time. Any changes will be posted on 
                    this page with an updated revision date.
                  </Text>
                </View>

                <View style={[styles.section, { marginBottom: 40 }]}>
                  <Text style={styles.sectionTitle}>10. Contact</Text>
                  <Text style={styles.sectionText}>
                    If you have any questions about this Privacy Policy, please open an issue on our 
                    GitHub repository.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: SCREEN_WIDTH - 40,
    maxWidth: 500,
    height: SCREEN_HEIGHT * 0.75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 8,
    gap: 6,
  },
  bulletItem: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    paddingLeft: 4,
  },
  bold: {
    fontWeight: '600',
    color: COLORS.text,
  },
});
