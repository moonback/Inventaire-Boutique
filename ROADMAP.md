# 🗺️ Roadmap - Inventaire Boutique

Cette feuille de route détaille les améliorations et futures fonctionnalités envisagées pour l'application d'inventaire.

## Phase 1 : Expérience de Recherche et de Tri 🔍
- [ ] **Barre de Recherche** : Permettre de filtrer la grille d'inventaire textuellement par nom de produit ou marque.
- [ ] **Filtres Avancés** : Filtrer et grouper visuellement les produits par catégorie ou par quantité.
- [ ] **Alerte de Stock Bas** : Configurer un seuil (ex: < 5 articles) qui souligne en rouge ou orange les articles en rupture proche.

## Phase 2 : Cloud & Mode Collaboratif ☁️
- [ ] **Synchronisation Backend (Firebase / Supabase)** : Remplacer le `localStorage` par une véritable base de données Cloud pour ne pas perdre les données en cas de changement de navigateur.
- [ ] **Travail en Équipe (Temps Réel)** : Permettre à plusieurs employés équipés de leurs propres téléphones/scanners de remplir le même stock en même temps de manière synchronisée.
- [ ] **Authentification** : Ajouter une connexion par mot de passe pour protéger l'accès à l'inventaire.

## Phase 3 : Fonctionnalités de Gestion Poussées 📊
- [ ] **Historique des Transactions** : Un journal d'audit qui enregistre chaque modification : *"L'employé X a retiré 3 unités du produit Y à 14h00"*.
- [ ] **Valorisation du Stock** : Pouvoir renseigner le prix d'achat d'un article scanné afin d'afficher la valeur monétaire totale du stock en temps réel.
- [ ] **Codes internes personnalisés** : Possibilité de générer et d'imprimer des codes-barres aléatoires / QR Codes pour les articles faits-maison ou sans code EAN existant.
- [ ] **Multi-Zones** : Définir des "zones de scan" (ex: Réserve, Rayon A, Vitrine) affectables dynamiquement lors de l'inventaire.
