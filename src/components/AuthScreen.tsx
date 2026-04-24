import { useState } from "react";
import { motion } from "motion/react";
import { Plane, Eye, EyeOff } from "lucide-react";
import { TRAVEL_HERO_BACKGROUND_SRC } from "@/lib/travel-hero-bg";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface AuthScreenProps {
  mode: "register" | "login";
  onRegister: () => void;
  onLogin: () => void;
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
}

export function AuthScreen({ mode, onRegister, onLogin, onSwitchToLogin, onSwitchToRegister }: AuthScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register") onRegister();
    else onLogin();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Static background image */}
      <ImageWithFallback
        src={TRAVEL_HERO_BACKGROUND_SRC}
        alt="Travel background"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        fetchPriority="high"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Auth card */}
      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] rounded-3xl bg-white/10 backdrop-blur-xl p-6 sm:p-10 shadow-2xl border border-white/20"
        >
          {/* Logo */}
          <div className="mb-6 sm:mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "#4ECDC4" }}>
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-[20px] sm:text-[22px]" style={{ fontWeight: 600, color: "#ffffff" }}>TravelPlanner</span>
          </div>

          <h1 className="mb-1" style={{ fontSize: "24px", fontWeight: 600, lineHeight: 1.3, color: "#ffffff" }}>
            {mode === "register" ? "Создайте аккаунт" : "Войдите в аккаунт"}
          </h1>
          <p className="mb-6 sm:mb-8" style={{ fontSize: "15px", color: "rgba(255,255,255,0.7)" }}>
            {mode === "register"
              ? "Начните планировать идеальное путешествие"
              : "Рады видеть вас снова"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-1.5 block" style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>Имя</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none transition-all focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/30 backdrop-blur-sm"
                  style={{ fontSize: "15px" }}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block" style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none transition-all focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/30 backdrop-blur-sm"
                style={{ fontSize: "15px" }}
              />
            </div>

            <div>
              <label className="mb-1.5 block" style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pr-12 text-white placeholder-white/40 outline-none transition-all focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/30 backdrop-blur-sm"
                  style={{ fontSize: "15px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl py-3.5 text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#4ECDC4", fontSize: "15px", fontWeight: 600 }}
            >
              {mode === "register" ? "Зарегистрироваться" : "Войти"}
            </button>
          </form>

          <p className="mt-6 text-center" style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
            {mode === "register" ? "Уже есть аккаунт? " : "Нет аккаунта? "}
            <button
              onClick={mode === "register" ? onSwitchToLogin : onSwitchToRegister}
              className="hover:underline"
              style={{ color: "#4ECDC4", fontWeight: 600 }}
            >
              {mode === "register" ? "Войти" : "Зарегистрироваться"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}