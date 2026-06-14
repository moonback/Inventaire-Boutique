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
    <div className="min-h-screen bg-[#070b13] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Boutique</h1>
          <p className="text-xs text-slate-400 font-medium">
            Connectez-vous pour accéder à votre inventaire
          </p>
        </div>

        {/* Auth Panel */}
        <div className="glass-panel rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
          {/* Slide transition container for switching forms */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">
              {isLogin ? "Connexion" : "Créer un compte"}
            </h2>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-xs text-red-400"
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
                  className="flex gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-xs text-emerald-400"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 animate-pulse" />
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-indigo-500 text-sm font-semibold text-white outline-none transition"
                    placeholder="nom@boutique.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-indigo-500 text-sm font-semibold text-white outline-none transition"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-950/20 flex items-center justify-center gap-2 transition cursor-pointer select-none mt-2"
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
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMessage(null);
              }}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-indigo-400 font-semibold transition"
            >
              {isLogin
                ? "Nouveau ici ? Créez un compte"
                : "Vous avez déjà un compte ? Connectez-vous"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
