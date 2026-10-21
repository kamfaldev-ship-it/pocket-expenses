import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { confirmAction } from '@/components/confirm';
import { CatGlyph, Glyph } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Button, Card, CatBadge, H3, Label, Segmented, Title } from '@/components/ui';
import { COLORS, ICONS } from '@/lib/defaults';
import { exportCsv, exportJson, pickBackup } from '@/lib/backupFiles';
import { newId } from '@/lib/ids';
import type { ThemePref } from '@/lib/types';
import { useStore } from '@/store';
import { useLock } from '@/store/lock';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

export default function Settings() {
  const t = useTheme();
  const { state, dispatch } = useStore();
  const { showToast } = useUI();
  const lock = useLock();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState('heart');
  const [err, setErr] = useState('');
  const [sure, setSure] = useState(false);
  const sureTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(sureTimer.current), []);

  const addCat = () => {
    const n = name.trim();
    if (!n) return setErr('Donne un nom à ta catégorie.');
    if (state.cats.some((c) => c.name.toLowerCase() === n.toLowerCase())) return setErr('Cette catégorie existe déjà.');
    dispatch({ type: 'addCat', cat: { id: 'c' + newId(), name: n, color, icon } });
    setName('');
    setErr('');
    showToast('Catégorie ajoutée');
  };

  const delCat = (id: string) => {
    if (state.cats.length <= 1) return showToast('Garde au moins une catégorie');
    const index = state.cats.findIndex((c) => c.id === id);
    const cat = state.cats[index];
    const moved = state.tx.filter((x) => x.cat === id).map((x) => x.id);
    dispatch({ type: 'deleteCat', id });
    showToast('Catégorie supprimée', () => dispatch({ type: 'restoreCat', cat, index, moved }));
  };

  const wipe = () => {
    if (sure) {
      clearTimeout(sureTimer.current);
      setSure(false);
      dispatch({ type: 'wipe' });
      return showToast('Données effacées');
    }
    setSure(true);
    sureTimer.current = setTimeout(() => setSure(false), 4000);
  };

  const run = async (job: () => Promise<void>) => {
    try {
      await job();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Une erreur est survenue.');
    }
  };

  const importBackup = () =>
    run(async () => {
      const res = await pickBackup();
      if (!res) return;
      if (!res.ok) return showToast(res.error);
      const { tx, savings, recurring } = res.summary;
      confirmAction(
        'Remplacer tes données ?',
        `Cette sauvegarde contient ${tx} transaction${tx > 1 ? 's' : ''}, ${savings} mouvement${savings > 1 ? 's' : ''} de caisse et ${recurring} règle${recurring > 1 ? 's' : ''}. Tes données actuelles seront remplacées.`,
        'Remplacer',
        () => {
          dispatch({ type: 'import', state: res.state });
          showToast('Sauvegarde importée');
        },
      );
    });

  return (
    <Screen>
      <View style={{ marginHorizontal: 4, marginBottom: 16 }}>
        <Title>Réglages</Title>
      </View>

      <Card style={{ marginTop: 0 }}>
        <H3 style={{ marginBottom: 12 }}>Apparence</H3>
        <Segmented<ThemePref>
          value={state.theme}
          onChange={(theme) => dispatch({ type: 'setTheme', theme })}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ]}
        />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <H3>Verrouillage</H3>
            <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute, marginTop: 2 }}>
              Face ID ou code du téléphone à chaque ouverture.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Verrouiller Pocket avec Face ID ou le code du téléphone"
            value={lock.enabled}
            trackColor={{ true: t.brand }}
            onValueChange={(on) => {
              lock.setEnabled(on).then((err) => showToast(err ?? (on ? 'Verrouillage activé' : 'Verrouillage désactivé')));
            }}
          />
        </View>
      </Card>

      <Card>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/budgets')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name="wallet" color={t.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>Budgets</Text>
            <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>
              {Object.keys(state.budgets).length
                ? `${Object.keys(state.budgets).length} limite${Object.keys(state.budgets).length > 1 ? 's' : ''} mensuelle${Object.keys(state.budgets).length > 1 ? 's' : ''}`
                : 'Une limite mensuelle par catégorie'}
            </Text>
          </View>
          <Glyph name="right" color={t.mute} />
        </Pressable>
      </Card>

      <Card>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/recurring')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name="repeat" color={t.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>Récurrences</Text>
            <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>
              {state.recurring.length
                ? `${state.recurring.length} règle${state.recurring.length > 1 ? 's' : ''} active${state.recurring.length > 1 ? 's' : ''}`
                : 'Loyer, abonnements, versement mensuel en caisse'}
            </Text>
          </View>
          <Glyph name="right" color={t.mute} />
        </Pressable>
      </Card>

      <Card>
        <H3 style={{ marginBottom: 6 }}>Catégories</H3>
        {state.cats.map((c, i) => (
          <View
            key={c.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              borderTopWidth: i ? 1 : 0,
              borderColor: t.line,
            }}>
            <CatBadge cat={c} />
            <Text style={{ flex: 1, fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>{c.name}</Text>
            <Pressable accessibilityLabel={`Supprimer ${c.name}`} hitSlop={8} onPress={() => delCat(c.id)} style={{ padding: 8 }}>
              <Glyph name="close" color={t.mute} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Card>
        <H3 style={{ marginBottom: 12 }}>Nouvelle catégorie</H3>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            setErr('');
          }}
          maxLength={20}
          placeholder="Nom (ex. Santé)"
          placeholderTextColor={t.mute}
          accessibilityLabel="Nom de la catégorie"
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.line,
            borderRadius: 16,
            paddingVertical: 13,
            paddingHorizontal: 14,
            fontFamily: fonts.body400,
            color: t.ink,
          }}
        />
        <Label>Couleur</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              accessibilityLabel={`Couleur ${c}`}
              accessibilityState={{ selected: c === color }}
              onPress={() => setColor(c)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: c,
                borderWidth: 3,
                borderColor: t.card,
                outlineWidth: 0,
                shadowColor: t.ink,
                shadowOpacity: c === color ? 1 : 0,
                shadowRadius: 0,
                shadowOffset: { width: 0, height: 0 },
                transform: [{ scale: c === color ? 1.12 : 1 }],
              }}
            />
          ))}
        </View>
        <Label>Icône</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.keys(ICONS).map((k) => {
            const on = k === icon;
            return (
              <Pressable
                key={k}
                accessibilityLabel={`Icône ${k}`}
                accessibilityState={{ selected: on }}
                onPress={() => setIcon(k)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? t.brandSoft : t.card,
                  borderWidth: 1.5,
                  borderColor: on ? t.brand : t.line,
                }}>
                <CatGlyph name={k} color={on ? t.brand : t.ink} />
              </Pressable>
            );
          })}
        </View>
        <Text accessibilityRole="alert" style={{ color: t.out, fontSize: 13, marginTop: 8, marginLeft: 4, minHeight: 16 }}>
          {err}
        </Text>
        <Button label="Ajouter la catégorie" onPress={addCat} style={{ marginTop: 10 }} />
      </Card>

      <Card>
        <H3 style={{ marginBottom: 6 }}>Données</H3>
        <Text style={{ fontFamily: fonts.body400, color: t.mute, marginBottom: 14 }}>
          {"Tout reste sur ton téléphone. Exporte une sauvegarde pour changer de téléphone ou garder une copie."}
        </Text>
        <View style={{ gap: 10 }}>
          <Button label="Exporter une sauvegarde" variant="ghost" onPress={() => run(() => exportJson(state))} />
          <Button label="Exporter les transactions (CSV)" variant="ghost" onPress={() => run(() => exportCsv(state))} />
          <Button label="Importer une sauvegarde" variant="ghost" onPress={importBackup} />
          <Button variant="danger" label={sure ? 'Confirmer : tout effacer ?' : 'Tout effacer'} onPress={wipe} />
        </View>
      </Card>
    </Screen>
  );
}
