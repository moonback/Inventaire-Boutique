# TODO - Fix Supabase 401 / JWT expired

## Plan récapitulatif
- Stopper l’usage d’un access token expiré stocké dans localStorage.
- Forcer un re-login quand le JWT est expiré (pas de refresh-token dans ce projet).
- Nettoyer la session si Supabase renvoie 401.

## Étapes
- [ ] Mettre à jour `src/lib/supabaseAuth.ts` : détecter l’expiration du JWT et invalider la session.
- [ ] Mettre à jour `src/lib/supabaseCategories.ts` : sur erreur 401, clearSession.
- [ ] Mettre à jour `src/lib/supabaseInventory.ts` : sur erreur 401, clearSession.
- [ ] Vérifier le comportement UI dans `src/App.tsx` (retour automatique à AuthScreen via session null).
- [ ] Lancer `npm run dev` et tester le re-login.

