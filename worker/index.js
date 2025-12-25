// Cloudflare Worker - ES Module Syntax

export default {
  async fetch(request, env) {
    // 1. Universal CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Firebase-UID',
      'Access-Control-Max-Age': '86400',
    };

    // 2. Handle Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      if (!env.DB) throw new Error('Database binding (DB) is missing.');

      const url = new URL(request.url);
      let path = url.pathname;
      if (path.startsWith('/api')) path = path.slice(4);
      if (path.endsWith('/') && path.length > 1) path = path.slice(0, -1);

      const method = request.method;

      // --- PUBLIC ROUTES ---

      // Health Check
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders });
      }

      // --- AUTH MIDDLEWARE ---
      // We now expect the Frontend to handle Auth (e.g. Firebase) and send the User ID.
      // Format: Authorization: Bearer <USER_ID>
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return new Response(JSON.stringify({ error: 'Unauthorized: Missing ID' }), { status: 401, headers: corsHeaders });
      }

      const userId = authHeader.split(' ')[1]; // Trusting the client-side ID for this architecture
      
      // --- USER SYNC (Idempotent) ---
      // Called after Firebase Login/Register to ensure DB row exists
      if (path === '/user/sync' && method === 'POST') {
          const userData = await request.json();
          // Upsert User
          const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
          
          if (!existing) {
             await env.DB.prepare(`
                INSERT INTO users (id, username, email, points, theme, created_at, secretKeyAnswer)
                VALUES (?, ?, ?, ?, ?, ?, ?)
             `).bind(
                userId, 
                userData.username || 'User', 
                userData.email || '', 
                0, 
                'dark', 
                Date.now(),
                'firebase' // Placeholder
             ).run();
          }
          
          const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
          return new Response(JSON.stringify(user), { headers: corsHeaders });
      }

      // --- PROTECTED DATA ROUTES ---

      if (path === '/user/me') {
        if (method === 'GET') {
           const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
           return new Response(JSON.stringify(user || {}), { headers: corsHeaders });
        }
        if (method === 'PUT') {
           const updates = await request.json();
           await env.DB.prepare(`
             UPDATE users SET name=?, bio=?, avatar=?, dob=?, gender=?, email=?, points=? WHERE id=?
           `).bind(updates.name, updates.bio, updates.avatar, updates.dob, updates.gender, updates.email, updates.points, userId).run();
           const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
           return new Response(JSON.stringify(user), { headers: corsHeaders });
        }
      }

      // GET ALL DATA
      if (path === '/data' && method === 'GET') {
        const [tasks, logs, todos, expenses, journal] = await Promise.all([
            env.DB.prepare('SELECT * FROM tasks WHERE user_id = ?').bind(userId).all(),
            env.DB.prepare('SELECT * FROM logs WHERE user_id = ?').bind(userId).all(),
            env.DB.prepare('SELECT * FROM todos WHERE user_id = ?').bind(userId).all(),
            env.DB.prepare('SELECT * FROM expenses WHERE user_id = ?').bind(userId).all(),
            env.DB.prepare('SELECT * FROM journal WHERE user_id = ?').bind(userId).all(),
        ]);

        const safeLogs = (logs.results || []).map(l => ({...l, images: l.images ? JSON.parse(l.images) : [], completed: l.completed === 1}));
        const safeJournal = (journal.results || []).map(j => ({...j, images: j.images ? JSON.parse(j.images) : []}));
        const safeTodos = (todos.results || []).map(t => ({...t, completed: t.completed === 1}));
        
        const mapKeys = (obj) => {
            const newObj = {};
            for(let key in obj) {
                const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                newObj[newKey] = obj[key];
            }
            return newObj;
        };

        return new Response(JSON.stringify({
            tasks: (tasks.results || []).map(mapKeys),
            logs: safeLogs.map(mapKeys),
            todos: safeTodos.map(mapKeys),
            expenses: (expenses.results || []).map(mapKeys),
            journal: safeJournal.map(mapKeys)
        }), { headers: corsHeaders });
      }

      // GENERIC CRUD
      const parts = path.split('/');
      const cleanParts = path.startsWith('/') ? path.slice(1).split('/') : path.split('/');
      const collection = cleanParts[0];
      const itemId = cleanParts[1];

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

      return new Response(JSON.stringify({ error: 'Route Not Found' }), { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500, headers: corsHeaders });
    }
  },
};