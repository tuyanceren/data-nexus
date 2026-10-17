import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormPage } from '@/components/form-page';
import { Notice } from '@/components/ui';
import { getNote, saveNote } from '@/lib/db';
import { useI18n } from '@/lib/i18n';
import {
  blankLike,
  blockNumber,
  emptyBlock,
  formatOf,
  packNote,
  readBlocks,
  withFormat,
  type NoteBlock,
  type NoteFormat,
} from '@/lib/note-doc';
import { discardNotePhoto, keepNotePhoto, pickNotePhoto } from '@/lib/photos';
import { useTheme, useThemedStyles, type Theme } from '@/lib/theme';

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const FORMATS: { id: NoteFormat; label: 'notes.sizeTitle' | 'notes.sizeHeading' | 'notes.sizeBody' | 'notes.checklist' | 'notes.bullets' | 'notes.numbers'; mark: string }[] = [
  { id: 'title', label: 'notes.sizeTitle', mark: 'Aa' },
  { id: 'heading', label: 'notes.sizeHeading', mark: 'Aa' },
  { id: 'body', label: 'notes.sizeBody', mark: 'Aa' },
  { id: 'check', label: 'notes.checklist', mark: '○' },
  { id: 'bullet', label: 'notes.bullets', mark: '•' },
  { id: 'number', label: 'notes.numbers', mark: '1.' },
];

export default function NoteForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const idText = param(params.id);
  const id = idText ? Number(idText) : null;
  const db = useSQLiteContext();
  const { t } = useI18n();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const savedPhoto = useRef<string | null>(null);
  const inputs = useRef(new Map<string, { focus: () => void }>());
  const serial = useRef(1);
  const [blocks, setBlocks] = useState<NoteBlock[]>([emptyBlock()]);
  const [activeId, setActiveId] = useState('1');
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(id == null);

  useEffect(() => {
    if (!pendingFocus) return;
    inputs.current.get(pendingFocus)?.focus();
    setPendingFocus(null);
  }, [pendingFocus, blocks]);

  useEffect(() => {
    if (id == null || Number.isNaN(id)) return;
    let active = true;
    getNote(db, id)
      .then((note) => {
        if (!active) return;
        if (!note) {
          setError(t('notes.missing'));
          setReady(true);
          return;
        }
        const next = readBlocks(note.title, note.body);
        savedPhoto.current = note.photo;
        setBlocks(next);
        setActiveId(next[0]?.id ?? '1');
        setPhoto(note.photo);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setError(t('notes.missing'));
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [db, id]);

  function freshId() {
    serial.current += 1;
    return `b${serial.current}`;
  }

  function changeText(blockId: string, text: string) {
    setBlocks((current) => current.map((block) => (block.id === blockId ? { ...block, text } : block)));
  }

  function applyFormat(format: NoteFormat) {
    const target = blocks.find((block) => block.id === activeId) ?? blocks[blocks.length - 1];
    if (!target) return;
    setActiveId(target.id);
    setBlocks((current) => current.map((block) => (block.id === target.id ? withFormat(block, format) : block)));
    setPendingFocus(target.id);
  }

  function insertAfter(blockId: string) {
    const created = freshId();
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === blockId);
      const source = current[index];
      if (!source) return current;
      const next = current.slice();
      next.splice(index + 1, 0, blankLike(source, created));
      return next;
    });
    setActiveId(created);
    setPendingFocus(created);
  }

  function removeBlock(blockId: string) {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (blocks.length <= 1) {
      setBlocks((current) => current.map((block) => (block.id === blockId ? { ...block, text: '' } : block)));
      return;
    }
    const next = blocks.filter((block) => block.id !== blockId);
    const focus = next[Math.max(0, index - 1)];
    setBlocks(next);
    if (focus) {
      setActiveId(focus.id);
      setPendingFocus(focus.id);
    }
  }

  function toggleCheck(blockId: string) {
    setBlocks((current) =>
      current.map((block) => (block.id === blockId && block.kind === 'check' ? { ...block, done: !block.done } : block)),
    );
  }

  async function choose(camera: boolean) {
    setError('');
    const picked = await pickNotePhoto(camera);
    if (picked.status === 'picked') {
      setPhoto(picked.uri);
      return;
    }
    if (picked.status === 'denied') {
      setError(t(picked.kind === 'camera' ? 'notes.cameraDenied' : 'notes.libraryDenied'));
    } else if (picked.status === 'unavailable') {
      setError(t(camera ? 'notes.cameraUnavailable' : 'notes.photoFailed'));
    }
  }

  async function save() {
    const packed = packNote(blocks, t('notes.untitled'));
    if (packed.empty && !photo) {
      setError(t('notes.needText'));
      return;
    }
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      let stored = savedPhoto.current;
      if (photo !== savedPhoto.current) {
        stored = photo ? await keepNotePhoto(photo) : null;
        if (savedPhoto.current && savedPhoto.current !== stored) await discardNotePhoto(savedPhoto.current);
      }
      await saveNote(db, { id, title: packed.title, body: packed.body, photo: stored });
      if (router.canGoBack()) router.back();
      else router.replace('/notes' as Href);
    } catch {
      setError(t('notes.saveFailed'));
      setBusy(false);
    }
  }

  const active = blocks.find((block) => block.id === activeId) ?? blocks[blocks.length - 1];
  const selected = formatOf(active);

  if (!ready) return null;

  return (
    <FormPage
      busy={busy}
      footer={
        <View style={styles.bar}>
          <Pressable accessibilityLabel={t('notes.takePhoto')} accessibilityRole="button" hitSlop={6} onPress={() => void choose(true)} style={styles.hit}>
            <SymbolView name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }} size={22} tintColor={theme.ink} />
          </Pressable>
          <Pressable accessibilityLabel={t('notes.choosePhoto')} accessibilityRole="button" hitSlop={6} onPress={() => void choose(false)} style={styles.hit}>
            <SymbolView name={{ ios: 'photo', android: 'photo_library', web: 'photo_library' }} size={22} tintColor={theme.ink} />
          </Pressable>
          <View style={styles.rule} />
          {FORMATS.map((format) => {
            const on = selected === format.id;
            const icon = format.id === 'check' || format.id === 'bullet' || format.id === 'number';
            return (
              <Pressable
                accessibilityLabel={t(format.label)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                hitSlop={4}
                key={format.id}
                onPress={() => applyFormat(format.id)}
                style={[styles.hit, on ? styles.hitOn : null]}>
                {icon ? (
                  <SymbolView
                    name={
                      format.id === 'check'
                        ? { ios: 'checklist', android: 'checklist', web: 'checklist' }
                        : format.id === 'bullet'
                          ? { ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }
                          : { ios: 'list.number', android: 'format_list_numbered', web: 'format_list_numbered' }
                    }
                    size={20}
                    tintColor={on ? theme.accent : theme.ink}
                  />
                ) : (
                  <Text style={[styles.sizeMark, format.id === 'heading' ? styles.sizeHeading : null, format.id === 'body' ? styles.sizeBody : null, on ? styles.sizeOn : null]}>
                    Aa
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      }
      onSave={() => void save()}
      title={id == null ? t('notes.new') : t('notes.edit')}>
      {photo ? (
        <View style={styles.photoBox}>
          <Image source={{ uri: photo }} style={styles.photo} />
          <Pressable accessibilityLabel={t('notes.removePhoto')} accessibilityRole="button" hitSlop={8} onPress={() => setPhoto(null)} style={styles.remove}>
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={12} tintColor={theme.white} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.paper}>
        {blocks.map((block, index) => (
          <View key={block.id} style={styles.line}>
            {block.kind === 'check' ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: block.done }}
                hitSlop={8}
                onPress={() => toggleCheck(block.id)}
                style={[styles.check, block.done ? styles.checkOn : null]}>
                {block.done ? <Text style={styles.checkMark}>✓</Text> : null}
              </Pressable>
            ) : null}
            {block.kind === 'bullet' ? <View style={styles.dot} /> : null}
            {block.kind === 'number' ? <Text style={styles.number}>{blockNumber(blocks, index)}.</Text> : null}
            <TextInput
              ref={(node) => {
                if (node) inputs.current.set(block.id, node);
                else inputs.current.delete(block.id);
              }}
              blurOnSubmit={false}
              onChangeText={(text) => changeText(block.id, text)}
              onFocus={() => setActiveId(block.id)}
              onKeyPress={(event) => {
                if (event.nativeEvent.key === 'Backspace' && block.text.length === 0) removeBlock(block.id);
              }}
              onSubmitEditing={() => insertAfter(block.id)}
              placeholder={block.text.length === 0 && index === 0 && blocks.length === 1 ? t('notes.start') : undefined}
              placeholderTextColor={theme.faint}
              style={[
                styles.input,
                block.kind === 'text' && block.size === 'title' ? styles.inputTitle : null,
                block.kind === 'text' && block.size === 'heading' ? styles.inputHeading : null,
                block.kind === 'check' && block.done ? styles.inputDone : null,
              ]}
              value={block.text}
            />
          </View>
        ))}
      </View>
      {error ? <Notice>{error}</Notice> : null}
    </FormPage>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    photoBox: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    photo: {
      backgroundColor: theme.card,
      height: 220,
      width: '100%',
    },
    remove: {
      alignItems: 'center',
      backgroundColor: 'rgba(21, 33, 43, 0.55)',
      borderRadius: 14,
      height: 28,
      justifyContent: 'center',
      position: 'absolute',
      right: 10,
      top: 10,
      width: 28,
    },
    paper: {
      paddingTop: 2,
    },
    line: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      minHeight: 40,
    },
    input: {
      color: theme.ink,
      flex: 1,
      fontSize: 17,
      lineHeight: 24,
      minHeight: 36,
      paddingVertical: 6,
    },
    inputTitle: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 34,
      minHeight: 44,
    },
    inputHeading: {
      fontSize: 21,
      fontWeight: '600',
      lineHeight: 28,
      minHeight: 40,
    },
    inputDone: {
      color: theme.muted,
      textDecorationLine: 'line-through',
    },
    check: {
      alignItems: 'center',
      borderColor: theme.faint,
      borderRadius: 11,
      borderWidth: 1.5,
      height: 22,
      justifyContent: 'center',
      width: 22,
    },
    checkOn: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    checkMark: {
      color: theme.onAccent,
      fontSize: 13,
      fontWeight: '700',
    },
    dot: {
      backgroundColor: theme.ink,
      borderRadius: 3,
      height: 6,
      marginLeft: 8,
      width: 6,
    },
    number: {
      color: theme.muted,
      fontSize: 16,
      fontWeight: '600',
      minWidth: 24,
      textAlign: 'right',
    },
    bar: {
      alignItems: 'center',
      borderTopColor: theme.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: -8,
      paddingTop: 6,
    },
    rule: {
      backgroundColor: theme.line,
      height: 22,
      width: StyleSheet.hairlineWidth,
    },
    hit: {
      alignItems: 'center',
      borderRadius: 12,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    hitOn: {
      backgroundColor: theme.accentSoft,
    },
    sizeMark: {
      color: theme.ink,
      fontSize: 18,
      fontWeight: '700',
    },
    sizeHeading: {
      fontSize: 16,
    },
    sizeBody: {
      fontSize: 13,
      fontWeight: '600',
    },
    sizeOn: {
      color: theme.accent,
    },
  });
}
