# Pocket : règles du projet

## Documentation (à chaque modification)

Après chaque modification (code, suppression, config), mets à jour tous les fichiers `.md` (`mobile/README.md`, `CLAUDE.md`) dans la même réponse, avec ce qui a été fait pendant la session :
- **Historique des versions** et **Modèle de données** si une fonction ou un champ change.
- **Décisions** : chaque choix pris avec l'utilisateur, et pourquoi.
- **Patterns utilisés** : tout nouveau pattern réutilisable.
- **Erreurs rencontrées et corrigées** : le symptôme et la correction.
- Augmente la version dans `mobile/app.json` quand une fonction est ajoutée.

## Contexte

- App Expo (SDK 58) dans `mobile/`. La partie web d'origine a été supprimée : seul le mobile reste.
- Interface en français, montants en FCFA.
- Avant de conclure : `npx tsc --noEmit`, `npx eslint src`, `npx jest`.
