import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { CatBadge, shadow } from './ui';
import { Glyph } from './Icon';
import { PressScale } from './motion';
import { dayMonthShort } from '@/lib/dates';
import { fcfa } from '@/lib/format';
import { findCat } from '@/lib/selectors';
import type { Category, Transaction } from '@/lib/types';
import { fonts, useTheme } from '@/theme';

interface Props {
  tx: Transaction;
  cats: Category[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

export function TransactionRow({ tx, cats, onEdit, onDelete }: Props) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const cat = findCat(cats, tx.cat);
  const isIn = tx.type === 'in';
  const date = dayMonthShort(tx.date);
  return (
    <Animated.View
      layout={reduce ? undefined : LinearTransition.duration(250)}
      exiting={reduce ? undefined : FadeOut.duration(160)}
      style={[
        { backgroundColor: t.card, borderColor: t.line, borderWidth: 1, borderRadius: 22, marginBottom: 8, overflow: 'hidden' },
        shadow(t),
      ]}>
      <PressScale
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        scaleTo={0.985}
        onPress={() => setOpen((o) => !o)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
        <CatBadge cat={cat} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>{cat.name}</Text>
          <Text numberOfLines={1} style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>
            {tx.note ? tx.note.replace(/\s+/g, ' ') : date}
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.display700, fontSize: 16, color: isIn ? t.inn : t.out }}>
          {isIn ? '+' : '−'}
          {fcfa(tx.amount)}
        </Text>
      </PressScale>
      {open && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          {tx.note ? (
            <Text
              selectable
              style={{
                fontFamily: fonts.body400,
                fontSize: 14.5,
                color: t.ink,
                backgroundColor: t.bg,
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginBottom: 10,
              }}>
              {tx.note}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ fontFamily: fonts.body400, fontSize: 13.5, color: t.mute, flexShrink: 1 }}>
              {date}
              {tx.note ? '' : ' · Pas de note'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onEdit(tx)}
                style={[act, { backgroundColor: t.brandSoft }]}>
                <Glyph name="edit" color={t.brand} />
                <Text style={{ fontFamily: fonts.body600, color: t.brand }}>{tx.note ? 'Modifier' : 'Ajouter une note'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => onDelete(tx)} style={[act, { backgroundColor: t.outSoft }]}>
                <Glyph name="trash" color={t.out} />
                <Text style={{ fontFamily: fonts.body600, color: t.out }}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const act = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  minHeight: 44,
  paddingHorizontal: 14,
  borderRadius: 12,
};
