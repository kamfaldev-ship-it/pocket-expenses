import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, H3, Segmented } from '@/components/ui';
import { normalizeEmail, passwordError, validEmail } from '@/lib/authForm';
import { useAuth } from '@/store/auth';
import { fonts, useTheme } from '@/theme';

type TextInputRef = React.ComponentRef<typeof TextInput>;
type Mode = 'signin' | 'signup' | 'forgot';

function Field({ label, error, ...props }: TextInputProps & { label: string; error?: boolean; ref?: React.Ref<TextInputRef> }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontFamily: fonts.body600, fontSize: 13, color: t.mute, marginBottom: 6, marginLeft: 4 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.mute}
        style={{
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: error ? t.out : t.line,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 14,
          fontFamily: fonts.body400,
          fontSize: 16,
          color: t.ink,
        }}
        {...props}
      />
    </View>
  );
}

/** Connexion, inscription et mot de passe oublié sur un seul écran (le compte reste facultatif). */
export default function AuthScreen() {
  const t = useTheme();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const passwordRef = useRef<TextInputRef>(null);

  // Connecté (ou déjà connecté en arrivant ici) : on quitte l'écran.
  const signedIn = Boolean(auth.user);
  useEffect(() => {
    if (!signedIn) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [signedIn]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setErr('');
    setInfo('');
  };

  const submit = async () => {
    if (busy) return;
    setErr('');
    setInfo('');
    if (!validEmail(email)) return setErr('Entre une adresse email valide.');
    if (mode === 'signup') {
      const pe = passwordError(password);
      if (pe) return setErr(pe);
    }
    if (mode === 'signin' && !password) return setErr('Entre ton mot de passe.');

    setBusy(true);
    try {
      if (mode === 'forgot') {
        const r = await auth.resetPassword(email);
        if (r.error) setErr(r.error);
        else setInfo('Si cette adresse a un compte, un email de réinitialisation vient de partir.');
      } else if (mode === 'signin') {
        const r = await auth.signIn(email, password);
        if (r.error) setErr(r.error);
      } else {
        const r = await auth.signUp(email, password, name);
        if (r.error) setErr(r.error);
        else if (r.confirm) {
          setInfo('Compte créé. Ouvre l’email de confirmation que nous venons d’envoyer, puis reviens te connecter.');
          setMode('signin');
          setPassword('');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (!auth.configured) {
    return (
      <Screen pushed>
        <Card style={{ marginTop: 0 }}>
          <H3>Comptes bientôt disponibles</H3>
          <Text style={{ fontFamily: fonts.body400, color: t.mute, marginTop: 6 }}>
            Cette version n’est pas encore reliée à un serveur. Tes données restent sur ton téléphone.
          </Text>
        </Card>
      </Screen>
    );
  }

  const title = mode === 'signin' ? 'Content de te revoir' : mode === 'signup' ? 'Crée ton compte' : 'Mot de passe oublié';
  const lead =
    mode === 'signin'
      ? 'Connecte-toi pour retrouver ton compte Pocket.'
      : mode === 'signup'
        ? 'Un compte est facultatif. Il servira à sauvegarder tes données et à les retrouver sur un autre téléphone.'
        : 'Entre ton adresse email, nous t’envoyons un lien pour choisir un nouveau mot de passe.';
  const cta = mode === 'signin' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien';

  return (
    <Screen pushed>
      <Card style={{ marginTop: 0 }}>
        {mode !== 'forgot' && (
          <Segmented<'signin' | 'signup'>
            value={mode}
            onChange={switchMode}
            options={[
              { value: 'signin', label: 'Connexion' },
              { value: 'signup', label: 'Inscription' },
            ]}
          />
        )}
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fonts.display800, fontSize: 24, letterSpacing: -0.4, color: t.ink, marginTop: mode === 'forgot' ? 0 : 20 }}>
          {title}
        </Text>
        <Text style={{ fontFamily: fonts.body400, fontSize: 14, lineHeight: 20, color: t.mute, marginTop: 6 }}>{lead}</Text>

        {mode === 'signup' && (
          <Field
            label="Prénom (facultatif)"
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="next"
          />
        )}
        <Field
          label="Email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setErr('');
          }}
          onBlur={() => setEmail(normalizeEmail(email))}
          placeholder="toi@exemple.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType={mode === 'forgot' ? 'send' : 'next'}
          onSubmitEditing={mode === 'forgot' ? submit : () => passwordRef.current?.focus()}
        />
        {mode !== 'forgot' && (
          <View>
            <Field
              label="Mot de passe"
              ref={passwordRef}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setErr('');
              }}
              placeholder={mode === 'signup' ? '8 caractères, lettres et chiffres' : 'Ton mot de passe'}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              onPress={() => setShow((v) => !v)}
              hitSlop={6}
              style={{ position: 'absolute', right: 6, bottom: 4, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.body600, fontSize: 13, color: t.brand }}>{show ? 'Masquer' : 'Afficher'}</Text>
            </Pressable>
          </View>
        )}

        <Text
          accessibilityRole="alert"
          style={{ fontFamily: fonts.body500, color: t.out, fontSize: 13, marginTop: 10, marginLeft: 4, minHeight: err ? undefined : 0 }}>
          {err}
        </Text>
        {info ? (
          <Text style={{ fontFamily: fonts.body500, color: t.inn, fontSize: 13, lineHeight: 18, marginTop: 10, marginLeft: 4 }}>{info}</Text>
        ) : null}

        <Button label={busy ? 'Un instant…' : cta} onPress={submit} style={{ marginTop: 14, opacity: busy ? 0.6 : 1 }} />

        {mode === 'signin' && (
          <Pressable accessibilityRole="button" onPress={() => switchMode('forgot')} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
            <Text style={{ fontFamily: fonts.body600, fontSize: 14, color: t.brand }}>Mot de passe oublié ?</Text>
          </Pressable>
        )}
        {mode === 'forgot' && (
          <Pressable accessibilityRole="button" onPress={() => switchMode('signin')} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
            <Text style={{ fontFamily: fonts.body600, fontSize: 14, color: t.brand }}>Retour à la connexion</Text>
          </Pressable>
        )}
      </Card>
    </Screen>
  );
}
