import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { FormPage } from '@/components/form-page';
import { Field } from '@/components/ui';
import { insertSubject, listSubjects } from '@/lib/db';
import { useI18n } from '@/lib/i18n';

export default function SubjectForm() {
  const db = useSQLiteContext();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const subjects = await listSubjects(db);
      await insertSubject(db, { title: name, color: subjects.length % 6, examId: null });
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormPage busy={busy || title.trim().length === 0} onSave={() => void save()} title={t('lessons.addSubject')}>
      <Field label={t('lessons.subject')} onChangeText={setTitle} placeholder={t('lessons.subjectPlaceholder')} value={title} />
    </FormPage>
  );
}
