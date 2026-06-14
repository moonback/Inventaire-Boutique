import { CategoryItem } from '../types';

interface Rule {
  category: string;
  keywords: string[];
}

const RULES: Rule[] = [
  {
    category: 'Produits laitiers',
    keywords: ['lait', 'yaourt', 'fromage', 'beurre', 'crème', 'creme', 'dairy', 'milk', 'cheese', 'yogurt', 'skyr', 'mozzarella', 'parmesan', 'ricotta', 'brie', 'camembert', 'chèvre', 'chevre', 'emmental', 'laitier', 'cream', 'danone', 'activia', 'yop'],
  },
  {
    category: 'Viandes',
    keywords: ['viande', 'bœuf', 'boeuf', 'poulet', 'porc', 'jambon', 'charcuterie', 'meat', 'beef', 'chicken', 'ham', 'saucisse', 'lard', 'bacon', 'steak', 'dinde', 'veau', 'agneau', 'pâté', 'pate en croute', 'salami', 'chorizo'],
  },
  {
    category: 'Poissons',
    keywords: ['poisson', 'saumon', 'thon', 'colin', 'cabillaud', 'crevette', 'fish', 'salmon', 'tuna', 'truite', 'sardine', 'crabe', 'crevettes', 'fruit de mer', 'seafood', 'anchois', 'maquereau', 'cabillaud', 'fish'],
  },
  {
    category: 'Conserves',
    keywords: ['conserve', 'boite', 'boîte', 'sardines en boite', 'can', 'canned', 'sauce tomate boite', 'haricots blancs conserve', 'macédoine', 'macedoine', 'ravioli conserve', 'confit', 'paté en boîte'],
  },
  {
    category: 'Pâtes et céréales',
    keywords: ['pâte', 'pate', 'céréale', 'cereale', 'coquillette', 'spaghetti', 'penne', 'pasta', 'cereal', 'nouille', 'flocon', 'avoine', 'blé', 'semoule', 'quinoa', 'muesli', 'corn flakes', 'coquillettes', 'tagliatelle', 'macaroni'],
  },
  {
    category: 'Riz',
    keywords: ['riz', 'rice', 'basmati', 'jasmin', 'arborio', 'riz pilaf', 'riz gluant'],
  },
  {
    category: 'Légumes',
    keywords: ['légume', 'legume', 'carotte', 'salade', 'tomate', 'courgette', 'haricot', 'vegetable', 'carrot', 'tomato', 'avocat', 'oignon', 'ail', 'pomme de terre', 'poireau', 'brocolis', 'chou', 'concombre', 'aubergine', 'épinard', 'spinach', 'potato'],
  },
  {
    category: 'Fruits',
    keywords: ['fruit', 'pomme', 'banane', 'orange', 'fraise', 'apple', 'banana', 'strawberry', 'citron', 'pêche', 'peche', 'abricot', 'poire', 'ananas', 'raisin', 'mango', 'mangue', 'framboise', 'cherry', 'cerise'],
  },
  {
    category: 'Biscuits',
    keywords: ['biscuit', 'gâteau', 'gateau', 'cookie', 'cookies', 'madeleine', 'gaufre', 'cookie', 'sablé', 'cracker', 'palmier', 'macaron', 'crêpe', 'crepe', 'muffin'],
  },
  {
    category: 'Confiseries',
    keywords: ['confiserie', 'chocolat', 'bonbon', 'bonbons', 'candy', 'sweets', 'chocolate', 'sucette', 'caramel', 'nougat', 'guimauve', 'chewing-gum', 'gum', 'chocolat noir', 'chocolat au lait', 'nutella'],
  },
  {
    category: 'Boissons',
    keywords: ['boisson', 'jus', 'eau', 'soda', 'coca', 'fanta', 'bière', 'biere', 'vin', 'drink', 'water', 'juice', 'beer', 'wine', 'cola', 'schweppes', 'sprite', 'orangina', 'limonade', 'ice tea', 'café', 'cafe', 'thé', 'the', 'champagne', 'cidre'],
  },
  {
    category: 'Épicerie',
    keywords: ['sel', 'poivre', 'épice', 'epice', 'huile', 'vinaigre', 'sauce', 'moutarde', 'epicerie', 'grocery', 'spice', 'oil', 'mayonnaise', 'ketchup', 'sel de table', 'sucre', 'miel', 'farine', 'levure', 'olive', 'bouillon', 'curry'],
  },
  {
    category: 'Surgelés',
    keywords: ['surgelé', 'surgele', 'glace', 'frozen', 'ice cream', 'sorbet', 'pizza surgelée', 'frites surgelées', 'poisson surgelé'],
  },
  {
    category: 'Entretien',
    keywords: ['entretien', 'lessive', 'nettoyant', 'vaisselle', 'propreté', 'clean', 'detergent', 'washing', 'adoucissant', 'eponge', 'éponge', 'sac poubelle', 'javel', 'dégraissant', 'desinfectant', 'désinfectant'],
  },
  {
    category: 'Hygiène',
    keywords: ['hygiène', 'hygiene', 'savon', 'shampoing', 'dentifrice', 'papier toilette', 'toilet', 'soap', 'shampoo', 'toothpaste', 'brosse à dents', 'déodorant', 'deodorant', 'gel douche', 'serviette', 'mouchoir', 'coton'],
  },
];

/**
 * Automatically suggests a category from DB categories based on the product name and raw categories from OpenFoodFacts
 */
export function suggestCategory(
  productName: string,
  rawCategory?: string,
  dbCategories: CategoryItem[] = []
): string | undefined {
  const nameLower = productName.toLowerCase();
  const rawCatLower = rawCategory ? rawCategory.toLowerCase() : '';

  // 1. Try to match the predefined keyword rules
  for (const rule of RULES) {
    // Check if the current rule exists in dbCategories (or dbCategories is empty, in which case we fall back to rules list)
    const existsInDb = dbCategories.length === 0 || dbCategories.some(dbCat => dbCat.name.toLowerCase() === rule.category.toLowerCase());
    if (!existsInDb) continue;

    for (const keyword of rule.keywords) {
      // Check for exact word matches or clear substrings
      const nameRegex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (nameRegex.test(nameLower) || nameRegex.test(rawCatLower)) {
        // Find the exact name from DB categories to preserve formatting and casing
        const matchedDbCat = dbCategories.find(dbCat => dbCat.name.toLowerCase() === rule.category.toLowerCase());
        return matchedDbCat ? matchedDbCat.name : rule.category;
      }
    }
  }

  // 2. Direct string match against DB categories names
  for (const dbCat of dbCategories) {
    const catNameLower = dbCat.name.toLowerCase();
    // If the category name is inside the rawCategory or productName
    if (rawCatLower.includes(catNameLower) || nameLower.includes(catNameLower)) {
      return dbCat.name;
    }
  }

  return undefined;
}
