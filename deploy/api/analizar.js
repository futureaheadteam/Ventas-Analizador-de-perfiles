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
  if (req.method !== 'POST') return res.status(405).send('Método no permitido');

  const pass = req.headers['x-team-password'] || '';
  if (!process.env.TEAM_PASSWORD || pass !== process.env.TEAM_PASSWORD) {
    return res.status(401).send('No autorizado');
  }

  const { system, messages } = req.body || {};
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
      return res.status(r.status).json({ type: 'error', error: { message: data.error?.message || 'Error de Gemini' } });
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
