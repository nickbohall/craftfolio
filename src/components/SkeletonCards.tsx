import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - CARD_GAP) / 2;

function PulseBox({ style }: { style: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return <Animated.View style={[style, { opacity }]} />;
}

export function JournalSkeleton() {
  return (
    <View style={styles.journalGrid}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.journalCard}>
          <PulseBox style={styles.journalImage} />
          <PulseBox style={styles.journalTitle} />
          <PulseBox style={styles.journalSubtitle} />
        </View>
      ))}
    </View>
  );
}

export function MaterialsSkeleton() {
  return (
    <View style={styles.materialsList}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.materialCard}>
          <PulseBox style={styles.materialBadge} />
          <PulseBox style={styles.materialTitle} />
          <PulseBox style={styles.materialDetail} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  journalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: CARD_GAP,
    paddingTop: 12,
  },
  journalCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 0,
  },
  journalImage: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: Colors.surfaceElevated,
  },
  journalTitle: {
    height: 14,
    width: '70%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    marginTop: 10,
    marginHorizontal: 10,
  },
  journalSubtitle: {
    height: 10,
    width: '45%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    marginTop: 6,
    marginHorizontal: 10,
    marginBottom: 12,
  },
  materialsList: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  materialCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  materialBadge: {
    height: 20,
    width: 60,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    marginBottom: 8,
  },
  materialTitle: {
    height: 14,
    width: '60%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    marginBottom: 6,
  },
  materialDetail: {
    height: 10,
    width: '40%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
  },
});
