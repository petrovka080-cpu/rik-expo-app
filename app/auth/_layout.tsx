import '../_webStyleGuard';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="login" options={{ title: 'Вход' }} />
      <Stack.Screen name="register" options={{ title: 'Регистрация' }} />
      <Stack.Screen name="reset" options={{ title: 'Восстановление доступа' }} />
    </Stack>
  );
}
