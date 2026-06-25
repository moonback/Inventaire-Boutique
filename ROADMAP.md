# 🗺️ Roadmap Produit · Inventaire Boutique PWA

> Objectif : transformer l'application en outil professionnel de gestion de stock mobile-first pour boutique, fiable en rayon, exploitable en back-office et prêt pour une montée en charge multi-utilisateurs.

**Dernière mise à jour :** juin 2026
**Stack :** React 19 · TypeScript · Vite · Tailwind CSS v4 · Supabase · PWA · Realtime
**Priorité produit :** fiabilité terrain → vitesse de scan → pilotage stock → sécurité → automatisation.

---

## 1. Vision produit

L'application doit devenir le **poste de contrôle stock mobile** de la boutique :

- scanner vite avec une douchette ou un smartphone ;
- ajouter, retirer et corriger le stock sans friction ;
- travailler même avec un réseau instable ;
- comprendre les ruptures, les marges et les mouvements ;
- sécuriser les accès par rôle et par boutique ;
- préparer les commandes et limiter les erreurs humaines.

---

## 2. État actuel synthétique

| Domaine | Statut | Ce qui existe déjà |
|---|---:|---|
| Scan | ✅ Solide | Saisie manuelle, douchette matérielle, choix stock/fiche, onglet de scan automatique add/remove. |
| Stock | ✅ Solide | Liste filtrable, vue compacte, swipe actions, modification des fiches et quantités. |
| Catégories | ✅ Bon niveau | CRUD catégories, auto-catégorisation, affichage des produits associés. |
| Cloud | ✅ Bon niveau | Supabase REST, Auth, Realtime, sync, export CSV. |
| Mobile UX | ✅ Bon niveau | PWA, bottom nav, safe-area, cartes mobile-first, retours haptiques. |
| Finance | 🟡 À renforcer | Prix achat/vente, valorisation et marge potentielle. |
| Offline | 🟡 Partiel | Cache PWA + base locale/sync en cours, mais audit/conflits à professionnaliser. |
| Sécurité | 🟠 À renforcer | Auth présente, rôles/RLS multi-boutique à formaliser. |
| Reporting | 🟠 À construire | Peu d'indicateurs historiques et pas de dashboard complet. |

---

## 3. Priorités stratégiques

1. **Fiabilité terrain** : aucun scan ne doit être perdu, même hors-ligne.
2. **Vitesse d'exécution** : limiter les modales et privilégier les gestes courts.
3. **Traçabilité** : chaque mouvement doit être historisé, daté et rattaché à un utilisateur.
4. **Pilotage** : passer d'une simple liste de stock à des décisions de réapprovisionnement.
5. **Sécurité & multi-boutique** : isoler les données par boutique, rôle et utilisateur.

---

## 4. Roadmap priorisée — 20 fonctionnalités pertinentes

### P0 · Critique terrain & sécurité

#### 1. Journal d'audit des mouvements
- **Statut :** À faire
- **Pourquoi :** savoir qui a ajouté, retiré ou modifié un produit, et quand.
- **À prévoir :** table `stock_movements`, type de mouvement, quantité avant/après, utilisateur, boutique, source (`scan`, `manual`, `sync`).
- **Impact :** traçabilité, résolution d'erreurs, base des statistiques.

#### 2. File d'attente hors-ligne robuste
- **Statut :** À renforcer
- **Pourquoi :** garantir qu'un scan réalisé sans réseau sera synchronisé plus tard.
- **À prévoir :** queue IndexedDB, retry automatique, compteur d'opérations en attente, écran de détails des erreurs.
- **Impact :** fiabilité en rayon et en réserve.

#### 3. Résolution de conflits de synchronisation
- **Statut :** À faire
- **Pourquoi :** éviter qu'un téléphone écrase les changements d'un autre.
- **À prévoir :** stratégie `lastUpdated`, version de ligne, comparaison quantité avant/après, alerte si conflit critique.
- **Impact :** collaboration plus sûre.

#### 4. Rôles utilisateurs et permissions
- **Statut :** À faire
- **Pourquoi :** différencier administrateur, manager et employé.
- **À prévoir :** rôles Supabase, règles RLS, droits : voir, scanner, modifier fiche, supprimer, exporter, gérer catégories.
- **Impact :** sécurité professionnelle.

#### 5. Multi-boutiques / multi-dépôts
- **Statut :** À faire
- **Pourquoi :** gérer boutique, réserve, dépôt ou plusieurs points de vente.
- **À prévoir :** `store_id`, sélecteur de boutique, droits par boutique, transferts inter-sites.
- **Impact :** extensibilité métier.

---

### P1 · Productivité scan & inventaire

<!-- #### 6. Scan caméra smartphone
- **Statut :** Fait
- **Pourquoi :** fonctionner sans douchette physique.
- **À prévoir :** BarcodeDetector API avec fallback librairie, permission caméra, mode torche, guide visuel.
- **Impact :** adoption plus facile sur mobile. -->

#### 7. Comptage d'inventaire par session
- **Statut :** À faire
- **Pourquoi :** lancer une session d'inventaire, scanner les produits, puis valider les écarts.
- **À prévoir :** sessions, compteur attendu/compté, validation finale, rapport d'écarts.
- **Impact :** inventaires périodiques plus propres.

#### 8. Mode scan automatique avancé
- **Statut :** En cours
- **Pourquoi :** améliorer l'onglet Auto avec plus de contrôle.
- **À prévoir :** quantité par scan configurable (`+1`, `+5`, `-1`), son de confirmation, verrou anti double-scan, compteur de session.
- **Impact :** vitesse et réduction des erreurs.

#### 9. Produits favoris / épinglés
- **Statut :** À faire
- **Pourquoi :** accéder rapidement aux références les plus manipulées.
- **À prévoir :** champ `isPinned`, section en haut du stock, tri prioritaire.
- **Impact :** gain de temps quotidien.

#### 10. Import CSV / Excel intelligent
- **Statut :** À faire
- **Pourquoi :** initialiser ou mettre à jour un catalogue complet rapidement.
- **À prévoir :** mapping colonnes, preview, validation erreurs, upsert par code-barres.
- **Impact :** migration et maintenance catalogue.

---

### P2 · Pilotage stock & finance

#### 11. Seuils d'alerte personnalisés par produit
- **Statut :** À faire
- **Pourquoi :** certains produits doivent alerter à 2 unités, d'autres à 30.
- **À prévoir :** `min_stock`, `target_stock`, badges dynamiques, filtres dédiés.
- **Impact :** alertes plus pertinentes.

#### 12. Notifications de rupture et stock faible
- **Statut :** À faire
- **Pourquoi :** prévenir immédiatement les responsables.
- **À prévoir :** push PWA, email optionnel, fréquence anti-spam, préférences utilisateur.
- **Impact :** moins de ruptures non détectées.

#### 13. Recommandations de réapprovisionnement
- **Statut :** À faire
- **Pourquoi :** suggérer quoi commander et en quelle quantité.
- **À prévoir :** stock actuel, stock cible, vitesse de sortie, délai fournisseur, saisonnalité simple.
- **Impact :** commandes plus efficaces.

#### 14. Dashboard financier
- **Statut :** À faire
- **Pourquoi :** suivre valeur stock, marge potentielle et catégories les plus importantes.
- **À prévoir :** cartes KPI, graphiques par catégorie, évolution mensuelle, export PDF.
- **Impact :** pilotage business.

#### 15. Historique des prix achat/vente
- **Statut :** À faire
- **Pourquoi :** comprendre les variations de coûts et ajuster les marges.
- **À prévoir :** table `price_history`, date d'effet, fournisseur, marge avant/après.
- **Impact :** meilleure rentabilité.

---

### P3 · Qualité catalogue & opérations

#### 16. Gestion fournisseurs
- **Statut :** À faire
- **Pourquoi :** relier chaque produit à son fournisseur et faciliter les commandes.
- **À prévoir :** fiche fournisseur, contact, délai moyen, minimum de commande, produits associés.
- **Impact :** réapprovisionnement plus structuré.

#### 17. Génération d'étiquettes code-barres / QR
- **Statut :** À faire
- **Pourquoi :** étiqueter les produits sans code-barres ou les créations internes.
- **À prévoir :** génération EAN interne, QR fiche produit, export PDF planche A4/étiqueteuse.
- **Impact :** meilleure couverture du catalogue.

#### 18. Gestion DLC / péremption par lot
- **Statut :** À faire
- **Pourquoi :** limiter les pertes sur produits périssables.
- **À prévoir :** lots, dates de péremption, alertes J-7/J-3, tri FEFO.
- **Impact :** réduction du gaspillage.

#### 19. Fusion / nettoyage des doublons
- **Statut :** À faire
- **Pourquoi :** corriger les produits créés plusieurs fois ou mal nommés.
- **À prévoir :** détection codes proches, noms similaires, fusion des mouvements et quantités.
- **Impact :** catalogue plus propre.

#### 20. Tests automatisés et monitoring d'erreurs
- **Statut :** À faire
- **Pourquoi :** sécuriser les évolutions et repérer les erreurs terrain.
- **À prévoir :** tests unitaires utilitaires, tests composants critiques, E2E scan, Sentry/Logtail ou équivalent.
- **Impact :** qualité logicielle professionnelle.

---

## 5. Proposition de séquencement

### Sprint 1 — Fiabilité immédiate
- Journal d'audit des mouvements.
- File d'attente hors-ligne robuste.
- Résolution de conflits simple.
- Tests sur le flux scan/stock.

### Sprint 2 — Scan professionnel
- Scan caméra smartphone.
- Mode auto avancé.
- Comptage d'inventaire par session.
- Sons de confirmation et anti double-scan.

### Sprint 3 — Stock intelligent
- Seuils personnalisés.
- Notifications de rupture.
- Recommandations de réapprovisionnement.
- Produits favoris.

### Sprint 4 — Back-office & sécurité
- Rôles utilisateurs.
- Multi-boutiques / multi-dépôts.
- Import CSV/Excel.
- Gestion fournisseurs.

### Sprint 5 — Reporting & opérations avancées
- Dashboard financier.
- Historique des prix.
- Étiquettes QR/code-barres.
- DLC par lot et nettoyage doublons.

---

## 6. Indicateurs de réussite

| KPI | Cible |
|---|---:|
| Temps moyen pour scanner et appliquer un mouvement | < 2 secondes |
| Scans perdus hors-ligne | 0 |
| Produits sans catégorie | < 5 % |
| Écarts d'inventaire non expliqués | -50 % |
| Ruptures détectées avant stock zéro | > 80 % |
| Actions critiques auditées | 100 % |
| Couverture tests flux critiques | > 70 % |

---

## 7. Décision recommandée

La prochaine priorité doit être le socle **Audit + Offline + Conflits**. Ces trois chantiers rendent l'application fiable en conditions réelles et débloquent ensuite les fonctionnalités plus avancées : statistiques, recommandations de commande, multi-boutiques et rôles.