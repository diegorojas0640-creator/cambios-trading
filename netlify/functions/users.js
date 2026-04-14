const SUPABASE_URL     = 'https://dyarkwuzcamyeuakkoyg.supabase.co';
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_KEY;

const adminHeaders = {
  'apikey':        SERVICE_KEY,
  'Authorization': 'Bearer ' + SERVICE_KEY,
  'Content-Type':  'application/json',
};

// ── Validar que el JWT pertenece a un admin ──────────────────────────────────
async function validateAdmin(authHeader) {
  if (!authHeader) return null;
  const jwt = authHeader.replace('Bearer ', '');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + jwt }
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.user_metadata?.role === 'admin' ? user : null;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  if (!SERVICE_KEY) return {
    statusCode: 500, headers,
    body: JSON.stringify({ error: 'SUPABASE_SERVICE_KEY no configurada en Netlify' })
  };

  const admin = await validateAdmin(event.headers.authorization);
  if (!admin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'No autorizado' }) };

  const method = event.httpMethod;

  // ── GET: listar usuarios ────────────────────────────────────────────────────
  if (method === 'GET') {
    const res  = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, { headers: adminHeaders });
    const data = await res.json();
    const users = (data.users || []).map(u => ({
      id:      u.id,
      email:   u.email,
      role:    u.user_metadata?.role    || 'worker',
      persona: u.user_metadata?.persona || null,
      pct:     u.user_metadata?.pct     ?? null,
      created: u.created_at,
    }));
    return { statusCode: 200, headers, body: JSON.stringify(users) };
  }

  // ── POST: crear usuario ─────────────────────────────────────────────────────
  if (method === 'POST') {
    const { email, password, role, persona, pct } = JSON.parse(event.body || '{}');
    if (!email || !password || !role) return {
      statusCode: 400, headers, body: JSON.stringify({ error: 'email, password y role son requeridos' })
    };
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST', headers: adminHeaders,
      body: JSON.stringify({
        email, password,
        user_metadata: { role, ...(persona ? { persona } : {}), ...(pct != null ? { pct } : {}) },
        email_confirm: true,
      })
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: 400, headers, body: JSON.stringify({ error: data.message || data.msg || JSON.stringify(data) }) };
    return { statusCode: 200, headers, body: JSON.stringify({ id: data.id, email: data.email }) };
  }

  // ── PATCH: editar metadata de usuario ──────────────────────────────────────
  if (method === 'PATCH') {
    const { userId, role, persona, pct, password } = JSON.parse(event.body || '{}');
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId requerido' }) };
    const payload = { user_metadata: { role, ...(persona ? { persona } : {}), ...(pct != null ? { pct } : {}) } };
    if (password) payload.password = password;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT', headers: adminHeaders,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: 400, headers, body: JSON.stringify({ error: data.message || JSON.stringify(data) }) };
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  // ── DELETE: eliminar usuario ────────────────────────────────────────────────
  if (method === 'DELETE') {
    const { userId } = JSON.parse(event.body || '{}');
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId requerido' }) };
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE', headers: adminHeaders
    });
    if (!res.ok) {
      const data = await res.json().catch(()=>({}));
      return { statusCode: 400, headers, body: JSON.stringify({ error: data.message || 'Error al eliminar' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
};
