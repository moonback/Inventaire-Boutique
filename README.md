# 📦 Boutique · Inventaire PWA

Une application Progressive Web App (PWA) de gestion d'inventaire mobile-first, conçue pour un scan rapide, une synchronisation Cloud en temps réel et un confort d'utilisation optimal en boutique.

---

## ✨ Fonctionnalités Principales

### 📱 Interface Mobile-First & Minimaliste
- **Design Premium Sombre :** Palette de couleurs foncées soignée (ardoise profonde et indigo vibrant), coins arrondis amples, effets de verre dépoli (glassmorphism) et transitions fluides.
- **Navigation Tactile Ergonomique :** Barre de navigation fixée au bas de l'écran pour un usage facile à une main, avec des zones cibles tactiles de taille optimale (min. 44px).
- **Statistiques Compactes :** Affichage d'une ligne de micro-badges sous l'en-tête résumant l'inventaire en un coup d'œil (références, quantité totale, alertes de stock).

### 🔍 Gestion des Scans & Routage Intelligent
- **Prise en charge des Scanners Physiques :** Lecture transparente via douchettes matérielles (USB/Bluetooth), avec écoute globale intelligente pour numériser sans focus manuel obligatoire.
- **Routage de Scan Interactif :** Lors du scan d'un produit existant, l'utilisateur est guidé par un choix clair :
  - **Ajuster le stock** : Accès à l'éditeur rapide de quantité.
  - **Modifier la fiche produit** : Accès au formulaire de métadonnées pour renommer, réaffecter une marque ou catégorie.
- **Saisie Manuelle & Mode Création :** Formulaires épurés avec contrôles de quantité +/- tactiles pour ajouter des produits non référencés.

### 🎯 Système de Filtres Dynamiques
- **Pills de Catégories Défilables :** Extraction automatique et dynamique des catégories en stock, affichées sous forme de badges cliquables défilables horizontalement.
- **Tiroir de Filtres Avancés :** 
  - Tri (alphabétique, date d'ajout, quantité croissante/décroissante).
  - État de stock (Tous, En stock, Stock faible ≤ 5, Rupture de stock).
  - Indicateur de filtres actifs et bouton de réinitialisation rapide.

### 🌐 Mode PWA Complet (Installable & Hors-ligne)
- **Installable sur Mobile & PC :** Intègre un fichier `manifest.json` et un logo vectoriel haute fidélité (`icon.svg`), permettant l'installation de l'application sur l'écran d'accueil comme une application native.
- **Service Worker Intelligent :** Caching en arrière-plan via une stratégie *Network-First* qui garantit un fonctionnement robuste en cas de coupure de réseau.

---

## 🛠️ Stack Technique

- **Framework :** React 19 (StrictMode), TypeScript
- **Styles :** Tailwind CSS v4, Lucide React (icônes)
- **Animations :** Motion (Framer Motion)
- **Synchronisation Cloud :** Supabase (REST API & resolution rules)
- **Build & Dev Server :** Vite

---

## ☁️ Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com/).
2. Exécutez le fichier [supabase-schema.sql](file:///c:/Users/Mayss/Documents/GitHub/Inventaire-Boutique/supabase-schema.sql) dans l'éditeur SQL de votre console pour créer la table `inventory_items` et activer les règles de sécurité Row Level Security (RLS).
3. Copiez le fichier `.env.example` en un nouveau fichier `.env` à la racine et renseignez :
   ```env
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre-cle-api-anonyme
   ```
4. Lancez le serveur de développement.

---

## 📦 Commandes Utiles

- **Développement :** `npm run dev` (Démarre le serveur local sur le port 3000)
- **Compilation Production :** `npm run build` (Génère le dossier statique optimisé `dist`)
- **Linter TypeScript :** `npm run lint` (Vérification statique des types)
