// Cloudflare Worker - ES Module Syntax

// Helper: Hash Password using Web Crypto API
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    // 1. Define CORS headers upfront
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Allow any origin
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };

    // 2. Handle OPTIONS (Preflight) immediately
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // 3. Check for Database Binding
      if (!env.DB) {
        throw new Error('Database binding (DB) is missing in worker environment. Check wrangler.toml.');
      }

      const url = new URL(request.url);
      
      // Robust Path Normalization
      // Remove '/api' prefix if present to handle routing differences
      let path = url.pathname;
      if (path.startsWith('/api')) {
          path = path.slice(4); // Remove first 4 chars '/api'
      }
      // Remove trailing slash if present
      if (path.endsWith('/') && path.length > 1) {
          path = path.slice(0, -1);
      }

      const method = request.method;

      // --- Public Auth Routes ---

      // LOGIN
      if (path === '/auth/login' && method === 'POST') {
          const body = await request.json().catch(() => ({})); // Safe JSON parse
          const { username, password } = body;
          
          if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 400, headers: corsHeaders });
          }

          // Fetch user
          const user = await env.DB.prepare(`
             SELECT * FROM users WHERE username = ? OR email = ?
          `).bind(username, username).first();

          if (!user) {
             return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });
          }

          // Verify Password
          const hashed = await hashPassword(password);
          if (user.password !== hashed) {
             return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });
          }

          // Generate Simple Token
          const sessionData = JSON.stringify({
             id: user.id,
             username: user.username,
             exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
          });
          const token = btoa(sessionData);

          const { password: _, ...userWithoutPass } = user;
          return new Response(JSON.stringify({ user: userWithoutPass, token }), { headers: corsHeaders });
      }

      // REGISTER
      if (path === '/auth/register' && method === 'POST') {
          const user = await request.json().catch(() => ({}));
          
          if (!user.username || !user.email || !user.password) {
              return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
          }

          const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ? OR email = ?').bind(user.username, user.email).first();
          if (existing) {
              return new Response(JSON.stringify({ error: 'Username or Email already exists' }), { status: 409, headers: corsHeaders });
          }

          const hashedPassword = await hashPassword(user.password);
          const userId = crypto.randomUUID();
          
          await env.DB.prepare(`
              INSERT INTO users (id, username, email, password, secretKeyAnswer, securityQuestion, theme, points, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
              userId, user.username, user.email, hashedPassword, 
              user.secretKeyAnswer || '', user.securityQuestion || '', 'dark', 0, Date.now()
          ).run();

          const sessionData = JSON.stringify({
              id: userId,
              username: user.username,
              exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
           });
           const token = btoa(sessionData);

           const newUser = { ...user, id: userId, password: undefined, points: 0, theme: 'dark' };
           return new Response(JSON.stringify({ user: newUser, token }), { headers: corsHeaders });
      }

      // --- Middleware: Verify Token ---
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      
      let userId;
      try {
          const token = authHeader.split(' ')[1];
          const payload = JSON.parse(atob(token));
          if (payload.exp < Date.now()) {
              return new Response(JSON.stringify({ error: 'Token expired' }), { status: 401, headers: corsHeaders });
          }
          userId = payload.id;
      } catch (e) {
          return new Response(JSON.stringify({ error: 'Invalid Token' }), { status: 401, headers: corsHeaders });
      }

      // --- Authenticated Routes ---

      if (path === '/user/me') {
          if (method === 'GET') {
              const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
              if (user) {
                  const { password: _, ...safeUser } = user;
                  return new Response(JSON.stringify(safeUser), { headers: corsHeaders });
              }
              return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
          }
          if (method === 'PUT') {
              const updates = await request.json();
              await env.DB.prepare(`
                UPDATE users SET name=?, bio=?, avatar=?, dob=?, gender=?, email=?, points=? WHERE id=?
              `).bind(updates.name, updates.bio, updates.avatar, updates.dob, updates.gender, updates.email, updates.points, userId).run();
              
              const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
              const { password: _, ...safeUser } = user;
              return new Response(JSON.stringify(safeUser), { headers: corsHeaders });
          }
      }

      if (path === '/reset-data' && method === 'POST') {
          const { secretKeyAnswer } = await request.json();
          const user = await env.DB.prepare('SELECT secretKeyAnswer FROM users WHERE id = ?').bind(userId).first();
          
          if (!user || user.secretKeyAnswer !== secretKeyAnswer) {
              return new Response(JSON.stringify({ error: 'Invalid Secret' }), { status: 403, headers: corsHeaders });
          }
          
          await env.DB.batch([
              env.DB.prepare('DELETE FROM tasks WHERE user_id = ?').bind(userId),
              env.DB.prepare('DELETE FROM logs WHERE user_id = ?').bind(userId),
              env.DB.prepare('DELETE FROM todos WHERE user_id = ?').bind(userId),
              env.DB.prepare('DELETE FROM expenses WHERE user_id = ?').bind(userId),
              env.DB.prepare('DELETE FROM journal WHERE user_id = ?').bind(userId),
              env.DB.prepare('UPDATE users SET points = 0 WHERE id = ?').bind(userId)
          ]);
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      if (path === '/data' && method === 'GET') {
          const [tasks, logs, todos, expenses, journal] = await Promise.all([
              env.DB.prepare('SELECT * FROM tasks WHERE user_id = ?').bind(userId).all(),
              env.DB.prepare('SELECT * FROM logs WHERE user_id = ?').bind(userId).all(),
              env.DB.prepare('SELECT * FROM todos WHERE user_id = ?').bind(userId).all(),
              env.DB.prepare('SELECT * FROM expenses WHERE user_id = ?').bind(userId).all(),
              env.DB.prepare('SELECT * FROM journal WHERE user_id = ?').bind(userId).all(),
          ]);

          const safeLogs = logs.results.map(l => ({...l, images: l.images ? JSON.parse(l.images) : [], completed: l.completed === 1}));
          const safeJournal = journal.results.map(j => ({...j, images: j.images ? JSON.parse(j.images) : []}));
          const safeTodos = todos.results.map(t => ({...t, completed: t.completed === 1}));
          
          const mapKeys = (obj) => {
             const newObj = {};
             for(let key in obj) {
                 const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                 newObj[newKey] = obj[key];
             }
             return newObj;
          };

          return new Response(JSON.stringify({
              tasks: tasks.results.map(mapKeys),
              logs: safeLogs.map(mapKeys),
              todos: safeTodos.map(mapKeys),
              expenses: expenses.results.map(mapKeys),
              journal: safeJournal.map(mapKeys)
          }), { headers: corsHeaders });
      }

      // Generic CRUD
      const parts = path.split('/');
      // Handle potential empty first part if path starts with /
      const collection = parts[0] === '' ? parts[1] : parts[0];
      const itemId = parts[0] === '' ? parts[2] : parts[1];

      if (['tasks', 'logs', 'todos', 'expenses', 'journal'].includes(collection)) {
          if (method === 'POST') {
              const item = await request.json();
              const { userId: _, ...itemData } = item;
              
              const keys = Object.keys(itemData);
              const vals = Object.values(itemData);
              
              const finalVals = vals.map(v => Array.isArray(v) ? JSON.stringify(v) : (v === true ? 1 : v === false ? 0 : v));
              const cols = keys.map(k => k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)).join(', ');
              const placeholders = keys.map(() => '?').join(', ');
              
              await env.DB.prepare(`INSERT INTO ${collection} (user_id, ${cols}) VALUES (?, ${placeholders})`)
                  .bind(userId, ...finalVals).run();
                  
              return new Response(JSON.stringify(item), { headers: corsHeaders });
          }

          if (method === 'PUT' && itemId) {
              const item = await request.json();
              const keys = Object.keys(item).filter(k => k !== 'id' && k !== 'userId');
              const sets = keys.map(k => `${k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`).join(', ');
              const vals = keys.map(k => {
                  const v = item[k];
                  return Array.isArray(v) ? JSON.stringify(v) : (v === true ? 1 : v === false ? 0 : v);
              });
              
              await env.DB.prepare(`UPDATE ${collection} SET ${sets} WHERE id = ? AND user_id = ?`)
                  .bind(...vals, itemId, userId).run();
                  
              return new Response(JSON.stringify(item), { headers: corsHeaders });
          }

          if (method === 'DELETE' && itemId) {
              await env.DB.prepare(`DELETE FROM ${collection} WHERE id = ? AND user_id = ?`)
                  .bind(itemId, userId).run();
              return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
          }
      }

      return new Response(JSON.stringify({ error: 'Route Not Found', path }), { status: 404, headers: corsHeaders });

    } catch (err) {
      // CRITICAL: Return the actual error message in JSON format with CORS headers
      // This allows the frontend to see WHY it failed instead of just a generic CORS error
      return new Response(JSON.stringify({ 
          error: 'Internal Server Error', 
          details: err.message,
          stack: err.stack 
      }), { 
          status: 500, 
          headers: corsHeaders 
      });
    }
  },
};
