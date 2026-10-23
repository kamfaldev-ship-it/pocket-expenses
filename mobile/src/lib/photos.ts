import { Directory, File, Paths } from 'expo-file-system';
import type { Transaction } from './types';

/** Receipt photos live in the app's document folder; transactions only keep the file name. */
const dir = () => new Directory(Paths.document, 'receipts');

const ensureDir = () => {
  const d = dir();
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
};

export const newPhotoName = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.jpg`;

/** Files on disk that no transaction refers to. */
export const orphanNames = (onDisk: string[], txs: Pick<Transaction, 'photo'>[]) => {
  const used = new Set(txs.map((t) => t.photo).filter(Boolean));
  return onDisk.filter((n) => !used.has(n));
};

/** Copies a picked or captured image into the app folder and returns its stored name. */
export function savePhoto(sourceUri: string): string {
  const name = newPhotoName();
  new File(sourceUri).copy(new File(ensureDir(), name));
  return name;
}

export const photoUri = (name: string) => new File(dir(), name).uri;

/** Deletes photos no transaction uses (after a delete, import, wipe or an abandoned form). */
export function cleanupOrphans(txs: Pick<Transaction, 'photo'>[]) {
  try {
    const d = dir();
    if (!d.exists) return;
    const names = d.list().map((f) => f.name);
    orphanNames(names, txs).forEach((n) => {
      try {
        new File(d, n).delete();
      } catch {
        // A file we cannot remove now is retried at the next launch.
      }
    });
  } catch {
    // Never block the app on housekeeping.
  }
}
