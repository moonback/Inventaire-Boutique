# 🗺️ Roadmap · Boutique Inventaire PWA

Cette feuille de route détaille l'état actuel du développement et les prochaines étapes prévues pour l'application d'inventaire de la boutique.

---

## 🟩 Phase 1 : Expérience Mobile, PWA & Ergonomie (Complété)
- [x] **Redesign Complet "Pro & Minimaliste"** : Thème sombre premium, cartes glassmorphismes, animations Motion fluides et mise en page optimisée pour smartphone.
- [x] **Navigation par Onglets** : Séparation claire entre l'onglet **Scanner** (saisie rapide) et l'onglet **Stock** (consultation de la base).
- [x] **Routage de Scan Intelligent** : Déclenchement d'un choix lors du scan d'un code-barres existant (ajustement rapide du stock ou modification de la fiche).
- [x] **Système de Filtres Dynamiques** : Onglets de catégories défilables horizontalement générés dynamiquement, filtres avancés d'état de stock (stock faible, rupture) et tris personnalisés.
- [x] **Support PWA Complet** : Fichier manifeste, icônes vectorielles et Service Worker avec stratégie *Network-First* pour un fonctionnement robuste hors-ligne.
- [x] **Modification Directe par Fiche** : Possibilité de cliquer sur un article de la liste pour modifier ses métadonnées (nom, marque, catégorie, image) et son stock en une fois.

---

## 🟨 Phase 2 : Collaboration & Sécurité (En Cours)
- [x] **Synchronisation Temps Réel (WebSockets)** : Exploiter les canaux Realtime de Supabase pour synchroniser instantanément les modifications de stock sur tous les téléphones des employés simultanément.
- [x] **Authentification Utilisateur (Supabase Auth)** : Écrans d'identification simples pour sécuriser l'accès aux données du magasin.
- [ ] **Gestion Multi-Boutiques / Multi-Dépôts** : Possibilité de basculer entre différents inventaires physiques depuis le même profil utilisateur.

---

## 🟦 Phase 3 : Statistiques, Audit & Impression (Futur)
- [x] **Valorisation du Stock & Calculs de Marges** : Ajout de champs de prix d'achat et prix de vente sur les fiches produits afin d'obtenir la valeur monétaire du stock et le chiffre d'affaires potentiel.
- [ ] **Historique des Mouvements (Journal d'audit)** : Suivi détaillé de toutes les transactions (ajouts, retraits, modifications de fiches) avec date, heure et utilisateur.
- [ ] **Générateur & Impression d'Étiquettes** : Possibilité de générer des codes-barres ou QR codes internes pour les produits créés sur place ou sans emballage (vrac, artisanat).

---

## 🟧 Phase 4 : Saisie Avancée & Performance (Futur)
- [ ] **Scan via Caméra WebRTC (sans douchette)** : Intégration d'un scanner de code-barres logiciel utilisant la caméra du smartphone (via Html5Qrcode).
- [x] **Mode Scan en Lot (Batch Scanning)** : Enchaînement rapide de scans consécutifs sans interrompre le flux de travail avec des fenêtres modales répétitives.
- [ ] **Importation en Masse (CSV/Excel)** : Assistant d'importation de fichiers tabulaires pour peupler ou mettre à jour le catalogue de produits en quelques secondes.
- [ ] **Support Hors-Ligne Résilient (IndexedDB)** : Mise en attente locale des modifications de stock hors-ligne et synchronisation transparente dès le rétablissement de la connexion.
- [ ] **Recherche Vocale Intelligente** : Recherche rapide de produits ou dictée de quantités via l'API de reconnaissance vocale du navigateur.

---

## 🟪 Phase 5 : UI/UX & Design Sensoriel (Futur)
- [x] **Gestes Tactiles Intuitifs (Swipe Actions)** : Glisser à gauche pour supprimer un article, glisser à droite pour ajouter rapidement +1 au stock sur mobile.
- [ ] **Thème Sombre / Clair Dynamique** : Transition fluide de thème s'adaptant automatiquement aux préférences système du smartphone.
- [x] **Retours Haptiques (Vibrations)** : Micro-vibrations de confirmation tactile lors d'un scan réussi ou de la validation d'une quantité.
- [x] **Indicateurs Visuels de Tendance** : Petite flèche d'évolution montrant si le produit a été récemment réapprovisionné ou s'il se vend rapidement.
- [x] **Interface Ultra-Compacte Réduite** : Option d'affichage en mode liste simple (sans photo) pour maximiser le nombre d'articles visibles à l'écran.

---

## 🟫 Phase 6 : Gestion de Stock Avancée & Analyse (Futur)
- [ ] **Seuils d'Alerte Personnalisés par Produit** : Configurer un niveau d'alerte critique distinct pour chaque produit au lieu d'un seuil global de 5 unités.
- [ ] **Notifications Push de Rupture** : Alertes instantanées sur le téléphone de l'administrateur quand un produit clé tombe à zéro.
- [ ] **Gestion des Dates Limites (DLC / Péremption)** : Suivi et alertes sur les dates de péremption pour limiter les pertes de stocks périssables.
- [ ] **Graphiques d'Analyse Financière** : Tableaux de bord visuels affichant la répartition de la valeur de stock par catégorie.
- [ ] **Gestion des Fiches Fournisseurs** : Association de chaque produit à un fournisseur pour faciliter le réapprovisionnement direct.

---

## 🟥 Phase 7 : Rôles, IA & Sécurité (Futur)
- [ ] **Rôles Utilisateurs & Autorisations** : Séparation des comptes (Administrateur avec pleins droits vs Employé limité à la consultation et modification du stock).
- [ ] **Reconnaissance Visuelle par Photo (IA)** : Identification approximative des articles sans code-barres par prise de photo rapide.
- [ ] **Historique d'Évolution des Prix** : Graphiques illustrant les fluctuations du prix d'achat d'un article pour ajuster les marges en conséquence.
- [ ] **Calculateur de Commande Recommandée** : Algorithme suggérant les quantités à acheter selon le stock minimal souhaité et la vitesse de vente.
- [ ] **Sauvegarde Automatisée Supabase (Backups)** : Exportation automatique régulière de l'intégralité des données en format compressé.
