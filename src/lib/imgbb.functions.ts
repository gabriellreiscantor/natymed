import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const uploadToImgBB = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ 
    image: z.string() // base64
  }).parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env['IMGBB_API_KEY'];
    if (!apiKey) {
      throw new Error("IMGBB_API_KEY não configurada no backend.");
    }

    const formData = new FormData();
    formData.append("image", data.image);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || "Erro ao fazer upload para o ImgBB.");
    }

    return result.data.url;
  });
