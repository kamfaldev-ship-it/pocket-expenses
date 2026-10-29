# Pocket (mobile)

Suivi de dépenses en React Native + Expo (iOS et Android). Interface en français, montants en FCFA. Les données restent sur le téléphone. L'ancienne version web a été supprimée : le dépôt ne contient plus que l'app mobile.

## Démarrer

```bash
cd mobile
npm install            # .npmrc active legacy-peer-deps
npx expo start -c      # puis scanner le QR code avec Expo Go (SDK 58)
npm test               # Jest (53 tests)
npm run typecheck
npx eslint src
npx expo-doctor
```

Redémarre le serveur avec `-c` après chaque modification : Metro ne détecte pas les changements dans ce dossier (l'espace à la fin de « TOOL PERSO »). Renommer le dossier sans l'espace réglerait sans doute le problème.

## Publier

Expo Go sert au développement seulement. Pour l'App Store : `eas build --profile preview` pour tester, puis `production` et `eas submit`. Identifiant `com.kamfal.pocket`. Le verrouillage Face ID ne fonctionne vraiment que dans un build (Expo Go retombe sur le code du téléphone).

## Architecture

- `src/app/` : routes expo-router. Onglets dans `(tabs)/` (accueil, rapport, historique). Écrans poussés : `settings` (engrenage en haut de l'accueil), `savings`, `budgets`, `recurring`.
- `src/lib/` : logique pure et testée (dates et périodes, format, sélecteurs, `savings`, `recurring`, `budgets`, `backup`, `daily`, `features`, `photos`).
- `src/store/` : `index.tsx` (reducer + persistance AsyncStorage, clé `pocket.v1`), `ui.tsx` (mois, feuilles, toast), `lock.tsx` (verrouillage, clé `pocket.lock`), `actions.ts` (suppressions avec « Annuler »).
- `src/components/`, `src/theme/` : composants et jetons clair/sombre (violet `#6C63FF`, Bricolage Grotesque + Figtree).

## Modèle de données (version 3)

`AppState { cats, tx, theme, savings, goals, budgets, recurring }`

- `Category.kind` (`'in' | 'out'`, depuis 1.4) : une catégorie ne sert qu'à un type d'opération. Les données d'avant 1.4 n'ont pas ce champ : `normalizeState` le déduit (seul `freelance`/Salaire est une entrée) et ajoute une fois les nouvelles catégories d'entrée.
- `Transaction.photo?` (depuis 1.4) : nom du fichier de la photo, jamais un chemin. Le fichier vit dans `Paths.document/receipts/`. Le champ n'est ni exporté ni importé (la sauvegarde reste en version 3).
- Période affichée : état d'interface (`store/ui.tsx`), pas de données. `range` (début et fin inclus) ou, à défaut, le mois choisi.

- Caisse = Σ versements − Σ retraits. Disponible = Σ transactions − caisse. Patrimoine = disponible + caisse. Les virements ne comptent ni dans les dépenses ni dans les entrées.
- `SavingsEntry.goalId` : `null` = argent de la caisse sans objectif. Chaque réserve (objectif ou « sans objectif ») ne peut pas devenir négative.
- `budgets` : limite mensuelle par id de catégorie.
- Sauvegarde JSON `{ app: 'pocket', version: 3, data }`. Les versions 1 et 2 s'importent encore.

## Historique des versions

- **1.0** : migration de l'app web vers Expo (SDK 57), design fidèle, repartir de zéro sans migration de données.
- **1.1** : caisse économies, transactions récurrentes, export/import JSON et CSV, passe accessibilité.
- **1.2** : budgets par catégorie, recherche dans l'historique, plusieurs objectifs d'épargne, verrouillage Face ID.
- **1.5.2** : troisième tentative sur la croix : l'en-tête de `SheetFrame` (titre + croix) sort du `ScrollView`.
- **1.5.1** : deuxième tentative sur la croix de la feuille d'ajout (une `Modal` neuve par ouverture). Aucune fonction ajoutée.
- **1.5.0** : onboarding au premier lancement (3 écrans : bienvenue, le « + », données et compte à venir), en préparation de Supabase. Correction de la croix de la feuille d'ajout qui ne fermait plus à la deuxième ouverture (clavier fermé avant la fermeture).
- **1.4.0** : retours d'usage. Titre « Ajouter une opération » ; catégories séparées entre dépenses et entrées ; budgets plus rapides (placeholder « 0 », clavier avec « OK », retour automatique, feuille d'édition rapide depuis le rapport) ; carte « Budget du mois » sur l'accueil ; période libre (du … au …, ou un seul jour) sur l'accueil, le rapport et l'historique ; photos de reçus, locales et sans compte.
- **1.3.3** : correction du clavier qui cachait le champ Note (Android surtout). Aucune fonction ajoutée.
- **1.3.2** : micro-animations. Ressort au toucher sur boutons, cartes, lignes et barre d'onglets ; le solde et les totaux roulent vers leur nouvelle valeur ; la pastille du solde du jour fait un petit rebond quand elle change ; une transaction supprimée s'efface en fondu. Aucune fonction ajoutée.
- **1.3.1** : passage à Expo SDK 58 (React Native 0.88, React 19.3) pour suivre l'Expo Go de l'App Store. Barre d'onglets adaptée à la nouvelle API. Aucun changement de fonction.
- **1.3.0** : version simplifiée (80/20) pour le marché ivoirien. Catégories par défaut ivoiriennes, « solde du jour » sur l'accueil, 3 onglets (les réglages passent derrière l'engrenage), fonctions secondaires masquées derrière des drapeaux (`lib/features.ts`).
- **1.2.1** : suppression de la partie web (`index.html`, `www/`, `ios/` Capacitor, PWA, config Vercel). Aucun changement de fonction.

## Décisions

- **Onboarding (1.5.0)** : demandé par l'utilisateur car une base Supabase va être ajoutée. 3 écrans, « Passer » possible, jamais de compte forcé : le texte annonce seulement qu'un compte viendra, sans promettre de date. Pas d'écran de connexion tant que Supabase n'est pas branché. Ce sera l'endroit où brancher l'inscription.

- **Titre du « + » (1.4.0)** : « Ajouter une opération », neutre car la feuille sert aux dépenses comme aux entrées. Demandé par l'utilisateur : « Nouvelle transaction » faisait trop bancaire.
- **Catégories par type (1.4.0)** : l'utilisateur a relevé que Loyer, Outils ou Sorties apparaissaient dans les Entrées. Chaque catégorie a un `kind`. Entrées par défaut : Salaire, Ventes et activité, Aide reçue, Prime, Autre entrée. Les ids existants ne bougent pas. Supprimer une catégorie renvoie ses opérations vers « Autre » du même type, et on ne peut pas supprimer la dernière catégorie d'un type. À la modification d'une ancienne opération dont la catégorie n'est plus du bon type, cette catégorie reste proposée pour ne rien changer en silence.
- **Budget du mois (1.4.0)** : on garde des limites par catégorie (pas de budget global, choix de l'utilisateur) mais on les met en avant : carte toujours visible sur l'accueil (total dépensé / total des limites, barre, catégories à surveiller) ou invitation « Fixer ». La carte n'apparaît que pour un mois entier, car les limites sont mensuelles ; sur une période libre, le rapport l'explique.
- **Parcours budget (1.4.0)** : « Aucun » remplacé par « 0 » et « FCFA ». Le pavé numérique iOS n'a pas de touche de retour, donc une barre « OK » (`InputAccessoryView`). Enregistrer revient directement à l'écran précédent avec un toast. Un budget se règle aussi seul depuis le rapport, dans une feuille.
- **Période libre (1.4.0)** : flèches de mois conservées ; toucher le libellé ouvre une feuille (raccourcis, ou dates de début et de fin ; un jour = début égal à fin). Appliquée à l'accueil, au rapport et à l'historique. Le solde du jour reste lié au mois en cours. Ajouter une opération hors de la période affichée bascule sur son mois.
- **Photos (1.4.0)** : tout reste sur le téléphone, aucun compte. Fichiers dans le dossier documents de l'app, la transaction ne garde que le nom (pas de base64 dans AsyncStorage, pas de chemin absolu qui casse après une mise à jour). Les photos ne sont pas dans la sauvegarde JSON (indiqué dans les réglages) : un export restauré sur un autre téléphone ne les ramène pas. Choix de l'utilisateur : photos locales hors sauvegarde plutôt qu'un ZIP.
- **Nettoyage des photos (1.4.0)** : au lancement, on supprime les fichiers qu'aucune opération n'utilise (suppression, import, effacement, formulaire abandonné). Faire le ménage tard permet à « Annuler » de rendre la photo. Jamais si les données enregistrées sont illisibles.

- **Clavier dans les feuilles (1.3.3)** : `KeyboardAvoidingView` en `padding` sur iOS et Android. Une `Modal` Android avec `statusBarTranslucent` n'est pas redimensionnée par le système, donc `behavior={undefined}` laissait le clavier recouvrir la feuille. Le champ Note, en bas du formulaire, défile aussi tout seul au focus.

- **Motion (1.3.2)** : le mouvement répond à une action de l'utilisateur, il ne décore pas. Un seul moment « spectacle » au lancement : le solde compte depuis 0, une fois par session. Tout le reste est du retour d'action (toucher, saisie, suppression). Pas d'entrées en cascade sur chaque carte. Tout passe par `components/motion.tsx` pour garder les mêmes ressorts et durées. Avec « réduire les animations » activé : plus de mise à l'échelle, de rebond ni de décompte (la valeur change directement) ; seul un léger voile d'opacité reste au toucher, comme retour visuel.
- **v1.3.0, règle 80/20** : l'app tourne autour d'une seule boucle, « je note une dépense, je vois ce qu'il me reste ». Ce qui n'y sert pas est masqué, pas supprimé : le code et les tests restent, la réactivation tient en un drapeau.
- **Masqué en v1** : récurrences, export CSV, verrouillage Face ID (iPhone seulement, alors que la cible est surtout sur Android), recherche dans l'historique, objectifs d'épargne multiples (un seul reste proposé). Un élément masqué réapparaît si l'utilisateur a déjà des données dedans (règles récurrentes, verrouillage activé, plusieurs objectifs), pour qu'il puisse les modifier ou les éteindre.
- **Solde du jour = disponible ÷ jours restants**, et non « revenu du mois ÷ jours ». Raison : aucun écran de configuration au premier lancement, et la valeur bouge dès qu'on saisit une dépense. Contrepartie : le disponible inclut l'argent reporté des mois précédents.
- **3 onglets** (accueil, rapport, historique). Réglages derrière l'engrenage de l'accueil, budgets accessibles depuis le rapport seulement (un seul chemin).
- **Catégories ivoiriennes** : Salaire, Nourriture, Transport, Loyer, Eau et électricité, Crédit et data, Famille, Cotisations, Sorties, Frais, Autre. Les ids restent ceux de l'ancienne liste (`freelance` = Salaire, `courses` = Nourriture, `loisirs` = Sorties) pour ne pas casser les données et les tests. Seuls les nouveaux ids sont ajoutés (`factures`, `data`, `famille`, `social`, `frais`). Les installations existantes gardent leurs catégories.
- **Pas dans la v1** (à décider après des retours d'utilisateurs) : comptes cash et Mobile Money, frais de retrait saisis à part, défi 30 jours, version Android sur le Play Store.

- Dossier `mobile/` à côté de l'app web, plutôt que de la remplacer. Ensuite, à la demande de l'utilisateur, l'app web (et son wrapper Capacitor iOS) a été supprimée pour ne garder que le mobile. Elle reste récupérable dans l'historique git (commit `7044662`).
- Suppression avec `git rm` (et non un simple `rm`) pour que l'historique et l'index restent cohérents. `mobile copie/` et son zip (sauvegardes de l'utilisateur, ignorées par git) sont conservés. Les déploiements Vercel déjà en ligne ne sont pas touchés.
- Règle de projet : à chaque modification, tous les `.md` sont mis à jour (décisions, patterns, erreurs corrigées), même quand le changement est une suppression.
- Expo SDK 58 depuis la 1.3.1. On était en 57 parce que l'Expo Go de l'App Store l'était ; l'App Store est ensuite passé à 58, et iOS n'autorise que la dernière version. La règle : suivre la version de l'Expo Go de l'App Store.
- Solde « Disponible » séparé de la caisse. Un versement le diminue, un retrait le rend.
- Pas de `Intl` : formatage fr-FR écrit à la main (espace fine, FCFA avec espace insécable, signe moins U+2212).
- Le skill UX est orienté landing page : seules les règles d'accessibilité, d'ergonomie et d'états vides ont été retenues. Pas de refonte visuelle, l'identité violette est conservée.
- Contraste : gris secondaire clair `#6F6C88` (l'ancien `#8A87A0` était à 3,2:1). Zones tactiles 44 pt minimum. Pas de couleur seule pour signaler un état.
- Verrouillage hors des données exportables : c'est un réglage de l'appareil, pas de l'utilisateur. Il se verrouille à l'arrière-plan, pas à l'état « inactive » (qui se déclenche aussi pendant l'invite Face ID).
- Migration v2 → v3 : l'ancien objectif unique devient un objectif « Objectif » qui possède toute la caisse, pour que sa progression reste identique.
- Supprimer un objectif laisse l'argent dans la caisse. Supprimer une catégorie réaffecte aussi ses règles récurrentes.

## Patterns utilisés

- **Onboarding hors données** : `store/onboarding.tsx` (clé `pocket.onboarded`, comme `pocket.lock`, hors sauvegarde JSON). `components/Onboarding.tsx` est un calque absolu dans `Shell`, pas une `Modal`, pour ne pas se battre avec les feuilles natives. Le splash reste affiché tant que le drapeau n'est pas lu (pas de flash).

- **Période dérivée** : `useUI().period` (`from`, `to`, `isMonth`, `label`) vient de `range ?? monthRange(month)`. Les sélecteurs (`monthStats`, `reportRows`, `budgetRows`) acceptent un mois (`'2026-10'`) ou une période (`PeriodInput`), donc les anciens appels et tests ne changent pas.
- **Migration par champ absent** : `kind` manquant = données d'avant 1.4 (ajout unique des nouvelles catégories). Une fois sauvegardées, une catégorie supprimée reste supprimée.
- **Photos par nom de fichier + nettoyage des orphelins** : `lib/photos.ts` (`savePhoto`, `photoUri`, `cleanupOrphans`, `orphanNames` pur et testé).
- **« OK » au-dessus du pavé numérique** : `KeyboardDoneBar` (une fois par écran ou feuille) et `inputAccessoryViewID={KEYBOARD_DONE_ID}` sur les champs.
- **Feuille d'édition rapide** : `BudgetSheet`, `PeriodSheet` montées à la racine, ouvertes par `useUI()` (même schéma que `AddSheet`).

- **Défilement au focus dans une feuille** : `SheetFrame` fournit `useScrollToEnd()` par contexte. Un champ bas du formulaire l'appelle dans `onFocus` (composant enfant du `SheetFrame`, sinon le contexte n'est pas atteint).

- **Reducer pur + actions typées** : tout changement d'état passe par `reducer`, testé sans interface.
- **Suppression avec « Annuler »** : l'action de restauration garde ce qu'il faut pour tout remettre (`restoreCat`, `restoreGoal` avec les ids déplacés).
- **Normalisation tolérante ou stricte** : `normalizeState(d, strict)`. Lenient pour le stockage local (on écarte les éléments invalides), strict pour l'import (tout ou rien).
- **Retour au toucher** : `PressScale` (ressort partagé, `scaleTo` selon la taille de l'élément : 0,92 onglets, 0,97 boutons, 0,985 lignes). Le geste reste interruptible et ne bloque rien.
- **Nombre qui roule** : `useCountUp` / `CountText` (`requestAnimationFrame`, ease-out cubique, 650 ms). Seul le nœud texte se re-rend pendant l'animation, et une nouvelle valeur reprend là où l'ancienne s'est arrêtée. Le libellé d'accessibilité donne toujours la valeur finale.
- **Rebond sur changement** : `Bump` (se déclenche à chaque changement de `trigger`, jamais au premier rendu).
- **Drapeaux de fonctionnalités** : `lib/features.ts` (`FEATURES`). L'interface teste `FEATURES.x || donnéesExistantes` avant d'afficher une fonction secondaire. Masquer sans supprimer garde le code testé et rend le retour en arrière immédiat.
- **Récurrences idempotentes** : `lastApplied` par règle, application au lancement et au retour au premier plan, rattrapage des mois manqués sans doublon.
- **Formulaires réinitialisés par `key`** (`nonce`) plutôt que par effet. Depuis 1.5.1 la `key` est aussi sur la `Modal`, pas seulement sur son contenu.
- **Fermeture gardée** des feuilles (`useGuardedClose`) : confirmation si saisie non vide, partagée avec le bouton retour Android.
- **Réduction des animations** : `useReducedMotion` partout (courbe, donut, jauges, entrées).
- **Suppression d'un sous-projet** : lister d'abord les fichiers suivis (`git ls-files`), chercher les références depuis le code conservé (`grep ../`, `index.html`, `capacitor`), supprimer avec `git rm`, puis mettre à jour les docs et relancer `tsc`, `eslint`, `jest`.
- **Écran de verrouillage dans un `Modal`** : les feuilles sont des modales natives qui passeraient au-dessus d'un simple calque, donc on les ferme au verrouillage.

## Erreurs rencontrées et corrigées

- **Croix de la feuille d'ajout sans effet à la 2e ouverture (1.5.0)** : symptôme rapporté, non reproduit (pas de simulateur iOS ni de navigateur disponible pendant la session). La logique d'état (`openSheet`/`closeSheet`, `key` par `nonce`) est correcte à la lecture ; la piste retenue est le clavier : le champ montant a `autoFocus`, et une `Modal` fermée clavier levé ne reçoit pas l'événement de masquage, ce qui laisse `KeyboardAvoidingView` / `InputAccessoryView` dans un état périmé à l'ouverture suivante. Correctif : `Keyboard.dismiss()` dans `useGuardedClose` (donc pour toutes les feuilles). **Insuffisant** (2 fois) : le bug persistait (la croix ne fait plus rien à la 2e ouverture). Deuxième piste (1.5.1) : `Modal` natif réutilisé entre deux ouvertures, avec un état de fermeture iOS/Android périmé. Correctif : `key={nonce}` sur la `Modal` elle-même (`AddSheet`, `SavingsSheet`, `BudgetSheet`), donc une fenêtre native neuve à chaque ouverture. Toujours à confirmer sur téléphone, après `npx expo start -c` (Metro ne voit pas les changements dans ce dossier) ; si le bug persiste, regarder `KeyboardDoneBar` (même `nativeID` monté dans plusieurs feuilles).

- Hook appelé au-dessus du fournisseur de contexte : `useScrollToEnd()` dans `SheetBody` ne recevait rien, car le contexte est fourni par `SheetFrame`. Corrigé en sortant le champ dans un composant enfant (`NoteInput`).
- Test de budget écrit de travers (assertion qui ne vérifiait rien) : remplacé par une comparaison directe de l'ordre « le plus consommé d'abord ».

- Le clavier cachait le champ Note dans la feuille d'ajout (Android) : `KeyboardAvoidingView` n'avait pas de `behavior` hors iOS. Corrigé en `padding` partout, plus défilement au focus. Au passage, `useRef<ScrollView>` ne type plus en RN 0.88 : utiliser `React.ComponentRef<typeof ScrollView>`.

- Expo Go « incompatible » : descente au SDK 57 (`npx expo install --fix`).
- ERESOLVE sur le sélecteur de date : `.npmrc` avec `legacy-peer-deps=true`.
- Erreur de types de la barre d'onglets après la descente : `navigation.emit` / `navigate`.
- Jest : `@react-native/jest-preset` à installer, AsyncStorage à simuler avec `jest/async-storage-mock` (aussi dans chaque nouveau fichier de test qui importe le store).
- Metro « Cannot find module @expo/platforms » : cache SDK 58 périmé, résolu avec `-c`.
- Barre de navigation trop grande : barre fine (icônes 24, libellés 11, bouton « + » 44).
- Impossible de quitter la feuille d'ajout : croix, fond cliquable, retour Android.
- ESLint react-hooks : composants créés dans le rendu, setState dans un effet, apostrophes non échappées.
- Jauge pleine sans objectif et montant tronqué : arc masqué sans objectif, montant et « FCFA » sur deux lignes.
- Routes typées : `.expo/types/router.d.ts` se régénère au démarrage du serveur. Après l'ajout d'un écran, lance `npx expo start` une fois avant `tsc`.
- Expo Go « incompatible » (cette fois SDK 58 installé, projet en 57) : `npx expo install expo@^58.0.0` puis `npx expo install --fix`. Ensuite `tsc` signale `Property 'navigation' does not exist on type 'BottomTabBarProps'` : l'API de la barre personnalisée change en SDK 58. On utilise `emitter.emit({ type: 'tabPress', … })` et `navigateToTab(route.key)` (une clé de route, pas un nom). Vérifié avec `expo-doctor` (20/20) et `expo export --platform ios`.
- macOS : `sed -i ''` et pas de commande `timeout`.
- Après la suppression du web : rien de cassé, `mobile/` ne référençait aucun fichier parent. Seules les mentions dans `README.md` et `CLAUDE.md` étaient périmées (intro, règle sur `CapApp-SPM/README.md`), corrigées.
- Test cassé après le renommage des catégories (`matchesQuery(…, 'COURSES')`) : le test cherchait l'ancien nom. Corrigé en `NOURRITURE`. Les ids n'ont pas bougé, donc seuls les tests qui lisent un nom sont touchés.
- macOS : `sed -i` exige un argument de suffixe (`sed -i ''`). Sans lui, la commande échoue avec « unterminated substitute pattern ».
- ESLint `react-hooks/immutability` refuse `sharedValue.value = …` dans un gestionnaire (`onPressIn`) : utiliser `sharedValue.set(…)`. L'affectation reste acceptée dans un `useEffect`.
- Avertissement web « Invalid DOM property `transform` » : défaut de react-native-svg sur le web, sans effet sur iOS et Android.

- **Croix sans effet, suite (1.5.2)** : l'utilisateur (iPhone, Expo Go) a précisé que le fond sombre ferme la feuille mais pas la croix, à la 2e ouverture. Les deux appellent la même fonction : c'est donc le toucher sur la croix, placée dans le `ScrollView`, qui n'arrive pas (le fond est hors du `ScrollView`). Les deux correctifs précédents (clavier, `Modal` neuve) visaient la fermeture, pas le toucher : mauvaise piste. Correctif : titre et croix hors du `ScrollView` (`flexShrink: 1` sur celui-ci). **Confirmé par l'utilisateur sur iPhone (Expo Go).** Leçon : demander quels gestes marchent avant de corriger.

## Idées pour la suite

À réactiver ou ajouter selon les retours : comptes cash / Mobile Money, frais de retrait, récurrences (loyer, cotisations), recherche, plusieurs objectifs, CSV, Face ID. Aussi :

Modifier un objectif (nom, cible), budget global du mois, synchronisation iCloud.
