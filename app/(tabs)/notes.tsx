import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SwipeRow } from '@/components/swipe-row';
import { AddButton, Card, EmptyState, Header, Screen } from '@/components/ui';
import { deleteNote, listNotes, type Note } from '@/lib/db';
import { formatWhen } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { noteSummary } from '@/lib/note-doc';
import { discardNotePhoto } from '@/lib/photos';
import { useThemedStyles, type Theme } from '@/lib/theme';

export default function NotesScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);

  const load = useCallback(async () => {
    setNotes(await listNotes(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listNotes(db).then((rows) => {
        if (active) setNotes(rows);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  function openNew() {
    router.push('/note' as Href);
  }

  async function remove(note: Note) {
    await deleteNote(db, note.id);
    await discardNotePhoto(note.photo);
    await load();
  }

  return (
    <Screen>
      <Header
        action={<AddButton label={t('common.new')} onPress={openNew} />}
        kicker={notes.length > 0 ? t('notes.count', { count: notes.length }) : undefined}
        title={t('notes.title')}
      />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.flex}>
        {notes.length === 0 ? (
          <EmptyState body={t('notes.emptyBody')} title={t('notes.emptyTitle')} />
        ) : (
          notes.map((note) => {
            const summary = noteSummary(note.title, note.body);
            return (
            <SwipeRow key={note.id} onDelete={() => void remove(note)}>
              <Card onPress={() => router.push(`/note?id=${note.id}` as Href)}>
                {note.photo ? (
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: note.photo }} style={styles.thumb} />
                  </View>
                ) : null}
                <Text style={styles.noteTitle}>{summary.title}</Text>
                {summary.preview ? (
                  <Text numberOfLines={3} style={styles.noteBody}>
                    {summary.preview}
                  </Text>
                ) : null}
                <View style={styles.meta}>
                  {summary.checks ? <Text style={styles.noteChecks}>{t('notes.checks', summary.checks)}</Text> : null}
                  <Text style={styles.noteWhen}>{formatWhen(note.updated_at)}</Text>
                </View>
              </Card>
            </SwipeRow>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    gap: 10,
    paddingBottom: 28,
  },
  thumbWrap: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  thumb: {
    height: 160,
    width: '100%',
  },
  noteTitle: {
    color: theme.ink,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  noteBody: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  noteChecks: {
    color: theme.teal,
    fontSize: 12,
    fontWeight: '600',
  },
  noteWhen: {
    color: theme.faint,
    fontSize: 12,
    fontWeight: '500',
  },
  });
}

