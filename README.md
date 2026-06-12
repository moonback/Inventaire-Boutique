# Inventaire Boutique

Une application web moderne et réactive de gestion d'inventaire pour boutique, conçue pour un scan ultrarapide et une collecte de données de produits automatisée.

## 🚀 Fonctionnalités Principales

- **Scan de Code-barres EAN-13** : 
  - Prise en charge transparente des scanners matériels (douchettes USB/Bluetooth) sans avoir besoin de cliquer dans un champ spécifique.
  - Scanner intégré via la caméra (smartphone/ordinateur) pour numériser en direct.
- **Intégration OpenFoodFacts** : Récupération automatique et instantanée du nom du produit, de sa marque, de sa catégorie et de sa photo via l'API publique OpenFoodFacts.
- **Flux de Quantité Rapide** : À chaque scan, une popup s'affiche automatiquement en plaçant le curseur sur le champ quantité pour une saisie ultra-fluide.
- **Mode Saisie Manuelle** : Permet la création d'articles à la volée lorsqu'un code-barres n'est pas reconnu par les bases de données publiques.
- **Persistance Locale** : L'inventaire est enregistré localement et automatiquement dans le navigateur (Local Storage).
- **Export CSV** : Un simple bouton permet d'extraire tout le stock actuel sous forme de tableau exploitable sur Excel.

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript
- **Style** : Tailwind CSS v4, Lucide React (icônes)
- **Scanner Caméra** : html5-qrcode
- **Outil de Build** : Vite

## 📦 Utilisation

1. **Scanner** : Flashez simplement un article avec votre douchette, ou utilisez le mode "Caméra" si vous êtes sur mobile.
2. **Quantité** : Tapez le nombre d'articles ajoutés (le curseur y est déjà focus) et pressez `Entrée`.
3. **Produit Inconnu ?** : Si le produit est introuvable sur OpenFoodFacts, l'application vous demandera de lui attribuer un nom la première fois.
4. **Ajustements** : Dans la grille des produits, vous pouvez ajuster manuellement (`+` / `-`) ou supprimer complètement l'article.
5. **Sauvegarde** : Exportez le fichier `.csv` en fin de session pour transmettre le bilan à votre comptabilité.
