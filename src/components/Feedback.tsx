// Feedback Modal component

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, DEFAULT_WS_URL } from '../constants';

interface FeedbackProps {
  visible: boolean;
  onClose: () => void;
}

type FeedbackType = 'issue' | 'idea' | null;

export const Feedback: React.FC<FeedbackProps> = ({
  visible,
  onClose,
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setFeedbackType(null);
    setTitle('');
    setDescription('');
    setEmail('');
    onClose();
  };

  const handleBack = () => {
    setFeedbackType(null);
    setTitle('');
    setDescription('');
    setEmail('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setIsSubmitting(true);

    const feedbackData = {
      type: feedbackType,
      title: title.trim(),
      description: description.trim(),
      email: email.trim() || undefined,
      url: 'mobile-app',
      userAgent: `React Native / ${Platform.OS}`,
    };

    try {
      const httpUrl = DEFAULT_WS_URL.replace('wss://', 'https://').replace('ws://', 'http://');
      
      const response = await fetch(`${httpUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      Alert.alert('Thank you!', 'Your feedback has been submitted.');
      handleClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.overlayPressable} onPress={handleClose}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {feedbackType && (
                  <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Text style={styles.backText}>←</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.title}>
                  {feedbackType === null && 'Send Product Feedback'}
                  {feedbackType === 'issue' && 'Report an Issue'}
                  {feedbackType === 'idea' && 'Suggest an Idea'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {feedbackType === null ? (
              <View style={styles.content}>
                <Text style={styles.helpText}>How can we help?</Text>
                <Text style={styles.helpSubtext}>
                  Your feedback helps us improve Overture OSM Extractor
                </Text>

                {/* Report Issue Option */}
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => setFeedbackType('issue')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Text style={styles.optionIconText}>⚠️</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Report an Issue</Text>
                    <Text style={styles.optionSubtitle}>Something not working as expected?</Text>
                  </View>
                  <Text style={styles.optionArrow}>›</Text>
                </TouchableOpacity>

                {/* Suggest Idea Option */}
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => setFeedbackType('idea')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={styles.optionIconText}>💡</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Suggest an Idea</Text>
                    <Text style={styles.optionSubtitle}>Have a feature request or improvement?</Text>
                  </View>
                  <Text style={styles.optionArrow}>›</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.content}>
                {/* Title Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      feedbackType === 'issue'
                        ? 'Brief description of the issue'
                        : 'What would you like to see?'
                    }
                    placeholderTextColor={COLORS.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                  />
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Email <Text style={styles.inputOptional}>(optional - for follow-up)</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={COLORS.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Description Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Description <Text style={styles.inputOptional}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={
                      feedbackType === 'issue'
                        ? 'Steps to reproduce, expected behavior, etc.'
                        : 'Describe your idea in detail...'
                    }
                    placeholderTextColor={COLORS.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!title.trim() || isSubmitting) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!title.trim() || isSubmitting}
                  activeOpacity={0.7}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitIcon}>📤</Text>
                      <Text style={styles.submitText}>Submit Feedback</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.footerText}>
                  Your feedback will be sent to our team
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
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
  overlayPressable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 16,
    color: COLORS.text,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
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
  content: {
    padding: 16,
  },
  helpText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  helpSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionIconText: {
    fontSize: 18,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  optionArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputOptional: {
    fontWeight: '400',
    color: '#9CA3AF',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitIcon: {
    fontSize: 16,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
});
