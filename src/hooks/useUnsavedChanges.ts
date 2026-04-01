import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Prompts "Discard changes?" when the user tries to navigate back
 * while `dirty` is true.
 *
 * Returns `allowNavigation` — call it before `navigation.goBack()`
 * to bypass the prompt (e.g. after a successful save).
 */
export function useUnsavedChanges(dirty: boolean) {
  const navigation = useNavigation();
  const bypassRef = useRef(false);

  const allowNavigation = useCallback(() => {
    bypassRef.current = true;
  }, []);

  useEffect(() => {
    if (!dirty) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (bypassRef.current) return;
      e.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });

    return unsubscribe;
  }, [dirty, navigation]);

  return allowNavigation;
}
