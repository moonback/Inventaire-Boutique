# 🗺️ Roadmap Complète · Inventaire Boutique PWA

> Document de référence pour l'évolution de l'application, du **quick win anodin mais brillant** jusqu'aux **fonctionnalités IA avancées** et **optimisations de performance**, en passant par la collaboration, l'audit et l'intelligence métier.

**Dernière analyse :** juin 2026  
**Stack actuelle :** React 19 · TypeScript · Vite · Tailwind v4 · Motion · Supabase · PWA

---

## 📊 État des lieux — Ce qui existe aujourd'hui

### Points forts déjà en place

| Domaine | Fonctionnalité | Fichiers clés |
|---------|----------------|---------------|
| **Scan** | Douchette USB/Bluetooth, saisie manuelle, routage intelligent (stock vs fiche) | `useHardwareScanner.ts`, `ScanChoiceModal.tsx` |
| **Scan** | Mode lot (+1 automatique sans modale) | `App.tsx` |
| **Données** | Lookup OpenFoodFacts (nom, image, marque, catégorie) | `api.ts` |
| **Données** | Auto-catégorisation par mots-clés (15 règles) | `autoCategorization.ts` |
| **Cloud** | CRUD Supabase REST, upsert par code-barres | `supabaseInventory.ts` |
| **Cloud** | Temps réel WebSocket (INSERT/UPDATE/DELETE) | `useSupabaseRealtime.ts` |
| **Cloud** | Auth email/mot de passe (localStorage) | `supabaseAuth.ts` |
| **Cloud** | Upload photos produits (bucket `product-photos`) | `supabaseInventory.ts` |
| **Cloud** | Gestion des catégories (CRUD + auto-catégorisation batch) | `CategoriesManager.tsx` |
| **Finance** | Prix achat/vente, valorisation stock, marge brute | `App.tsx`, `types.ts` |
| **UX** | Design sombre premium, glassmorphism, animations Motion | `index.css`, composants |
| **UX** | Swipe +1 / supprimer, haptiques, vue compacte | `InventoryGrid.tsx`, `haptics.ts` |
| **UX** | Filtres dynamiques (catégories, stock, tri), recherche | `App.tsx` |
| **UX** | Indicateurs de tendance (`lastMovement`) | `InventoryGrid.tsx` |
| **PWA** | Manifest, icône SVG, Service Worker network-first | `manifest.json`, `sw.js` |
| **Export** | CSV basique (code-barres, nom, marque, catégorie, quantité) | `App.tsx` |

### Dette technique & lacunes identifiées

| Priorité | Lacune | Impact |
|----------|--------|--------|
| 🔴 Haute | RLS Supabase en accès public (`using (true)`) — pas de filtrage par utilisateur/boutique | Sécurité |
| 🔴 Haute | `@google/genai` installé mais **jamais utilisé** dans le code | IA promise mais absente |
| 🟠 Moyenne | Pas de file d'attente hors-ligne (IndexedDB) — le SW cache seulement les assets | Fiabilité terrain |
| 🟠 Moyenne | Auth sans refresh token ni expiration gérée | Sessions fragiles |
| 🟠 Moyenne | Seuil stock faible fixe à 5 unités (hardcodé) | Flexibilité métier |
| 🟡 Basse | Pas de tests automatisés | Régression |
| 🟡 Basse | Pas de scan caméra (permission caméra déclarée dans `metadata.json` mais non implémentée) | Adoption sans douchette |
| 🟡 Basse | Export CSV sans prix ni date | Reporting limité |

### Maturité par pilier

```
UX & Polish        ████████░░  80%
Scan & Saisie      ███████░░░  70%
Cloud & Sync       ██████░░░░  60%
Sécurité           ███░░░░░░░  30%
IA                 █░░░░░░░░░  10%  (dépendance présente, code absent)
Performance        █████░░░░░  50%
Analytics          ████░░░░░░  40%
```

---

## 🎯 Principes directeurs de la roadmap

1. **Valeur immédiate d'abord** — Chaque sprint doit livrer quelque chose d'utilisable en boutique le jour même.
2. **Progression IA** — Commencer par l'IA invisible (suggestions), puis assistée (chat), puis autonome (prédictions).
3. **Offline-first pour le terrain** — La boutique n'a pas toujours du réseau ; le scan ne doit jamais bloquer.
4. **Sécurité avant multi-boutique** — Verrouiller les données avant d'ouvrir à plusieurs magasins.
5. **Mesurer pour décider** — Journal d'audit et métriques avant les algorithmes de commande.

---

## 🌟 Niveau 1 — Micro-fonctionnalités anodines mais brillantes

*Effort : 1–3 jours chacune · Impact UX élevé · Aucune migration DB majeure*

Ces features semblent mineures mais transforment le ressenti quotidien en boutique.

### 1.1 Son de confirmation au scan ✅🔊
- **Quoi :** Bip court distinct selon le résultat (succès, produit inconnu, erreur réseau).
- **Pourquoi :** En mode lot, l'employé ne regarde pas l'écran — le son remplace le toast visuel.
- **Implémentation :** Web Audio API, 3 fichiers `.mp3` légers, toggle dans les paramètres.
- **Effort :** XS

### 1.2 Copier le code-barres en un tap 📋
- **Quoi :** Tap long sur le code-barres d'une fiche → copie dans le presse-papier + toast « Copié ».
- **Pourquoi :** Utile pour commander chez le fournisseur ou chercher sur le web.
- **Effort :** XS

### 1.3 Horodatage relatif humain 🕐
- **Quoi :** Afficher « il y a 2 h » au lieu du timestamp brut sur les derniers scans.
- **Pourquoi :** Lisibilité immédiate sans calcul mental.
- **Implémentation :** Utilitaire `formatRelativeTime()` (ou `Intl.RelativeTimeFormat`).
- **Effort :** XS

### 1.4 Badge « Nouveau » sur les produits récents 🆕
- **Quoi :** Pastille discrète sur les articles ajoutés dans les dernières 24 h.
- **Pourquoi :** Repérage visuel des entrées récentes lors d'un inventaire en équipe.
- **Effort :** XS

### 1.5 Raccourci clavier `+` / `-` sur desktop ⌨️
- **Quoi :** Quand une fiche est sélectionnée, `+` et `-` ajustent le stock.
- **Pourquoi :** La PWA est aussi utilisée sur PC en back-office.
- **Effort :** XS

### 1.6 Animation de compteur de stock 🔢
- **Quoi :** Le chiffre de quantité s'anime (count-up/down) lors d'un changement.
- **Pourquoi :** Feedback visuel satisfaisant, confirme l'action sans lire le toast.
- **Implémentation :** Motion `animate` sur le span quantité.
- **Effort :** XS

### 1.7 Mode « Inventaire silencieux » 🤫
- **Quoi :** Toggle qui désactive sons + haptiques + toasts (sauf erreurs).
- **Pourquoi :** Inventaire tôt le matin ou en zone calme.
- **Effort :** XS

### 1.8 Indicateur de connexion persistant 📶
- **Quoi :** Pastille en header : En ligne / Hors-ligne / Synchro en attente (N opérations).
- **Pourquoi :** Transparence sur l'état réel (au-delà du badge « Synchro On » actuel).
- **Effort :** S

### 1.9 Recherche avec surlignage des correspondances 🔍
- **Quoi :** Les termes recherchés sont surlignés dans le nom/marque de la liste.
- **Pourquoi :** Parcours visuel plus rapide dans de longues listes.
- **Effort :** XS

### 1.10 Double-tap pour +1 rapide 👆👆
- **Quoi :** Double-tap sur une carte produit = +1 (alternative au swipe sur mobile).
- **Pourquoi :** Gestuelle plus naturelle pour certains utilisateurs.
- **Effort :** XS

---

## ✨ Niveau 2 — Polish UX & confort quotidien

*Effort : 3–7 jours · Améliore l'adoption sans complexifier le backend*

### 2.1 Thème clair / sombre dynamique 🌓
- Détection `prefers-color-scheme` + toggle manuel mémorisé en `localStorage`.
- Variables CSS pour la palette (déjà proche avec Tailwind custom).
- **Statut ROADMAP.md :** Non fait

### 2.2 Écran Paramètres dédié ⚙️
- Regrouper : sons, haptiques, thème, seuil stock faible global, mode compact par défaut, devise (€).
- Éviter la dispersion de toggles dans l'onglet Scanner.

### 2.3 Pull-to-refresh sur l'inventaire 🔄
- Geste natif mobile pour recharger depuis Supabase.
- Feedback haptique léger à la fin.

### 2.4 Skeleton loaders au lieu de spinners 💀
- Placeholders animés pour la grille stock pendant le chargement.
- Perception de vitesse améliorée.

### 2.5 Confirmation de suppression élégante 🗑️
- Remplacer `confirm()` natif par une bottom sheet avec undo (5 s).
- Pattern « Snackbar avec Annuler » (Material).

### 2.6 Fiche produit en bottom sheet 📄
- Remplacer certaines modales plein écran par des sheets glissables (Motion).
- Navigation plus fluide sur mobile.

### 2.7 Historique rapide étendu (10 derniers scans) 📜
- Passer de 3 à 10 articles dans l'onglet Scanner.
- Option « Épingler » un produit en haut pour inventaire récurrent.

### 2.8 Favoris / Produits épinglés ⭐
- Table `pinned_products` ou champ `is_pinned` sur l'item.
- Section dédiée en haut de l'onglet Stock.

### 2.9 Scan par caméra WebRTC 📷
- Intégration `html5-qrcode` ou `BarcodeDetector` API native.
- Fallback si pas de douchette — permission caméra déjà déclarée dans `metadata.json`.
- **Statut ROADMAP.md :** Non fait · **Priorité haute**

### 2.10 Recherche vocale 🎤
- Web Speech API : « Cherche Nutella » ou « Ajoute 5 yaourts ».
- Mode mains libres pendant le rangement.
- **Statut ROADMAP.md :** Non fait

### 2.11 Onboarding première connexion 👋
- 3 écrans : Scanner → Stock → Catégories.
- Démo interactive avec code-barres fictif.

### 2.12 Widget PWA « Stock faible » (Shortcuts) 📌
- `manifest.json` : `shortcuts` vers la vue filtrée « stock faible ».
- Accès direct depuis l'icône installée.

---

## ⚡ Niveau 3 — Performance & fiabilité terrain

*Effort : 1–3 semaines · Critique pour usage intensif en boutique*

### 3.1 File d'attente hors-ligne (IndexedDB) 💾
- **Quoi :** Persister les mutations (upsert, delete) localement quand le réseau est coupé.
- **Sync :** Replay automatique à la reconnexion avec résolution de conflits (last-write-wins sur `last_updated`).
- **UI :** Compteur « N modifications en attente » dans le header.
- **Statut ROADMAP.md :** Non fait · **Priorité critique**

### 3.2 Virtualisation de la liste stock 📜
- `react-window` ou `@tanstack/react-virtual` pour les inventaires > 500 références.
- Éviter le re-render complet à chaque scan en mode lot.

### 3.3 Debounce & cache OpenFoodFacts 🌐
- Cache LRU en mémoire + IndexedDB pour les lookups OFF (éviter re-fetch).
- Debounce 300 ms sur la saisie manuelle de code-barres.

### 3.4 Optimistic UI systématique ⚡
- Déjà partiellement fait pour `handleUpdateQuantity` — étendre à tous les flux (delete, batch).
- Rollback visuel en cas d'échec Supabase.

### 3.5 Service Worker v2 — Stratégies par route 🔧
- Assets statiques : Cache-First.
- API Supabase : Network-Only (déjà le cas).
- Page shell : Stale-While-Revalidate.
- Pré-cache du shell au `install`.

### 3.6 Compression images produit 🖼️
- Redimensionner côté client avant upload (max 800 px, WebP).
- Réduire la bande passante et le temps d'affichage.

### 3.7 Pagination / chargement incrémental Supabase 📦
- `?limit=50&offset=` ou cursor-based sur `last_updated`.
- Infinite scroll dans `InventoryGrid`.
- Nécessaire au-delà de ~1000 produits.

### 3.8 Web Workers pour l'auto-catégorisation batch 🧵
- Déporter le traitement de masse (CategoriesManager) hors du thread principal.
- UI fluide pendant la réaffectation de 500+ produits.

### 3.9 Prefetch des catégories & stats au login 🚀
- `Promise.all` déjà en place — ajouter le prefetch des 20 derniers scans et des favoris.

### 3.10 Monitoring erreurs (Sentry / LogSnag) 📊
- Capturer les échecs Supabase, OFF, WebSocket.
- Alertes sur taux d'erreur sync > 5 %.

---

## 🔐 Niveau 4 — Collaboration, sécurité & multi-boutique

*Effort : 2–4 semaines · Prérequis avant montée en charge*

### 4.1 RLS par utilisateur (urgent) 🛡️
- Migrer les policies `using (true)` vers `auth.uid() = user_id`.
- Ajouter colonne `user_id` / `store_id` sur `inventory_items` et `categories`.
- Script de migration pour les données existantes.

### 4.2 Refresh token & session robuste 🔑
- Stocker `refresh_token` Supabase, renouveler avant expiration.
- Redirection gracieuse si session expirée.

### 4.3 Rôles & permissions 👥
| Rôle | Droits |
|------|--------|
| **Admin** | CRUD complet, catégories, export, paramètres, utilisateurs |
| **Employé** | Scan, +/- stock, consultation |
| **Lecture seule** | Consultation uniquement (auditeur, comptable) |
- Table `user_roles` + policies RLS par rôle.
- **Statut ROADMAP.md :** Non fait

### 4.4 Multi-boutiques / multi-dépôts 🏪
- Table `stores` (id, name, address).
- Sélecteur de boutique dans le header.
- Inventaire scopé par `store_id`.
- **Statut ROADMAP.md :** En cours (non implémenté)

### 4.5 Invitations d'équipe par email 📧
- Admin invite un employé → lien magic link Supabase.
- Attribution automatique du rôle et de la boutique.

### 4.6 Verrouillage optimiste sur les fiches 🔒
- Champ `version` ou comparaison `last_updated` avant upsert.
- Alerte « Cette fiche a été modifiée par Marie il y a 2 min » en cas de conflit.

### 4.7 Journal d'audit complet 📓
- Table `inventory_movements` : `id`, `barcode`, `action` (add/remove/set/edit/delete), `delta`, `user_id`, `store_id`, `timestamp`, `metadata`.
- Trigger Postgres sur INSERT/UPDATE/DELETE de `inventory_items`.
- Vue chronologique par produit et par utilisateur.
- **Statut ROADMAP.md :** Non fait · **Priorité haute pour l'IA prédictive**

### 4.8 Notifications push (rupture stock) 🔔
- Supabase Edge Function + Web Push API.
- Abonnement sur les produits « critiques » (seuil personnalisé).
- **Statut ROADMAP.md :** Non fait

### 4.9 Sauvegarde automatisée 💾
- Cron Supabase → export JSON/CSV vers Storage bucket `backups/`.
- Rétention 30 jours, restauration en un clic (admin).

---

## 📦 Niveau 5 — Gestion de stock avancée

*Effort : 2–3 semaines · Valeur métier directe*

### 5.1 Seuils d'alerte personnalisés par produit ⚠️
- Champ `min_stock` sur `inventory_items` (défaut : 5).
- Badge amber/rouge basé sur le seuil individuel.
- Filtre « Sous seuil » dans les filtres avancés.

### 5.2 Dates limites de consommation (DLC) 📅
- Champs `expiry_date`, `lot_number`.
- Tri par DLC ascendante, alerte J-7 / J-3 / expiré.
- Filtre « Péremption proche ».

### 5.3 Fiches fournisseurs 🚚
- Table `suppliers` (nom, contact, délai moyen).
- Lien `supplier_id` sur les produits.
- Action « Commander » → email pré-rempli ou export bon de commande.

### 5.4 Générateur d'étiquettes 🏷️
- QR code interne + code-barres Code128 pour produits sans EAN.
- Export PDF A4 (4×10 étiquettes) ou impression directe.
- **Statut ROADMAP.md :** Non fait

### 5.5 Import CSV/Excel en masse 📥
- Assistant mapping colonnes → champs.
- Prévisualisation, mode « fusion » vs « remplacement ».
- Validation des doublons par code-barres.
- **Statut ROADMAP.md :** Non fait

### 5.6 Export enrichi 📤
- CSV/Excel avec prix, dates, fournisseur, seuil, dernière modification.
- Export PDF inventaire complet (template imprimable).

### 5.7 Inventaire physique (comptage) 📋
- Mode « Comptage » : scan chaque produit, saisie quantité réelle.
- Rapport d'écarts (théorique vs réel) avec ajustement en masse.

### 5.8 Variantes produit (taille, couleur) 🎨
- Table `product_variants` liée au code-barres parent.
- Stock agrégé ou par variante.

### 5.9 Emplacements / rayons 📍
- Champ `location` (ex. « Allée 3, Étagère B »).
- Filtre et tri par emplacement pour le rangement.

### 5.10 Historique des prix 💹
- Table `price_history` (purchase_price, sales_price, date).
- Graphique sparkline sur la fiche produit.
- **Statut ROADMAP.md :** Non fait

---

## 🤖 Niveau 6 — Intelligence Artificielle (progression)

*La dépendance `@google/genai` est installée et `GEMINI_API_KEY` est prévu dans `.env.example`, mais aucune intégration n'existe encore dans le code. La progression ci-dessous va du plus simple au plus ambitieux.*

### Phase IA-A — IA invisible (assistive, sans UI dédiée)
*Effort : 3–5 jours · L'utilisateur ne voit pas « l'IA », il voit des suggestions meilleures*

#### 6.A.1 Catégorisation intelligente par Gemini 🏷️
- **Remplace/complète** les règles statiques de `autoCategorization.ts`.
- Prompt : nom produit + catégorie OFF + liste des catégories boutique → meilleure correspondance.
- Fallback sur les règles locales si API indisponible.
- **Fichier cible :** `src/lib/aiCategorization.ts` + Edge Function Supabase (clé API côté serveur).

#### 6.A.2 Enrichissement fiche produit automatique ✨
- Lors d'un scan inconnu en base mais trouvé sur OFF : Gemini reformule le nom en français court, suggère marque normalisée, estime une fourchette de prix.
- Pré-remplissage du formulaire `ManualProductModal`.

#### 6.A.3 Normalisation des doublons 🔗
- Détection de produits similaires (« Coca 33cl » vs « Coca-Cola 330ml ») par embedding ou fuzzy match + confirmation utilisateur.
- Fusion intelligente des fiches.

#### 6.A.4 Suggestion de prix de vente 💰
- À partir du prix d'achat et de la catégorie, suggérer un prix de vente avec marge cible (ex. ×1.35 épicerie, ×1.25 frais).
- Affichage discret « Suggestion : 2,49 € » dans la fiche.

---

### Phase IA-B — IA assistée (l'utilisateur interagit consciemment)

#### 6.B.1 Assistant inventaire conversationnel 💬
- Chat flottant (bottom sheet) : « Quels produits sont en rupture ? », « Valeur totale épicerie ? ».
- Contexte injecté : stats calculées + top 50 stock faible.
- Gemini avec function calling vers requêtes Supabase read-only.

#### 6.B.2 Recherche sémantique 🔎
- « Boisson gazeuse orange » trouve Fanta, Orangina, etc.
- Embeddings stockés dans Supabase `pgvector` sur `name + brand + category`.
- Remplace la recherche `includes()` actuelle.

#### 6.B.3 Scan photo → identification produit 📸
- Photo rapide d'un produit sans code-barres → Gemini Vision identifie nom/marque/catégorie.
- Création de fiche avec code interne généré.
- **Statut ROADMAP.md :** Non fait

#### 6.B.4 OCR de ticket de caisse / facture fournisseur 🧾
- Photo du ticket → extraction lignes (produit, quantité, prix).
- Proposition d'ajustement de stock en masse.

#### 6.B.5 Dictée intelligente de fiche produit 🎙️
- « Ajoute 12 baguettes tradition catégorie boulangerie à 1,20 € » → parsing structuré JSON → pré-remplissage formulaire.
- Combine Web Speech API + Gemini pour le NLU.

#### 6.B.6 Traduction automatique des noms OFF 🌍
- Produits importés avec noms anglais → traduction FR à la volée.

---

### Phase IA-C — IA prédictive & autonome
*Prérequis : journal d'audit (4.7) + 30 jours de données*

#### 6.C.1 Score de rotation produit 📈
- Calcul de vélocité (sorties/jour) à partir de `inventory_movements`.
- Badge « Vend vite » / « Stagne » sur chaque fiche.
- Améliore les indicateurs `lastMovement` actuels (instantané → tendance).

#### 6.C.2 Prédiction de rupture 🔮
- Modèle simple (moyenne mobile 7 j) ou régression Gemini.
- « Rupture estimée dans 4 jours » sur les produits à forte rotation.

#### 6.C.3 Calculateur de commande recommandée 🛒
- Quantité à commander = `max(min_stock, vélocité × délai_fournisseur) - stock_actuel`.
- Export bon de commande groupé par fournisseur.
- **Statut ROADMAP.md :** Non fait

#### 6.C.4 Détection d'anomalies 🚨
- Alertes : « 50 sorties de lait en 1 h — erreur de scan ? ».
- Basé sur écarts statistiques vs historique.

#### 6.C.5 Optimisation des marges 🎯
- Analyse catégorielle : « Votre marge moyenne boissons est 18 %, secteur ~25 % ».
- Suggestions de réajustement prix par produit.

#### 6.C.6 Rapport hebdomadaire IA par email 📧
- Edge Function cron : résumé en langage naturel (« Cette semaine : 12 ruptures, +340 € de stock, top vente : Baguette »).
- Envoyé à l'admin chaque lundi.

#### 6.C.7 Agent autonome de réapprovisionnement 🤖
- Mode « suggestion validée » : l'IA prépare la commande, l'admin approuve en un tap.
- Intégration future API fournisseur (EDI, email structuré).

---

### Architecture IA recommandée

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   PWA React │────▶│ Supabase Edge Fn │────▶│  Gemini API │
│  (aucune    │     │ (clé API secrète) │     │  2.0 Flash  │
│   clé API)  │◀────│ + rate limiting  │◀────│             │
└─────────────┘     └──────────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Postgres   │
                    │  + pgvector  │
                    │  + audit log │
                    └──────────────┘
```

**Règles de sécurité IA :**
- Jamais de `GEMINI_API_KEY` côté client Vite.
- Rate limit : 20 req/min/utilisateur.
- Cache des réponses catégorisation (hash nom → catégorie, TTL 7 j).
- Toujours un fallback non-IA.

---

## 📊 Niveau 7 — Analytics & tableaux de bord

*Effort : 2–3 semaines · Nécessite audit log (4.7)*

### 7.1 Dashboard admin 📈
- Valeur stock par catégorie (donut chart).
- Évolution stock total sur 30 j (line chart).
- Top 10 ruptures / top 10 rotations.

### 7.2 Rapport de marge par catégorie 💹
- Étendre les stats financières actuelles (déjà en place dans l'onglet Stock) vers une vue détaillée.

### 7.3 Heatmap d'activité scan 🗓️
- Quand l'équipe scanne le plus (heures, jours).
- Optimisation des plannings d'inventaire.

### 7.4 Comparaison multi-boutiques 🏪
- Si 4.4 implémenté : benchmark stock, ruptures, marges entre magasins.

### 7.5 Export comptable 📑
- Format compatible logiciels compta (FEC simplifié, CSV colonnes fixes).

### 7.6 KPIs configurables 🎯
- L'admin choisit 4 KPIs affichés en header (ex. ruptures, valeur stock, marge, DLC proches).

---

## 🏗️ Niveau 8 — Plateforme, scale & écosystème

*Vision long terme · 1–3 mois*

### 8.1 API publique REST 🔌
- Endpoints documentés (OpenAPI) pour intégration caisse, e-commerce, ERP.

### 8.2 Webhooks sortants 🪝
- Notifier un ERP externe à chaque mouvement de stock.

### 8.3 Application native (Capacitor) 📱
- Accès NFC, push natives, meilleure intégration douchette Bluetooth.

### 8.4 Mode caisse / vente 🛍️
- Décrémenter le stock à chaque vente (scan sortant).
- Lien avec terminal de paiement (Stripe Terminal, SumUp).

### 8.5 Marketplace de plugins 🧩
- Extensions : comptabilité, fidélité client, étiquettes Zebra.

### 8.6 Multi-langue (i18n) 🌐
- FR + EN + ES via `react-i18next`.

### 8.7 Conformité RGPD renforcée 📜
- Export données personnelles, droit à l'oubli, consentement cookies.

### 8.8 Tests E2E & CI/CD 🧪
- Playwright (scan, auth, sync), GitHub Actions (lint + build + deploy).

---

## 📅 Planning suggéré par trimestre

### T1 — « Brillant & Fiable » (Semaines 1–6)
| Semaine | Livrables |
|---------|-----------|
| S1 | Niveau 1 complet (sons, copier, relatif, badges) + 2.5 undo delete |
| S2 | 2.9 Scan caméra + 2.2 Écran Paramètres |
| S3–S4 | 3.1 Offline IndexedDB + 3.4 Optimistic UI complet |
| S5 | 4.1 RLS sécurisé + 4.2 Refresh token |
| S6 | 5.1 Seuils personnalisés + 5.5 Import CSV |

### T2 — « Intelligent » (Semaines 7–12)
| Semaine | Livrables |
|---------|-----------|
| S7–S8 | 4.7 Journal d'audit + 4.3 Rôles |
| S9 | 6.A.1–6.A.2 IA catégorisation + enrichissement (Gemini) |
| S10 | 6.B.1 Assistant chat + 6.B.2 Recherche sémantique |
| S11 | 5.4 Étiquettes + 5.7 Inventaire physique |
| S12 | 7.1 Dashboard admin |

### T3 — « Prédictif » (Semaines 13–18)
| Semaine | Livrables |
|---------|-----------|
| S13–S14 | 4.4 Multi-boutiques + 4.8 Push notifications |
| S15 | 6.C.1–6.C.3 Rotation, prédiction rupture, commande |
| S16 | 6.B.3 Scan photo IA |
| S17 | 3.2 Virtualisation + 3.7 Pagination |
| S18 | 8.8 Tests E2E + CI/CD |

### T4 — « Plateforme » (Semaines 19+)
- 8.1 API publique, 8.3 App native, 8.4 Mode caisse, 6.C.7 Agent réapprovisionnement.

---

## 🏆 Matrice de priorisation (Impact × Effort)

```
IMPACT ÉLEVÉ
     │
     │  ★ Scan caméra      ★ Offline IndexedDB
     │  ★ RLS sécurisé     ★ Journal d'audit
     │  ★ IA catégorisation ★ Import CSV
     │  ○ Assistant chat   ○ Multi-boutiques
     │  ○ Dashboard        ○ Prédiction rupture
     │
     │  · Sons/haptiques   · Thème clair
     │  · Copier barcode   · Skeleton loaders
     │  · Anim compteur    · Favoris
     │
IMPACT FAIBLE
     └────────────────────────────────────── EFFORT ÉLEVÉ
        FAIBLE                              ÉLEVÉ
```

**Légende :** ★ = Priorité immédiate · ○ = Priorité T2 · · = Quick wins à saupoudrer

---

## ✅ Checklist de démarrage — Par où commencer lundi ?

Si vous ne devez choisir que **5 actions** pour maximiser la valeur :

- [ ] **1.** Sons de confirmation + mode silencieux (Niveau 1) — 2 h
- [ ] **2.** Scan caméra WebRTC (2.9) — 2 jours
- [ ] **3.** File d'attente offline IndexedDB (3.1) — 1 semaine
- [ ] **4.** Sécuriser RLS Supabase (4.1) — 2 jours
- [ ] **5.** IA catégorisation Gemini via Edge Function (6.A.1) — 3 jours

---

## 📎 Annexes

### A. Mapping avec ROADMAP.md existant

Le fichier `ROADMAP.md` reste la vue **phases macro** (7 phases). Ce document `roadmap-complet.md` le **décline en 80+ items actionnables** avec effort, dépendances et ordre de livraison.

### B. Migrations SQL anticipées

```sql
-- Seuils personnalisés
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS min_stock integer DEFAULT 5;

-- Multi-boutique
CREATE TABLE stores (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id);

-- Audit
CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text NOT NULL,
  action text NOT NULL,
  delta integer,
  quantity_after integer,
  user_id uuid,
  store_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Embeddings recherche sémantique
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS embedding vector(768);
```

### C. Variables d'environnement futures

```env
# Existant
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# À ajouter (côté Edge Functions uniquement)
GEMINI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optionnel
VITE_SENTRY_DSN=
VITE_VAPID_PUBLIC_KEY=   # Push notifications
```

---

*Ce document est vivant : mettez à jour les statuts au fil des sprints et cochez les items livrés.*
