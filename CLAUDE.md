# Pocket : règles du projet

## Documentation (à chaque modification)

Après chaque modification du code, mets à jour `mobile/README.md` dans la même réponse :
- **Historique des versions** et **Modèle de données** si une fonction ou un champ change.
- **Décisions** : chaque choix pris avec l'utilisateur, et pourquoi.
- **Patterns utilisés** : tout nouveau pattern réutilisable.
- **Erreurs rencontrées et corrigées** : le symptôme et la correction.
- Augmente la version dans `mobile/app.json` quand une fonction est ajoutée.

Ne touche pas à `ios/App/CapApp-SPM/README.md` (généré par Capacitor, ancienne version).

## Contexte

- App Expo (SDK 57) dans `mobile/`. L'app web d'origine (`index.html`, `ios/`, `www/`) reste intacte.
- Interface en français, montants en FCFA.
- Avant de conclure : `npx tsc --noEmit`, `npx eslint src`, `npx jest`.
