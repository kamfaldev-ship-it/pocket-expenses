export const MIN_PASSWORD = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeEmail = (v: string) => v.trim().toLowerCase();

export const validEmail = (v: string) => EMAIL_RE.test(normalizeEmail(v));

/** Message d'erreur en français, ou '' si le mot de passe est acceptable. */
export const passwordError = (v: string): string => {
  if (v.length < MIN_PASSWORD) return `Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`;
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Mélange des lettres et des chiffres.';
  return '';
};

/** Erreur de Supabase Auth → message français, sans jamais afficher du texte technique. */
export const frenchAuthError = (err: { code?: string; message?: string } | null | undefined): string => {
  if (!err) return '';
  const msg = (err.message ?? '').toLowerCase();
  switch (err.code) {
    case 'invalid_credentials':
      return 'Email ou mot de passe incorrect.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Cette adresse a déjà un compte. Connecte-toi.';
    case 'email_not_confirmed':
      return 'Confirme ton adresse avec le lien reçu par email, puis reconnecte-toi.';
    case 'weak_password':
      return 'Mot de passe trop faible. Ajoute des caractères.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Trop de tentatives. Réessaie dans quelques minutes.';
    case 'signup_disabled':
      return 'Les inscriptions sont fermées pour le moment.';
    case 'validation_failed':
      return 'Vérifie l’adresse email saisie.';
  }
  if (msg.includes('network') || msg.includes('fetch')) return 'Pas de connexion. Vérifie ton réseau et réessaie.';
  if (msg.includes('invalid login')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('already registered')) return 'Cette adresse a déjà un compte. Connecte-toi.';
  if (msg.includes('rate limit')) return 'Trop de tentatives. Réessaie dans quelques minutes.';
  return 'Une erreur est survenue. Réessaie.';
};
