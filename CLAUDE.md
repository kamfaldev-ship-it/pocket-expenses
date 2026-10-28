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

## Notes de session (1.5.0)

- Onboarding au premier lancement : `store/onboarding.tsx` + `components/Onboarding.tsx` (détails dans `mobile/README.md`).
- Bug de la croix de la feuille d'ajout : correctif `Keyboard.dismiss()` dans `useGuardedClose`, à confirmer sur appareil.
- 1.5.1 : `key={nonce}` sur la `Modal` des feuilles d'ajout, d'épargne et de budget (2e tentative sur la croix qui ne répond plus).
- 1.5.2 : en-tête de `SheetFrame` sorti du `ScrollView` (la croix ne recevait pas le toucher à la 2e ouverture ; le fond sombre, hors du `ScrollView`, fonctionnait).
