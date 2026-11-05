import { frenchAuthError, normalizeEmail, passwordError, validEmail } from './authForm';

describe('authForm', () => {
  it('valide les emails', () => {
    expect(validEmail('  Awa@Mail.ci ')).toBe(true);
    expect(validEmail('awa@mail')).toBe(false);
    expect(validEmail('awa mail@x.ci')).toBe(false);
    expect(validEmail('')).toBe(false);
  });

  it('normalise les emails', () => {
    expect(normalizeEmail('  Awa@Mail.CI ')).toBe('awa@mail.ci');
  });

  it('exige 8 caractères avec lettres et chiffres', () => {
    expect(passwordError('abc123')).not.toBe('');
    expect(passwordError('abcdefgh')).not.toBe('');
    expect(passwordError('12345678')).not.toBe('');
    expect(passwordError('abcd1234')).toBe('');
  });

  it('traduit les erreurs Supabase', () => {
    expect(frenchAuthError({ code: 'invalid_credentials' })).toMatch(/incorrect/);
    expect(frenchAuthError({ code: 'user_already_exists' })).toMatch(/déjà un compte/);
    expect(frenchAuthError({ message: 'Network request failed' })).toMatch(/connexion/);
    expect(frenchAuthError({ message: 'something weird' })).toBe('Une erreur est survenue. Réessaie.');
    expect(frenchAuthError(null)).toBe('');
  });
});
