import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SwipeRow } from '@/components/swipe-row';
import { AddButton, EmptyState, Screen } from '@/components/ui';
import {
  deleteSubject,
  deleteTopic,
  insertKonu,
  listStudySessions,
  listSubjects,
  listTopics,
  setTopicDone,
  type StudySession,
  type Subject,
  type Topic,
} from '@/lib/db';
import { languageNow, text, useI18n } from '@/lib/i18n';
import { useStopwatch } from '@/lib/stopwatch';
import { open } from '@/lib/open';
import { cardShadow, useTheme, useThemedStyles, type Theme } from '@/lib/theme';

const COLORS = ['#E25B5B', '#E0A100', '#3CB371', '#2BB8A0', '#3B82C4', '#7C6BC4'];

function initial(title: string) {
  const letter = title.trim().charAt(0);
  return letter ? letter.toLocaleUpperCase(languageNow() === 'en' ? 'en' : 'tr') : '?';
}

function shortTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return text('time.seconds', { seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return text('time.minutes', { minutes });
  const hours = Math.floor(minutes / 60);
  return text('time.hoursMinutes', { hours, minutes: minutes % 60 });
}

export default function LessonsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { t } = useI18n();
  const db = useSQLiteContext();
  const stopwatch = useStopwatch();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [konuDraft, setKonuDraft] = useState<Record<number, { name: string; soru: string }>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [nextSubjects, nextTopics, nextSessions] = await Promise.all([
      listSubjects(db),
      listTopics(db),
      listStudySessions(db),
    ]);
    setSubjects(nextSubjects);
    setTopics(nextTopics);
    setSessions(nextSessions);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([listSubjects(db), listTopics(db), listStudySessions(db)]).then(
        ([nextSubjects, nextTopics, nextSessions]) => {
          if (!active) return;
          setSubjects(nextSubjects);
          setTopics(nextTopics);
          setSessions(nextSessions);
        },
      );
      return () => {
        active = false;
      };
    }, [db]),
  );

  const visible = subjects;
  const activeTopic = topics.find((topic) => topic.id === stopwatch.topicId) ?? null;
  const lastSession = [...sessions].reverse().find((session) => session.topic_id != null);
  const resumeTopic =
    stopwatch.phase !== 'idle' && activeTopic
      ? activeTopic
      : topics.find((topic) => topic.id === lastSession?.topic_id) ?? topics.find((topic) => topic.done === 0) ?? null;
  const resumeMs = stopwatch.phase !== 'idle' ? stopwatch.studyElapsed : lastSession?.study_ms ?? 0;

  async function addKonu(subjectId: number) {
    const draft = konuDraft[subjectId] ?? { name: '', soru: '' };
    const name = draft.name.trim();
    if (!name || busy) return;
    const soru = Number(draft.soru.replace(',', '.'));
    setBusy(true);
    try {
      await insertKonu(db, {
        subjectId,
        title: name,
        questionTotal: Number.isFinite(soru) ? Math.round(soru) : 0,
      });
      setKonuDraft((current) => ({ ...current, [subjectId]: { name: '', soru: '' } }));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(topic: Topic) {
    await setTopicDone(db, topic, topic.done === 0);
    await load();
  }

  async function removeSubject(id: number) {
    await deleteSubject(db, id);
    if (openId === id) setOpenId(null);
    await load();
  }

  async function removeKonu(topic: Topic) {
    await deleteTopic(db, topic);
    await load();
  }

  function resume() {
    if (!resumeTopic) return;
    stopwatch.setTopicId(resumeTopic.id);
    if (stopwatch.phase === 'idle') stopwatch.start();
    router.push('/timer');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {resumeTopic ? (
          <View style={styles.resume}>
            <View style={styles.resumeIcon}>
              <SymbolView
                name={{ ios: 'figure.run', android: 'directions_run', web: 'directions_run' }}
                size={22}
                tintColor="#1F8A7A"
              />
            </View>
            <View style={styles.resumeCopy}>
              <Text numberOfLines={1} style={styles.resumeTitle}>
                {resumeTopic.title}
              </Text>
              <Text style={styles.resumeMeta}>{t('lessons.resume', { time: shortTime(resumeMs) })}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={resume} style={styles.play}>
              <Text style={styles.playGlyph}>▶</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.headingRow}>
          <Text style={styles.heading}>{t('lessons.heading')}</Text>
          <AddButton label={t('common.add')} onPress={() => open('/lesson')} />
        </View>

        {visible.length === 0 ? (
          <EmptyState title={t('lessons.emptyTitle')} body={t('lessons.emptyBody')} />
        ) : (
          visible.map((subject) => {
            const rows = topics.filter((topic) => topic.subject_id === subject.id);
            const soruDone = rows.reduce((sum, topic) => sum + topic.question_done, 0);
            const soruTotal = rows.reduce((sum, topic) => sum + topic.question_total, 0);
            const doneCount = rows.filter((topic) => topic.done === 1).length;
            const percent =
              soruTotal > 0
                ? Math.round((soruDone / soruTotal) * 100)
                : rows.length === 0
                  ? 0
                  : Math.round((doneCount / rows.length) * 100);
            const color = COLORS[subject.color % COLORS.length] ?? COLORS[0];
            const expanded = openId === subject.id;
            const draft = konuDraft[subject.id] ?? { name: '', soru: '' };
            return (
              <SwipeRow enabled={!expanded} key={subject.id} onDelete={() => void removeSubject(subject.id)}>
              <View style={styles.card}>
                <Pressable onPress={() => setOpenId(expanded ? null : subject.id)} style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: color }]}>
                    <Text style={styles.avatarText}>{initial(subject.title)}</Text>
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{subject.title}</Text>
                    <Text style={styles.cardMeta}>
                      {soruTotal > 0
                        ? t('lessons.topicQuestions', { count: rows.length, done: soruDone, total: soruTotal })
                        : t('lessons.topicCount', { count: rows.length })}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
                </Pressable>
                <View style={styles.barRow}>
                  <View style={styles.track}>
                    <View style={[styles.fill, { backgroundColor: color, width: `${percent}%` }]} />
                  </View>
                  <Text style={[styles.percent, { color }]}>%{percent}</Text>
                </View>
                {expanded ? (
                  <View style={styles.konular}>
                    {rows.map((topic) => (
                      <SwipeRow
                        key={topic.id}
                        onDelete={() => void removeKonu(topic)}
                        rounded={false}
                        style={styles.konuSwipe}>
                        <View style={styles.konuRow}>
                          <Pressable
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: topic.done === 1 }}
                            onPress={() => toggle(topic)}
                            style={[styles.check, topic.done === 1 && { backgroundColor: color, borderColor: color }]}>
                            {topic.done === 1 ? <Text style={styles.checkMark}>✓</Text> : null}
                          </Pressable>
                          <View style={styles.konuCopy}>
                            <Text style={[styles.konuTitle, topic.done === 1 && styles.konuDone]}>{topic.title}</Text>
                            {topic.question_total > 0 ? (
                              <Text style={styles.konuMeta}>
                                {t('lessons.questionProgress', { done: topic.question_done, total: topic.question_total })}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </SwipeRow>
                    ))}
                    <View style={styles.addRow}>
                      <TextInput
                        onChangeText={(name) =>
                          setKonuDraft((current) => ({
                            ...current,
                            [subject.id]: { name, soru: current[subject.id]?.soru ?? '' },
                          }))
                        }
                        placeholder={t('lessons.topicPlaceholder')}
                        placeholderTextColor={theme.faint}
                        style={styles.konuInput}
                        value={draft.name}
                      />
                      <TextInput
                        keyboardType="number-pad"
                        onChangeText={(soru) =>
                          setKonuDraft((current) => ({
                            ...current,
                            [subject.id]: { name: current[subject.id]?.name ?? '', soru },
                          }))
                        }
                        placeholder={t('lessons.questionPlaceholder')}
                        placeholderTextColor={theme.faint}
                        style={styles.soruInput}
                        value={draft.soru}
                      />
                      <Pressable accessibilityRole="button" onPress={() => addKonu(subject.id)} style={[styles.addKonu, { backgroundColor: color }]}>
                        <Text style={styles.addKonuText}>{t('common.add')}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
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
  list: {
    gap: 12,
    paddingBottom: 28,
  },
  resume: {
    alignItems: 'center',
    backgroundColor: theme.tealSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  resumeIcon: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  resumeCopy: {
    flex: 1,
    gap: 2,
  },
  resumeTitle: {
    color: theme.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  resumeMeta: {
    color: theme.muted,
    fontSize: 13,
  },
  play: {
    alignItems: 'center',
    backgroundColor: theme.teal,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  playGlyph: {
    color: theme.onAccent,
    fontSize: 16,
    marginLeft: 2,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  heading: {
    color: theme.ink,
    fontSize: 28,
    fontWeight: '800',
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 14,
    ...cardShadow(theme),
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: theme.white,
    fontSize: 18,
    fontWeight: '800',
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: theme.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  cardMeta: {
    color: theme.muted,
    fontSize: 13,
  },
  chevron: {
    color: theme.faint,
    fontSize: 16,
  },
  barRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  track: {
    backgroundColor: theme.line,
    borderRadius: 999,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 999,
    height: 6,
  },
  percent: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 42,
    textAlign: 'right',
  },
  konular: {
    gap: 10,
    marginTop: 14,
  },
  konuSwipe: {
    marginHorizontal: -14,
  },
  konuRow: {
    alignItems: 'center',
    backgroundColor: theme.card,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  check: {
    alignItems: 'center',
    borderColor: theme.line,
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkMark: {
    color: theme.white,
    fontSize: 13,
    fontWeight: '800',
  },
  konuCopy: {
    flex: 1,
  },
  konuTitle: {
    color: theme.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  konuDone: {
    color: theme.muted,
    textDecorationLine: 'line-through',
  },
  konuMeta: {
    color: theme.muted,
    fontSize: 12,
  },
  miniRemove: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  konuInput: {
    backgroundColor: theme.bg,
    borderRadius: 12,
    color: theme.ink,
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  soruInput: {
    backgroundColor: theme.bg,
    borderRadius: 12,
    color: theme.ink,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 72,
  },
  addKonu: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  addKonuText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '800',
  },
  remove: {
    alignSelf: 'flex-start',
  },
  removeText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  });
}

