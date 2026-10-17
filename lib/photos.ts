import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PhotoPick =
  | { status: 'picked'; uri: string }
  | { status: 'canceled' }
  | { status: 'denied'; kind: 'camera' | 'library' }
  | { status: 'unavailable' };

export async function pickNotePhoto(camera: boolean): Promise<PhotoPick> {
  try {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { status: 'denied', kind: 'camera' };
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (result.canceled || !result.assets[0]?.uri) return { status: 'canceled' };
      return { status: 'picked', uri: result.assets[0].uri };
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: 'denied', kind: 'library' };
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]?.uri) return { status: 'canceled' };
    return { status: 'picked', uri: result.assets[0].uri };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function keepNotePhoto(sourceUri: string) {
  if (Platform.OS === 'web' && sourceUri.startsWith('blob:')) return sourceUri;
  const folder = new Directory(Paths.document, 'note-photos');
  if (!folder.exists) folder.create();
  const ext = sourceUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const dest = new File(folder, `${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`);
  await new File(sourceUri).copy(dest);
  return dest.uri;
}

export async function discardNotePhoto(uri: string | null) {
  if (!uri || Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The note remains even if the file was already removed.
  }
}
