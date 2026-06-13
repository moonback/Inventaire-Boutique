# Inventaire Boutique

Une application web moderne et réactive de gestion d'inventaire pour boutique, conçue pour un scan ultrarapide et une collecte de données de produits automatisée.

## 🚀 Fonctionnalités Principales

- **Scan de Code-barres EAN-13** : 
  - Prise en charge transparente des scanners matériels (douchettes USB/Bluetooth) sans avoir besoin de cliquer dans un champ spécifique.
  - Scanner intégré via la caméra (smartphone/ordinateur) pour numériser en direct.
- **Intégration OpenFoodFacts** : Récupération automatique et instantanée du nom du produit, de sa marque, de sa catégorie et de sa photo via l'API publique OpenFoodFacts.
- **Flux de Quantité Rapide** : À chaque scan, une popup s'affiche automatiquement en plaçant le curseur sur le champ quantité pour une saisie ultra-fluide.
- **Mode Saisie Manuelle** : Permet la création d'articles à la volée lorsqu'un code-barres n'est pas reconnu par les bases de données publiques.
- **Synchronisation Supabase** : L'inventaire est enregistré dans une base de données Supabase afin de retrouver les données depuis un autre navigateur ou appareil.
- **Export CSV** : Un simple bouton permet d'extraire tout le stock actuel sous forme de tableau exploitable sur Excel.

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript
- **Style** : Tailwind CSS v4, Lucide React (icônes)
- **Scanner Caméra** : html5-qrcode
- **Backend** : Supabase (API REST PostgREST)
- **Outil de Build** : Vite



## ☁️ Configuration Supabase

1. Créez un projet Supabase.
2. Exécutez le contenu de `supabase-schema.sql` dans l'éditeur SQL Supabase pour créer la table `inventory_items` et ses règles RLS.
3. Copiez `.env.example` vers `.env.local` puis renseignez :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_INVENTORY_TABLE` si vous souhaitez utiliser un autre nom de table.
4. Redémarrez le serveur Vite après modification des variables d'environnement.

## 📦 Utilisation

1. **Scanner** : Flashez simplement un article avec votre douchette, ou utilisez le mode "Caméra" si vous êtes sur mobile.
2. **Quantité** : Tapez le nombre d'articles ajoutés (le curseur y est déjà focus) et pressez `Entrée`.
3. **Produit Inconnu ?** : Si le produit est introuvable sur OpenFoodFacts, l'application vous demandera de lui attribuer un nom la première fois.
4. **Ajustements** : Dans la grille des produits, vous pouvez ajuster manuellement (`+` / `-`) ou supprimer complètement l'article.
5. **Sauvegarde** : Exportez le fichier `.csv` en fin de session pour transmettre le bilan à votre comptabilité.
