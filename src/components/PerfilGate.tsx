import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Loader2, Sparkles, Send, Eye, EyeOff } from "lucide-react";
import { usePerfilAtivo, refreshPerfil } from "@/lib/perfis-store";
import { supabase } from "@/integrations/supabase/client";
import { requestOtp, verifyOtp } from "@/lib/otp.functions";
import { useServerFn } from "@tanstack/react-start";

export function PerfilGate({ children }: { children: ReactNode }) {
  const { perfil, carregado } = usePerfilAtivo();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("Dra. ");
  const [nascimento, setNascimento] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRequestOtp = useServerFn(requestOtp);
  const triggerVerifyOtp = useServerFn(verifyOtp);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        // Quem já tem conta entra direto, sem código no e-mail.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        window.sessionStorage.removeItem("pending_otp_email");
        window.location.reload();
        return;
      }

      if (password !== confirmPassword) {
        throw new Error("As senhas não conferem.");
      }

      // No cadastro o código serve para confirmar que o e-mail é dela mesma.
      await triggerRequestOtp({
        data: {
          email: email.trim(),
          password,
          nome,
          data_nascimento: nascimento || undefined,
          periodo: periodo.trim() || undefined,
        },
      });

      window.sessionStorage.setItem("pending_otp_email", email.trim());
      setSent(true);
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err.message || "Erro ao processar autenticação.";
      
      if (msg.includes("Invalid login credentials")) {
        msg = "E-mail ou senha incorretos. Verifique seus dados e tente novamente, MedGata! 🌸";
      } else if (msg.includes("weak and easy to guess")) {
        msg = "Esta senha é muito fraca e fácil de adivinhar. Por favor, escolha uma mais forte (ex: use letras e números).";
      } else if (msg.includes("User already registered")) {
        msg = "Este e-mail já está cadastrado. Que tal tentar fazer o login? ✨";
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      // O servidor confere o código (hash, validade e tentativas) e só
      // devolve a sessão se estiver tudo certo.
      const sessao = await triggerVerifyOtp({ data: { email, password, otp } });

      const { error: sessErr } = await supabase.auth.setSession({
        access_token: sessao.access_token,
        refresh_token: sessao.refresh_token,
      });
      if (sessErr) {
        throw new Error(
          "Código validado, mas não consegui salvar sua sessão neste navegador. Se estiver em aba anônima ou com cookies bloqueados, tente numa aba normal. 🌸",
        );
      }

      window.sessionStorage.removeItem("pending_otp_email");
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || "Código incorreto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const savedEmail = window.sessionStorage.getItem("pending_otp_email");
    if (savedEmail && !perfil) {
      setEmail(savedEmail);
      // Só o cadastro deixa código pendente. A senha não fica guardada,
      // então ao recarregar ela refaz o cadastro (o e-mail já vem preenchido).
      setMode("signup");
      setSent(false);
    }
  }, [perfil]);

  // Na sala de espera a tela precisa se virar sozinha: sem isso a aluna ficava
  // olhando o "processando" para sempre, mesmo depois da Naty já ter aceitado.
  const naFila = !!perfil && !perfil.is_accepted && !perfil.is_admin;
  useEffect(() => {
    if (!naFila) return;
    const id = window.setInterval(refreshPerfil, 15_000);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") refreshPerfil();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [naFila]);

  if (!carregado) return null;

  // Se o código OTP foi enviado mas ainda não foi validado, mostramos a tela de OTP
  // independente do status do perfil no Supabase (que pode já existir após o signUp)
  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-pink-50/80 px-4 backdrop-blur-md overflow-y-auto py-10">
        <div className="w-full max-w-md rounded-[2.5rem] border border-pink-100 bg-white p-8 text-center shadow-2xl my-auto">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-3xl shadow-sm ring-4 ring-white">
            <img 
              src="/favicon.png" 
              alt="🌸" 
              className="h-10 w-10 object-contain"
            />
          </div>
          <h2 className="font-serif text-3xl text-pink-700">Confirme seu E-mail</h2>
          <p className="mt-2 text-pink-500/70 text-sm">
            Falta só confirmar que este e-mail é seu.
          </p>

          <form onSubmit={handleVerifyOtp} className="mt-8 text-left">
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-xs font-bold uppercase tracking-widest text-pink-400 ml-4">Código de Acesso</label>
              <input
                type="text"
                required
                autoFocus
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="w-full rounded-full border border-pink-100 bg-pink-50/30 px-6 py-4 text-center text-2xl tracking-[0.5em] font-bold text-pink-700 outline-none focus:border-pink-300"
              />
              <p className="text-center text-[10px] text-pink-400 leading-relaxed">
                Quase lá! Enviamos um código para {email}.<br/>
                Verifique seu e-mail para finalizar.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-pink-500 py-4 font-bold text-white shadow-lg shadow-pink-200 transition-all hover:bg-pink-600 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Código ✨"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  window.sessionStorage.removeItem("pending_otp_email");
                }}
                className="w-full text-xs text-pink-400 hover:text-pink-600 underline underline-offset-2 text-center"
              >
                Voltar
              </button>
            </div>
          </form>

          {error && <p className="mt-4 text-[10px] leading-relaxed font-medium text-rose-500 bg-rose-50/50 p-3 rounded-2xl border border-rose-100">{error}</p>}
        </div>
      </div>
    );
  }

  // Usuário logado
  if (perfil) {
    // A página de "Sala de Espera" (pendente) só deve aparecer DEPOIS da validação do código
    // Se o usuário está logado mas NÃO validou o e-mail ou NÃO foi aceito, mostramos a sala de espera.
    // No entanto, o usuário quer que APÓS o cadastro/login (auth.signUp/signIn), 
    // ele vá para a tela de OTP antes de qualquer outra coisa.
    
    // Se perfil.is_accepted for falso, ele cai na sala de espera.
    // O problema é que o perfil é carregado assim que o auth.session existe.
    if (!perfil.is_accepted && !perfil.is_admin) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pink-50/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[2.5rem] border border-pink-100 bg-white p-10 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-4xl shadow-inner">
              <img 
                src="/favicon.png" 
                alt="👑" 
                className="h-12 w-12 object-contain"
              />
            </div>
            <h2 className="font-serif text-3xl text-pink-700">Sala de Espera ✨</h2>
            <p className="mt-4 text-pink-600/80 leading-relaxed">
              Oie! Seu cadastro foi recebido com sucesso. <br/>
              Agora é só aguardar a <strong className="text-pink-600">Doutora Naty</strong> te aceitar no consultório.
            </p>
            <p className="mt-3 text-xs text-pink-400 leading-relaxed">
              Pode deixar esta página aberta: assim que ela aceitar, você entra
              automaticamente. 💗
            </p>
            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2 rounded-full bg-pink-50 px-4 py-2 text-xs font-medium text-pink-500 animate-pulse">
                <Sparkles className="h-3 w-3" />
                Verificando seu acesso...
              </div>
            </div>
            <button
              onClick={refreshPerfil}
              className="mt-6 rounded-full border border-pink-200 bg-white px-5 py-2 text-xs font-bold text-pink-600 shadow-sm transition-all hover:bg-pink-50 active:scale-95"
            >
              Verificar agora
            </button>
            <button
              onClick={logoutGlobal}
              className="mt-6 block w-full text-sm text-pink-400 hover:text-pink-600 underline underline-offset-4"
            >
              Sair da conta
            </button>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  }

  // Não logado - Mostra Login/Cadastro (Med-Login)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pink-50/80 px-4 backdrop-blur-md overflow-y-auto py-10">
      <div className="w-full max-w-md rounded-[2.5rem] border border-pink-100 bg-white p-8 text-center shadow-2xl my-auto">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-3xl shadow-sm ring-4 ring-white">
          <img 
            src="/favicon.png" 
            alt="🌸" 
            className="h-10 w-10 object-contain"
          />
        </div>
        <h2 className="font-serif text-3xl text-pink-700">
          {mode === "login" ? "Bem-vinda de volta!" : "Seja uma MedGata!"}
        </h2>
        <p className="mt-2 text-pink-500/70 text-sm">
          {mode === "login" 
            ? "Acesse seu consultório de estudos." 
            : "Crie sua conta para começar a brilhar."}
        </p>

        <form onSubmit={handleAuth} className="mt-8 text-left">
          {true && (
            <div className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-pink-400 ml-4">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Dra. Nome Sobrenome"
                      className="w-full rounded-full border border-pink-100 bg-pink-50/30 px-6 py-3 text-pink-800 placeholder:text-pink-200 outline-none focus:border-pink-300 transition-all text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-pink-400 ml-4">Nascimento</label>
                      <input
                        type="text"
                        required
                        value={nascimento}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (val.length > 8) val = val.substring(0, 8);
                          if (val.length > 4) {
                            val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                          } else if (val.length > 2) {
                            val = `${val.slice(0, 2)}/${val.slice(2)}`;
                          }
                          setNascimento(val);
                        }}
                        placeholder="DD/MM/AAAA"
                        className="w-full rounded-full border border-pink-100 bg-pink-50/30 px-6 py-3 text-pink-800 placeholder:text-pink-200 outline-none focus:border-pink-300 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-pink-400 ml-4">Período (Med)</label>
                      <input
                        type="text"
                        required
                        value={periodo}
                        onChange={(e) => setPeriodo(e.target.value)}
                        placeholder="1º Período"
                        className="w-full rounded-full border border-pink-100 bg-pink-50/30 px-6 py-3 text-pink-800 placeholder:text-pink-200 outline-none focus:border-pink-300 transition-all text-sm"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-pink-400 ml-4">E-mail Acadêmico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@med.com"
                  className="w-full rounded-full border border-pink-100 bg-pink-50/30 px-6 py-3 text-pink-800 placeholder:text-pink-200 outline-none focus:border-pink-300 transition-all text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-pink-400 ml-4">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-full border border-pink-100 bg-pink-50/30 px-6 py-3 pr-12 text-pink-800 placeholder:text-pink-200 outline-none focus:border-pink-300 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-300 hover:text-pink-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-pink-400 ml-4">Confirmar Senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-full border border-pink-100 bg-pink-50/30 px-6 py-3 pr-12 text-pink-800 placeholder:text-pink-200 outline-none focus:border-pink-300 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-300 hover:text-pink-500 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-pink-500 py-4 font-bold text-white shadow-lg shadow-pink-200 transition-all hover:bg-pink-600 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4" /> {mode === "login" ? "Entrar" : "Criar Conta"}</>}
              </button>

              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="w-full text-xs text-pink-400 hover:text-pink-600 underline underline-offset-4 text-center mt-2"
              >
                {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça Login"}
              </button>
            </div>
          )}
        </form>

        {error && <p className="mt-4 text-[10px] leading-relaxed font-medium text-rose-500 bg-rose-50/50 p-3 rounded-2xl border border-rose-100">{error}</p>}
        
        <p className="mt-8 text-[11px] text-pink-300 italic">
          O acesso é pessoal e intransferível. <br/>
          Suas amigas precisam da aprovação da Naty para entrar. 🎀
        </p>
      </div>
    </div>
  );
}

export function logoutGlobal() {
  if (typeof window === "undefined") return;
  supabase.auth.signOut().then(() => {
    window.location.href = "/";
  });
}

export function trocarPerfil() {
  // Com Auth real, trocar perfil é logout e login com outra conta se necessário,
  // ou apenas logout.
  logoutGlobal();
}
