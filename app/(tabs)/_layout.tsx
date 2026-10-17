import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.faint,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.line,
          borderTopWidth: 1,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarActiveTintColor: theme.accent,
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} size={22} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarActiveTintColor: theme.accent,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: t('tabs.lessons'),
          tabBarActiveTintColor: theme.teal,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: t('tabs.notes'),
          tabBarActiveTintColor: theme.coral,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'note.text', android: 'sticky_note_2', web: 'sticky_note_2' }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: t('tabs.timer'),
          tabBarActiveTintColor: theme.amber,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'timer', android: 'timer', web: 'timer' }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="countdown" options={{ href: null }} />
      <Tabs.Screen
        name="analysis"
        options={{
          title: t('tabs.analysis'),
          tabBarActiveTintColor: theme.violet,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="reminders" options={{ href: null }} />
    </Tabs>
  );
}
