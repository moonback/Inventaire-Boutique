import { useState, FormEvent } from "react";
import { Store, Loader2, Mail, Lock, ArrowRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { signIn, signUp, UserSession } from "../lib/supabaseAuth";

interface AuthScreenProps {
  onAuthSuccess: (session: UserSession) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const session = await signIn(trimmedEmail, password);
        onAuthSuccess(session);
      } else {
        const session = await signUp(trimmedEmail, password);
        setSuccessMessage("Inscription réussie ! Vous êtes connecté.");
        setTimeout(() => {
          onAuthSuccess(session);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mx-auto">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Boutique</h1>
          <p className="text-xs text-stone-500 font-medium">
            Connectez-vous pour accéder à votre inventaire
          </p>
        </div>

        {/* Auth Panel */}
        <div className="surface-card rounded-[2rem] p-6 relative overflow-hidden">
          {/* Slide transition container for switching forms */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              {isLogin ? "Connexion" : "Créer un compte"}
            </h2>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-600"
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-600"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-pulse" />
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 glass-input rounded-xl text-sm font-semibold text-stone-900 outline-none transition"
                    placeholder="nom@boutique.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 glass-input rounded-xl text-sm font-semibold text-stone-900 outline-none transition"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer select-none mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{isLogin ? "Se connecter" : "S'inscrire"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle link */}
          <div className="mt-5 pt-4 border-t border-stone-200 text-center">
            {/* <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMessage(null);
              }}
              disabled={loading}
              className="text-xs text-stone-500 hover:text-indigo-600 font-semibold transition"
            >
              {isLogin
                ? "Nouveau ici ? Créez un compte"
                : "Vous avez déjà un compte ? Connectez-vous"}
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
