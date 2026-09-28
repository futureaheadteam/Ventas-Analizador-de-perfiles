// Intermediario seguro: la API key vive en Vercel, nunca llega al navegador.
// Usa Google Gemini (plan gratuito) pero responde con el mismo formato que Claude,
// así la web (index.html) funciona sin cambios.
export const config = { maxDuration: 60 };

// Convierte un mensaje con formato Claude a formato Gemini.
function aGemini(m) {
  const bloques = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : (m.content || []);
  const parts = [];
  for (const b of bloques) {
    if (b.type === 'text' && b.text) parts.push({ text: b.text });
    else if ((b.type === 'image' || b.type === 'document') && b.source?.type === 'base64') {
      parts.push({ inlineData: { mimeType: b.source.media_type, data: b.source.data } });
    }
  }
  return { role: m.role === 'assistant' ? 'model' : 'user', parts: parts.length ? parts : [{ text: ' ' }] };
}

export default async function handler(req, res) {
  // Cualquier error inesperado se muestra en la web en vez de romper la función.
  try {
    await atender(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).send('Error interno: ' + (e && e.message));
  }
}

async function atender(req, res) {
  const esperada = (process.env.TEAM_PASSWORD || '').trim();

  // Diagnóstico: abrir /api/analizar en el navegador muestra si las variables están cargadas
  // (nunca muestra sus valores).
  if (req.method === 'GET') {
    return res.status(200).json({
      TEAM_PASSWORD_cargada: !!esperada,
      TEAM_PASSWORD_tenia_espacios: esperada !== (process.env.TEAM_PASSWORD || ''),
      GEMINI_API_KEY_cargada: !!process.env.GEMINI_API_KEY,
      entorno: process.env.VERCEL_ENV || 'desconocido'
    });
  }
  if (req.method !== 'POST') return res.status(405).send('Método no permitido');

  if (!esperada) {
    return res.status(500).send('Falta la variable TEAM_PASSWORD en Vercel (entorno Production). Agregala y hacé Redeploy.');
  }
  const pass = String(req.headers['x-team-password'] || '').trim();
  if (pass !== esperada) {
    return res.status(401).send('No autorizado');
  }

  let body = req.body;
  if (typeof body === 'string') body = JSON.parse(body);
  const { system, messages } = body || {};
  if (!Array.isArray(messages)) return res.status(400).send('Pedido inválido');

  // Modelo fijado acá para que nadie lo cambie desde el navegador.
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: typeof system === 'string' ? { parts: [{ text: system.slice(0, 20000) }] } : undefined,
        contents: messages.slice(-4).map(aGemini),
        generationConfig: { maxOutputTokens: 3000 }
      })
    });
    const data = await r.json();
    if (!r.ok) {
      // 429 = límite gratis de Gemini (la web lo muestra como "límite de análisis").
      // Cualquier otro error se devuelve como 502 para que la web no lo confunda
      // con "contraseña incorrecta" (401) y muestre el motivo real.
      const status = r.status === 429 ? 429 : 502;
      return res.status(status).send(`Gemini respondió ${r.status}: ${data.error?.message || 'error desconocido'}`);
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    // Mismo formato que devuelve la API de Claude.
    res.status(200).json({
      type: 'message',
      role: 'assistant',
      model,
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn'
    });
  } catch (e) {
    res.status(502).send('Error llamando a Gemini: ' + e.message);
  }
}
