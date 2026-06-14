import { ProductLookupData } from './types';

const OFF_V2 = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_V0 = 'https://world.openfoodfacts.org/api/v0/product';
const REQUEST_TIMEOUT_MS = 8000;

// On ne demande que les champs utiles → réponse plus légère et plus rapide.
const OFF_FIELDS = [
  'product_name',
  'product_name_fr',
  'generic_name',
  'generic_name_fr',
  'abbreviated_product_name',
  'brands',
  'categories',
  'categories_tags',
  'image_front_url',
  'image_url',
  'image_front_small_url',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'nutriscore_grade',
].join(',');

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

/** Réduit les espaces multiples et coupe. */
function cleanText(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Met une majuscule à chaque mot en conservant les séparateurs (espaces, tirets). */
function titleCase(value?: string): string | undefined {
  const cleaned = cleanText(value);
  if (!cleaned) return undefined;
  return cleaned.replace(/[\p{L}\p{N}]+/gu, (word) =>
    word.charAt(0).toLocaleUpperCase('fr') + word.slice(1).toLocaleLowerCase('fr'),
  );
}

/** Nom du produit : français d'abord, puis générique, puis abrégé. */
function pickName(p: any): string | undefined {
  return firstNonEmpty(
    p.product_name_fr,
    p.product_name,
    p.generic_name_fr,
    p.generic_name,
    p.abbreviated_product_name,
  );
}

/** Première marque, joliment formatée. */
function pickBrand(p: any): string | undefined {
  const first = p.brands?.split(',').map((b: string) => b.trim()).find(Boolean);
  return titleCase(first);
}

/** Catégorie : on privilégie le tag français, sinon la première catégorie texte. */
function pickCategory(p: any): string | undefined {
  const tags: string[] = Array.isArray(p.categories_tags) ? p.categories_tags : [];
  // Dernier tag = catégorie la plus précise ; on préfère un tag "fr:".
  const frTag = [...tags].reverse().find((t) => t.startsWith('fr:'));
  const fallbackTag = tags[tags.length - 1];
  const fromTag = (frTag || fallbackTag)?.replace(/^\w\w:/, '').replace(/-/g, ' ');

  const fromText = p.categories
    ?.split(',')
    .map((c: string) => c.trim())
    .filter(Boolean)
    .pop();

  return titleCase(firstNonEmpty(fromTag, fromText));
}

/** Image : on vise le visuel de face en priorité. */
function pickImage(p: any): string | undefined {
  return firstNonEmpty(p.image_front_url, p.image_url, p.image_front_small_url);
}

/** Contenance / format (ex : « 330 ml », « 1 L », « 500 g ») — info clé pour le stock. */
function pickFormat(p: any): string | undefined {
  const human = cleanText(p.quantity);
  if (human) return human;

  const amount = p.product_quantity;
  const unit = cleanText(p.product_quantity_unit);
  if (amount && unit) {
    const n = Number(amount);
    return Number.isFinite(n) ? `${n} ${unit}` : undefined;
  }
  return undefined;
}

/** Ajoute la contenance au nom si elle n'y figure pas déjà. */
function withFormat(name: string, format?: string): string {
  if (!format) return name;
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  if (normalize(name).includes(normalize(format))) return name;
  return `${name} ${format}`;
}

function mapProduct(product: any): ProductLookupData {
  const baseName = pickName(product) || 'Produit inconnu';
  const format = pickFormat(product);
  const grade = cleanText(product.nutriscore_grade)?.toLowerCase();

  return {
    name: withFormat(baseName, format),
    imageUrl: pickImage(product),
    brand: pickBrand(product),
    category: pickCategory(product),
    format,
    nutriScore: grade && /^[a-e]$/.test(grade) ? grade : undefined,
  };
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      console.warn('OpenFoodFacts : délai dépassé pour', url);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getProductData(barcode: string): Promise<ProductLookupData | null> {
  const code = barcode.trim();
  if (!code) return null;

  try {
    // 1) API v2 (rapide, champs ciblés).
    const v2 = await fetchJson(`${OFF_V2}/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
    if (v2?.status === 1 && v2.product) {
      const mapped = mapProduct(v2.product);
      if (mapped.name && mapped.name !== 'Produit inconnu') {
        return mapped;
      }
    }

    // 2) Repli sur l'API v0 si la v2 n'a rien donné d'exploitable.
    const v0 = await fetchJson(`${OFF_V0}/${encodeURIComponent(code)}.json`);
    if (v0?.status === 1 && v0.product) {
      return mapProduct(v0.product);
    }

    return null; // Produit non trouvé
  } catch (error) {
    console.error('Erreur API OpenFoodFacts:', error);
    return null;
  }
}
