# TASK — Plan d'action · Inventaire Boutique PWA

> Tâches actionnables issues de l'audit (`MA.md`).  
> **Légende :** `[ ]` à faire · `[x]` fait · `P0` critique · `P1` élevé · `P2` moyen · `P3` faible

---

## Sprint 0 — Sécurité (obligatoire avant production)

### Schéma & RLS

- [ ] **P0** Intégrer `purchase_price`, `sales_price`, `last_movement` dans le `CREATE TABLE` principal de `supabase-schema.sql`
- [ ] **P0** Remplacer les policies `USING (true)` par des règles basées sur `auth.uid()` (ou rôles)
- [ ] **P0** Ajouter une colonne `user_id` ou `store_id` pour isoler les données par boutique/utilisateur
- [ ] **P0** Restreindre le bucket `product-photos` : lecture publique OK, écriture/suppression authentifiée uniquement
- [ ] **P1** Valider type et taille des uploads côté client (`ManualProductModal.tsx`, `supabaseInventory.ts`)
- [ ] **P1** Désactiver ou restreindre l'inscription publique si usage professionnel

### Session & auth UI

- [ ] **P1** Brancher `App.tsx` sur la déconnexion automatique quand `clearSession()` est appelé (401 ou JWT expiré)
- [ ] **P1** Ajouter un listener `storage` ou callback auth pour synchroniser l'état session
- [ ] **P1** Gérer le 401 dans `uploadProductImage` comme dans les autres modules REST
- [ ] **P2** Documenter l'absence de refresh token ; ou migrer vers `@supabase/supabase-js`
- [ ] **P2** Renforcer mot de passe min. 8 caractères + validation côté `AuthScreen.tsx`

### Fichiers concernés

`supabase-schema.sql` · `src/App.tsx` · `src/lib/supabaseAuth.ts` · `src/lib/supabaseInventory.ts` · `src/lib/supabaseCategories.ts` · `src/components/AuthScreen.tsx`

---

## Sprint 1 — Fiabilité terrain (offline & sync)

### Queue & conflits

- [ ] **P0** Ne plus supprimer silencieusement les mutations irrécupérables — conserver en queue + écran d'erreurs
- [ ] **P1** Implémenter comparaison `lastUpdated` avant d'appliquer un événement Realtime
- [ ] **P1** Stratégie de résolution de conflits (last-write-wins explicite ou alerte utilisateur)
- [ ] **P1** Garantir l'ordre upsert/delete sur le même barcode dans la queue offline
- [ ] **P2** Retry automatique avec backoff sur la queue
- [ ] **P2** Compteur et écran détail des opérations en échec

### Journal d'audit (mouvements)

- [ ] **P1** Créer table `stock_movements` (type, qty avant/après, user, source, timestamp)
- [ ] **P1** Enregistrer chaque scan / modification manuelle / sync
- [ ] **P2** Afficher historique par produit dans la fiche

### Fichiers concernés

`src/lib/inventorySync.ts` · `src/lib/offlineDb.ts` · `src/hooks/useOfflineSync.ts` · `src/hooks/useSupabaseRealtime.ts` · `supabase-schema.sql`

---

## Sprint 2 — PWA & polish

- [ ] **P1** Générer et ajouter `public/icon-192.png` et `public/icon-512.png`
- [ ] **P1** Aligner `theme_color` et `background_color` du manifest avec l'UI claire (`#f5f3ee`)
- [ ] **P2** Precache app shell dans `public/sw.js` (index, assets critiques)
- [ ] **P2** Bundler `@zxing/browser` au lieu du CDN pour scan caméra offline
- [ ] **P3** Corriger README (design clair, pas sombre)

### Fichiers concernés

`public/manifest.json` · `public/sw.js` · `public/` · `README.md` · `src/components/CameraBarcodeScanner.tsx`

---

## Sprint 3 — Qualité code & tests

### Nettoyage

- [ ] **P1** Retirer dépendances mortes : `express`, `@google/genai`, `dotenv`, `@types/express`
- [ ] **P2** Retirer `tsx`, `esbuild` redondant si inutile
- [ ] **P2** Renommer package `"react-example"` → `"inventaire-boutique"`
- [ ] **P2** Nettoyer `.env.example` (retirer `GEMINI_API_KEY`, `APP_URL`)
- [ ] **P3** Supprimer `cn()` mort ou l'utiliser ; corriger script `clean` (`server.js`)

### TypeScript & lint

- [ ] **P2** Activer `"strict": true` dans `tsconfig.json`
- [ ] **P2** Ajouter ESLint + Prettier
- [ ] **P2** Factoriser code dupliqué entre `supabaseInventory.ts` et `supabaseCategories.ts`

### Tests

- [ ] **P1** Tests unitaires : `inventorySync`, `offlineDb`, `supabaseAuth` (expiration JWT)
- [ ] **P2** Tests composants : `QuantityModal`, flux scan
- [ ] **P2** E2E minimal : login → scan → sync
- [ ] **P2** CI GitHub Actions : `npm run lint` + tests

---

## Sprint 4 — Refactor & architecture

- [ ] **P2** Découper `App.tsx` : hook `useInventory`, `useScan`, composants onglets
- [ ] **P2** Migrer vers `@supabase/supabase-js` (auth refresh, Realtime, typage)
- [ ] **P2** Corriger renommage catégorie (update produits associés, pas de doublon)
- [ ] **P2** Pagination inventaire si > 500 références
- [ ] **P3** Router léger (React Router) si navigation s'enrichit

### Fichiers concernés

`src/App.tsx` · `src/lib/supabase*.ts` · `src/components/CategoriesManager.tsx` · `src/hooks/useSupabaseRealtime.ts`

---

## Sprint 5 — Accessibilité & UX

- [ ] **P2** Modales : `role="dialog"`, focus trap, touche Escape (`QuantityModal`, `ManualProductModal`, `ScanChoiceModal`)
- [ ] **P2** Remplacer `confirm()` natif par modale accessible
- [ ] **P2** Retirer `user-scalable=no` de `index.html`
- [ ] **P2** Corriger auto-suggestion catégorie qui écrase la sélection manuelle
- [ ] **P2** Export CSV : échapper formules (`=`, `+`, `@`, `-`)
- [ ] **P3** `aria-current` sur la bottom nav · toast responsive (pas de `whitespace-nowrap` forcé)

---

## Tâches déjà partiellement faites (TODO.md)

- [x] Détecter expiration JWT dans `supabaseAuth.ts`
- [x] `clearSession()` sur 401 dans `supabaseInventory.ts`
- [x] `clearSession()` sur 401 dans `supabaseCategories.ts`
- [ ] **P1** Retour automatique `AuthScreen` dans `App.tsx` quand session invalidée
- [ ] Tester manuellement : token expiré → re-login

---

## Suivi rapide

| Sprint | Tâches | Priorité |
|--------|:------:|----------|
| 0 Sécurité | 11 | 🔴 Bloquant |
| 1 Fiabilité | 10 | 🟠 Haute |
| 2 PWA | 5 | 🟡 Moyenne |
| 3 Qualité | 12 | 🟡 Moyenne |
| 4 Refactor | 5 | 🟢 Basse |
| 5 A11y/UX | 6 | 🟢 Basse |

**Prochaine action recommandée :** Sprint 0 — corriger `supabase-schema.sql` (RLS + colonnes prix) puis brancher la déconnexion UI sur 401.
