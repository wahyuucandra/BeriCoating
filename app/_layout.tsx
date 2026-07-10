import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import Snackbar from '../src/components/Snackbar';

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="measurement"
          options={{
            gestureEnabled: false,
          }}
        />
      </Stack>
      <Snackbar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});