# MA — Mémoire d'Audit · Inventaire Boutique PWA

> Document de référence issu de l'audit complet du dépôt.  
> **Date :** juin 2026  
> **Périmètre :** 30 fichiers source, schéma SQL, PWA, configuration, dépendances.

---

## 1. Verdict exécutif

| Critère | Note | Commentaire |
|---------|:----:|-------------|
| UX mobile / scan | 8/10 | Douchette, caméra, swipe, haptique, bottom nav |
| Architecture | 5/10 | Monolithique ; pas de router ni state manager |
| Sécurité | 2/10 | **Bloquant production** — RLS ouverte, auth décorative |
| Offline / sync | 6/10 | IndexedDB + queue OK ; conflits non gérés |
| Qualité code | 5/10 | TS non strict, 0 test, duplication |
| PWA | 5/10 | SW basique, icônes PNG manquantes |
| **Production-ready** | ❌ | Prototype / usage interne uniquement |

**Conclusion :** application solide côté terrain (scan, UX mobile), **non déployable en production multi-utilisateurs** tant que la sécurité Supabase et la fiabilité offline ne sont pas corrigées.

---

## 2. Stack & architecture

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Motion, Lucide |
| Build | Vite 6 (port 3000) |
| Backend | Supabase REST + WebSocket Realtime (sans `@supabase/supabase-js`) |
| Offline | IndexedDB + file d'attente mutations |
| Lookup | OpenFoodFacts (`src/api.ts`) |
| PWA | `public/manifest.json` + `public/sw.js` |

### Structure

```
App.tsx (~1247 lignes)
├── components/   Auth, scan, stock, modales, catégories
├── hooks/        useHardwareScanner, useSupabaseRealtime, useOfflineSync
├── lib/          Auth, inventaire, catégories, sync, offline, auto-catégorisation
└── api.ts        OpenFoodFacts
```

### Flux de données

1. `AuthScreen` → JWT dans `localStorage` → `App.tsx`
2. `loadInventoryItems()` → Supabase REST (online) ou IndexedDB (offline)
3. Scan → OpenFoodFacts → modale / sync → `inventorySync`
4. Realtime WebSocket → mise à jour state inventaire
5. Service Worker → cache GET statiques (network-first)

---

## 3. Sécurité

### P0 — Critiques

| ID | Problème | Fichier(s) |
|----|----------|------------|
| S1 | RLS ouverte (`USING (true)`) sur `inventory_items`, `categories`, bucket `product-photos` | `supabase-schema.sql` L13–32, L72–82, L49–59 |
| S2 | Auth décorative — pas de `auth.uid()` dans les policies ; inventaire global partagé | `supabase-schema.sql`, `supabaseInventory.ts` |
| S3 | Schéma incomplet — colonnes `purchase_price`, `sales_price`, `last_movement` absentes du CREATE TABLE | `supabase-schema.sql` L1–9 vs `supabaseInventory.ts` L58–60 |

### P1 — Élevés

| ID | Problème | Fichier(s) |
|----|----------|------------|
| S4 | 401 efface la session (`clearSession`) mais l'UI ne réagit pas | `supabaseInventory.ts` L92–98, `App.tsx` L134–138 |
| S5 | Storage public sans contrôle type/taille | `supabase-schema.sql` L45–59 |
| S6 | Pas de refresh token JWT | `supabaseAuth.ts` |
| S7 | Realtime WebSocket sans JWT utilisateur | `useSupabaseRealtime.ts` |
| S8 | Inscription ouverte + inventaire public | `supabaseAuth.ts`, `AuthScreen.tsx` |

### P2 — Moyens

- Clé `anon` exposée (normal SPA, dangereux avec RLS ouverte)
- `.env.example` héritage AI Studio (`GEMINI_API_KEY`, `APP_URL`)
- Images externes non validées (`imageUrl` → `<img src>`)
- Mot de passe min. 6 caractères
- Export CSV sans protection injection formules

---

## 4. Données & Supabase

### Points forts

- Mapping snake_case ↔ camelCase
- Fallback cache réseau instable
- Realtime INSERT/UPDATE/DELETE
- Auto-catégorisation par mots-clés

### Problèmes

| Sévérité | Problème |
|----------|----------|
| High | Renommage catégorie crée un doublon ; produits gardent l'ancien nom |
| Medium | Realtime écrase mises à jour optimistes (pas de `lastUpdated`) |
| Medium | Chargement inventaire complet sans pagination |
| Medium | Duplication code `supabaseInventory.ts` / `supabaseCategories.ts` |
| Low | `uploadProductImage` ne gère pas le 401 |

---

## 5. Offline & PWA

### Points forts

- IndexedDB + queue + flush au retour online
- Exclusion Supabase/OpenFoodFacts du cache SW
- Badges hors-ligne / en attente

### Problèmes

| Sévérité | Problème |
|----------|----------|
| High | `icon-192.png` et `icon-512.png` référencés mais absents de `public/` |
| Medium | SW sans precache app shell |
| Medium | `theme_color` manifest `#070b13` vs UI claire `#f5f3ee` |
| Medium | ZXing via CDN — scan caméra offline impossible |
| Medium | Last-write-wins ; pas de résolution de conflits |
| Medium | Mutations irrécupérables supprimées silencieusement (`inventorySync.ts` L194–196) |

---

## 6. Qualité du code

| Aspect | État |
|--------|------|
| TypeScript strict | ❌ |
| ESLint / Prettier | ❌ |
| Tests | ❌ 0 fichier |
| CI | ❌ |
| Dépendances mortes | `express`, `@google/genai`, `dotenv`, `@types/express`, `tsx` |
| Code mort | `cn()` dans `lib/utils.ts` |
| README | Obsolète (design sombre vs UI claire) |
| Nom package | `"react-example"` |

**TODO JWT :** lib OK (expiration + clearSession sur 401) ; UI `App.tsx` non branchée.

---

## 7. UX & accessibilité

### Points forts

- Mobile-first, safe-area, touch ≥ 44px, haptique, swipe
- Labels ARIA scan/quantité, `lang="fr"`

### À améliorer

- Modales sans focus trap / `role="dialog"` / Escape
- Auto-suggestion catégorie écrase la sélection utilisateur
- `confirm()` natif pour suppressions
- `user-scalable=no` bloque le zoom
- Nav sans `aria-current`

---

## 8. État fonctionnel

| Domaine | Statut |
|---------|:------:|
| Scan manuel / douchette / caméra | ✅ |
| Mode auto add/remove | ✅ |
| Stock filtrable + finance UI | 🟡 |
| Catégories CRUD | ✅ |
| Auth | 🟡 |
| Offline queue | 🟡 |
| Realtime | ✅ (fragile) |
| Audit mouvements | ❌ |
| Rôles / multi-boutique | ❌ |
| Tests | ❌ |

---

## 9. Bugs identifiés

### Critiques / élevés

1. RLS publique — inventaire modifiable par anon
2. Colonnes prix absentes du schéma principal
3. Session UI non invalidée après 401
4. Icônes PWA PNG manquantes
5. Renommage catégorie crée une nouvelle entrée

### Moyens

6. `syncItem` ne distingue pas offline (`queued`) vs erreur dans les `catch`
7. Realtime DELETE suppose `old_record.barcode` présent
8. Auto-catégorisation séquentielle (N requêtes)
9. Filtres catégories O(n×m) à chaque rendu

### Faibles

10. `z-55` non standard Tailwind (`Toast.tsx`)
11. Script `clean` référence `server.js` inexistant
12. `isBatchMode` nom trompeur

---

## 10. Références croisées

| Document | Rôle |
|----------|------|
| `TASK.md` | Plan d'action détaillé avec checkboxes |
| `ROADMAP.md` | Vision produit et 20 fonctionnalités |
| `TODO.md` | Fix JWT 401 (partiellement fait) |
| `supabase-schema.sql` | Schéma à corriger en priorité |

---

## 11. Décision recommandée

**Priorité immédiate : Sprint 0 Sécurité** (RLS + schéma + 401 UI + Storage), puis **Sprint 1 Fiabilité** (audit mouvements, queue offline, conflits).

Ces socles débloquent ensuite : rôles, multi-boutiques, reporting et import CSV.
