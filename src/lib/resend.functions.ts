import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const sendOtpEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email(), otp: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const RESEND_API_KEY = process.env['RESEND_API_KEY'];
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Estudo Rosa <noreply@natymed.com.br>', // Alterado para noreply conforme solicitado
        to: [data.email],
        subject: 'Seu Código de Acesso - Estudo Rosa 🌸',
        html: `
          <div style="font-family: sans-serif; color: #db2777; text-align: center; padding: 40px; background-color: #fdf2f8; border-radius: 20px;">
            <h1 style="font-size: 24px;">Olá, MedGata! ✨</h1>
            <p style="font-size: 16px; color: #be185d;">Aqui está seu código de acesso para a plataforma:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 30px 0; color: #ec4899; background: white; padding: 20px; border-radius: 50px; display: inline-block;">
              ${data.otp}
            </div>
            <p style="font-size: 14px; color: #f472b6;">Use este código para entrar e brilhar nos estudos. 💅🩺</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Resend API Error:", error);
      throw new Error(`Resend Error: ${error.message || JSON.stringify(error)}`);
    }

    return { success: true };
  });
