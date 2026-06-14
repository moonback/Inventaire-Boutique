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
- [ ] **Synchronisation Temps Réel (WebSockets)** : Exploiter les canaux Realtime de Supabase pour synchroniser instantanément les modifications de stock sur tous les téléphones des employés simultanément.
- [x] **Authentification Utilisateur (Supabase Auth)** : Écrans d'identification simples pour sécuriser l'accès aux données du magasin.
- [ ] **Gestion Multi-Boutiques / Multi-Dépôts** : Possibilité de basculer entre différents inventaires physiques depuis le même profil utilisateur.

---

## 🟦 Phase 3 : Statistiques, Audit & Impression (Futur)
- [ ] **Valorisation du Stock & Calculs de Marges** : Ajout de champs de prix d'achat et prix de vente sur les fiches produits afin d'obtenir la valeur monétaire du stock et le chiffre d'affaires potentiel.
- [ ] **Historique des Mouvements (Journal d'audit)** : Suivi détaillé de toutes les transactions (ajouts, retraits, modifications de fiches) avec date, heure et utilisateur.
- [ ] **Générateur & Impression d'Étiquettes** : Possibilité de générer des codes-barres ou QR codes internes pour les produits créés sur place ou sans emballage (vrac, artisanat).
