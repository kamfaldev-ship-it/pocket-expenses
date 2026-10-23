import { Image } from 'expo-image';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph } from './Icon';
import { photoUri } from '@/lib/photos';

/** Full-screen view of a receipt photo; tap anywhere or the cross to close. */
export function PhotoViewer({ name, onClose }: { name: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={name !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Fermer la photo" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
        {name && <Image source={{ uri: photoUri(name) }} contentFit="contain" style={{ flex: 1, margin: 12 }} accessibilityLabel="Photo jointe" />}
        <View style={{ position: 'absolute', top: insets.top + 8, right: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="close" color="#fff" size={26} />
        </View>
      </Pressable>
    </Modal>
  );
}
