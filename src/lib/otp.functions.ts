import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

const OTP_TTL_MIN = 10;
const MAX_TENTATIVAS = 5;
const JANELA_REENVIO_SEG = 60;

function hashCode(email: string, code: string) {
  const pepper = process.env["OTP_PEPPER"] ?? "";
  return createHash("sha256")
    .update(`${email.toLowerCase()}:${code}:${pepper}`)
    .digest("hex");
}

function comparaSeguro(a: string, b: string) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Cliente de autenticacao sem sessao persistida.
 * Precisa do mesmo ajuste de header do client gerado: as chaves novas
 * (sb_publishable_/sb_secret_) nao sao JWT, entao o Authorization: Bearer
 * <chave> que o supabase-js manda por padrao tem que sair.
 */
async function criarClienteAuth() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "Faltam SUPABASE_URL ou SUPABASE_PUBLISHABLE_KEY no ambiente do servidor.",
    );
  }

  const chaveNova = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
  const fetchAjustado: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    }
    if (chaveNova && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };

  return createClient(url, key, {
    global: { fetch: fetchAjustado },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function emailHtml(otp: string) {
  return `
    <div style="font-family: sans-serif; color: #db2777; text-align: center; padding: 40px; background-color: #fdf2f8; border-radius: 20px;">
      <h1 style="font-size: 24px;">Olá, MedGata! ✨</h1>
      <p style="font-size: 16px; color: #be185d;">Aqui está seu código de acesso para a plataforma:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 30px 0; color: #ec4899; background: white; padding: 20px; border-radius: 50px; display: inline-block;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #f472b6;">Ele vale por ${OTP_TTL_MIN} minutos. Use para entrar e brilhar nos estudos. 💅🩺</p>
      <p style="font-size: 11px; color: #f9a8d4; margin-top: 24px;">Se não foi você que pediu, é só ignorar este e-mail.</p>
    </div>
  `;
}

/**
 * Passo 1: valida e-mail + senha NO SERVIDOR (sem criar sessão no navegador),
 * gera o código, guarda só o hash e envia o e-mail bonitinho via Resend.
 */
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
        mode: z.enum(["login", "signup"]),
        nome: z.string().optional(),
        data_nascimento: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase().trim();

    if (data.mode === "signup") {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          nome: data.nome ?? "Estudante",
          data_nascimento: data.data_nascimento || null,
        },
      });
      if (error) throw new Error(error.message);
    } else {
      // Confere a senha no servidor. Este client não persiste sessão,
      // então nada é entregue ao navegador antes do código ser validado.
      const check = await criarClienteAuth();
      const { error } = await check.auth.signInWithPassword({
        email,
        password: data.password,
      });
      if (error) throw new Error(error.message);
    }

    // Anti-spam: no máximo 1 envio por minuto por e-mail.
    const { data: recente } = await supabaseAdmin
      .from("otp_codes")
      .select("criado_em")
      .eq("email", email)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recente) {
      const idade = (Date.now() - new Date(recente.criado_em).getTime()) / 1000;
      if (idade < JANELA_REENVIO_SEG) {
        throw new Error(
          `Calma, MedGata! Espere ${Math.ceil(JANELA_REENVIO_SEG - idade)}s para pedir outro código. 🌸`,
        );
      }
    }

    // Invalida códigos anteriores ainda abertos.
    await supabaseAdmin
      .from("otp_codes")
      .update({ consumido: true })
      .eq("email", email)
      .eq("consumido", false);

    const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");

    const { error: insErr } = await supabaseAdmin.from("otp_codes").insert({
      email,
      code_hash: hashCode(email, otp),
      expira_em: new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString(),
    });
    if (insErr) throw new Error("Não foi possível gerar o código. Tente de novo.");

    const RESEND_API_KEY = process.env["RESEND_API_KEY"];
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured.");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Estudo Rosa <noreply@natymed.com.br>",
        to: [email],
        subject: "Seu Código de Acesso - Estudo Rosa 🌸",
        html: emailHtml(otp),
      }),
    });

    if (!response.ok) {
      const erro = await response.json().catch(() => ({}));
      console.error("Resend API Error:", erro);
      throw new Error("Não conseguimos enviar o e-mail. Confira o endereço.");
    }

    return { success: true };
  });

/**
 * Passo 2: confere o código no servidor e só então devolve a sessão.
 */
export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
        otp: z.string().regex(/^\d{6}$/, "O código tem 6 dígitos."),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase().trim();
    const generico = "Código inválido ou expirado. Peça um novo. 🌸";

    const { data: registro } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("consumido", false)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!registro) throw new Error(generico);

    if (new Date(registro.expira_em).getTime() < Date.now()) {
      await supabaseAdmin.from("otp_codes").update({ consumido: true }).eq("id", registro.id);
      throw new Error(generico);
    }

    if (registro.tentativas >= MAX_TENTATIVAS) {
      await supabaseAdmin.from("otp_codes").update({ consumido: true }).eq("id", registro.id);
      throw new Error("Muitas tentativas. Peça um código novo, MedGata. 🌸");
    }

    if (!comparaSeguro(registro.code_hash, hashCode(email, data.otp))) {
      await supabaseAdmin
        .from("otp_codes")
        .update({ tentativas: registro.tentativas + 1 })
        .eq("id", registro.id);
      throw new Error(generico);
    }

    await supabaseAdmin.from("otp_codes").update({ consumido: true }).eq("id", registro.id);

    // Código conferido: agora sim emitimos a sessão.
    const auth = await criarClienteAuth();
    const { data: sessao, error } = await auth.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error || !sessao.session) throw new Error(generico);

    return {
      access_token: sessao.session.access_token,
      refresh_token: sessao.session.refresh_token,
    };
  });
