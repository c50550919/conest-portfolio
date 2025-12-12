import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing, typography } from '../../theme';

const BackgroundCheckScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>BackgroundCheckScreen - To be implemented</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  text: { ...typography.h4, color: colors.text.primary },
});

export default BackgroundCheckScreen;
