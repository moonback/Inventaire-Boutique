export async function getProductData(barcode: string) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    if (data.status === 1) {
      return {
        name: data.product.product_name_fr || data.product.product_name || "Produit inconnu",
        imageUrl: data.product.image_url || data.product.image_front_url || undefined,
        brand: data.product.brands || undefined,
        category: data.product.categories?.split(',')[0] || undefined,
      };
    }
    return null; // Produit non trouvé
  } catch (error) {
    console.error("Erreur API OpenFoodFacts:", error);
    return null;
  }
}
