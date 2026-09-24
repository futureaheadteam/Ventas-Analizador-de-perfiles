# Analizador de Perfiles — Future Ahead

Carpeta lista para subir a Vercel. El equipo entra al link, pone la contraseña una sola vez y usa.

## Publicarlo (una sola vez, ~10 min)

1. Creá una cuenta gratis en https://vercel.com (con GitHub o email).
2. Subí esta carpeta `deploy` a un repositorio de GitHub (privado).
   - Alternativa sin GitHub: instalá Node y en esta carpeta corré `npx vercel`, seguí las preguntas.
3. En Vercel: **Add New → Project → Import** el repo. Dejá todo por defecto → **Deploy**.
4. En el proyecto: **Settings → Environment Variables**, agregá:
   - `ANTHROPIC_API_KEY` = tu key de https://console.anthropic.com
   - `TEAM_PASSWORD` = la contraseña que le vas a pasar al equipo
5. **Deployments → ⋯ → Redeploy** para que tome las variables.

Listo: te queda un link tipo `analizador-future.vercel.app`.

## Dominio propio (opcional)
Settings → Domains → agregá `analizador.futureahead.com` y copiá el registro DNS que te indica en tu proveedor de dominio.

## Mantenimiento
- **Cambiar la contraseña** (ej. se va alguien): editá `TEAM_PASSWORD` y hacé Redeploy. Todos la vuelven a ingresar.
- **Controlar el gasto**: en console.anthropic.com → Limits, poné un tope mensual a la key.
- **Actualizar la web**: reemplazá `index.html` por la versión nueva y volvé a subir.
