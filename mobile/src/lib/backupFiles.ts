import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { parseBackup, serializeBackup, toCsv, type ParsedBackup } from './backup';
import type { AppState } from './types';

const stamp = (d = new Date()) => d.toISOString().slice(0, 10);

async function shareText(name: string, content: string, mimeType: string, uti: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: 'Exporter mes données Pocket' });
}

export const exportJson = (s: AppState) =>
  shareText(`pocket-sauvegarde-${stamp()}.json`, serializeBackup(s), 'application/json', 'public.json');

export const exportCsv = (s: AppState) =>
  shareText(`pocket-transactions-${stamp()}.csv`, toCsv(s), 'text/csv', 'public.comma-separated-values-text');

/** Lets the user pick a backup file; returns null when they cancel. */
export async function pickBackup(): Promise<ParsedBackup | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  try {
    const raw = asset.file ? await asset.file.text() : await new File(asset.uri).text();
    return parseBackup(raw);
  } catch {
    return { ok: false, error: 'Impossible de lire ce fichier.' };
  }
}
