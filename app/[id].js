// api/track/[id].js - Endpoint para rastreamento usando Supabase
// Para usar na Vercel

import { createClient } from "@supabase/supabase-js";
const geoip = require("geoip-lite");

// Configuração do Supabase (use variáveis de ambiente na Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para criar pixel transparente
function createTransparentPixel() {
  // Base64 de uma imagem GIF 1x1 transparente
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  return pixel;
}

// Handler principal da rota
export default async function handler(req, res) {
  // Obter o ID do documento da URL
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "ID do documento é obrigatório" });
  }

  // Coletar informações do cliente
  const clientIp =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    "0.0.0.0";

  const userAgent = req.headers["user-agent"] || "Unknown";
  const referer = req.headers["referer"] || "Direct";

  // Obter geolocalização baseada no IP
  const geo = geoip.lookup(clientIp.split(",")[0]);

  try {
    // Registrar acesso no Supabase
    const { data, error } = await supabase.from("document_accesses").insert([
      {
        document_id: id,
        ip_address: clientIp,
        user_agent: userAgent,
        referer: referer,
        country: geo?.country,
        region: geo?.region,
        city: geo?.city,
        latitude: geo?.ll ? geo.ll[0] : null,
        longitude: geo?.ll ? geo.ll[1] : null,
      },
    ]);

    if (error) throw error;

    // Atualizar contador de acessos no documento
    await supabase.rpc("increment_document_access_count", { doc_id: id });

    // Determinar resposta ao cliente
    if (req.query.redirect) {
      // Redirecionar para outro site
      return res.redirect(
        302,
        req.query.redirect || "https://seu-site.com/obrigado"
      );
    } else {
      // Retornar um pixel transparente
      const pixel = createTransparentPixel();
      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Content-Length", pixel.length);
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.send(pixel);
    }
  } catch (error) {
    console.error("Erro ao salvar dados de rastreamento:", error);

    // Ainda retornamos o pixel para não mostrar erro ao usuário
    const pixel = createTransparentPixel();
    res.setHeader("Content-Type", "image/gif");
    return res.send(pixel);
  }
}
