import { ProductLookupData } from './types';

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find(value => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function firstCategory(categories?: string) {
  return categories
    ?.split(',')
    .map(category => category.trim())
    .find(Boolean);
}

export async function getProductData(barcode: string): Promise<ProductLookupData | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    if (data.status === 1) {
      const product = data.product;

      return {
        name: firstNonEmpty(
          product.product_name_fr,
          product.product_name,
          product.generic_name_fr,
          product.generic_name,
        ) || 'Produit inconnu',
        imageUrl: firstNonEmpty(product.image_url, product.image_front_url),
        brand: firstNonEmpty(product.brands),
        category: firstNonEmpty(
          firstCategory(product.categories),
          product.categories_tags?.[0]?.replace(/^\w\w:/, '').replace(/-/g, ' '),
        ),
      };
    }
    return null; // Produit non trouvé
  } catch (error) {
    console.error('Erreur API OpenFoodFacts:', error);
    return null;
  }
}
