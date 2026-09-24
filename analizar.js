// Intermediario seguro: la API key vive en Vercel, nunca llega al navegador.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método no permitido');

  const pass = req.headers['x-team-password'] || '';
  if (!process.env.TEAM_PASSWORD || pass !== process.env.TEAM_PASSWORD) {
    return res.status(401).send('No autorizado');
  }

  const { system, messages } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).send('Pedido inválido');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      // Modelo y tope de tokens fijados acá para que nadie los cambie desde el navegador.
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 3000,
        system: typeof system === 'string' ? system.slice(0, 20000) : undefined,
        messages: messages.slice(-4)
      })
    });
    const text = await r.text();
    res.status(r.status).setHeader('content-type', 'application/json').send(text);
  } catch (e) {
    res.status(502).send('Error llamando a Anthropic: ' + e.message);
  }
}
