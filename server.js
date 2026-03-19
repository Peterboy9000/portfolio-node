const path = require('path');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── PUBLIC ROUTES ─────────────────────────────────────

app.get('/api/profile', async (req, res) => {
  const { data, error } = await supabase.from('profile').select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/projects', async (req, res) => {
  const { data, error } = await supabase.from('projects').select('*').eq('featured', true).order('display_order', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/projects/:id', async (req, res) => {
  const { data, error } = await supabase.from('projects').select('*').eq('id', req.params.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/projects/:id/view', async (req, res) => {
  const { data: project } = await supabase.from('projects').select('views').eq('id', req.params.id).single();
  await supabase.from('projects').update({ views: (project?.views || 0) + 1 }).eq('id', req.params.id);
  await supabase.from('analytics').insert({ type: 'project_view', project_id: req.params.id, user_agent: req.headers['user-agent'] });
  res.json({ success: true });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) return res.status(400).json({ error: 'All fields required' });
  const { error } = await supabase.from('messages').insert({ name, email, subject, message });
  if (error) return res.status(500).json({ error: error.message });
  await supabase.from('analytics').insert({ type: 'contact_submit', user_agent: req.headers['user-agent'] });
  res.json({ success: true, message: 'Message sent!' });
});

app.post('/api/analytics/pageview', async (req, res) => {
  await supabase.from('analytics').insert({ type: 'page_view', page: req.body.page || '/', user_agent: req.headers['user-agent'] });
  res.json({ success: true });
});

// ── ADMIN ROUTES ──────────────────────────────────────

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const { data, error } = await supabase.from('admin_users').select('*').eq('username', username).single();
  if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });
  if (data.password_hash !== btoa(password)) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ success: true });
});

app.get('/api/admin/projects', async (req, res) => {
  const { data, error } = await supabase.from('projects').select('*').order('display_order', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/projects', async (req, res) => {
  const { data, error } = await supabase.from('projects').insert(req.body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/admin/projects/:id', async (req, res) => {
  const { data, error } = await supabase.from('projects').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/projects/:id', async (req, res) => {
  const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/api/admin/messages', async (req, res) => {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/admin/messages/:id', async (req, res) => {
  const { data, error } = await supabase.from('messages').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/messages/:id', async (req, res) => {
  const { error } = await supabase.from('messages').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/api/admin/profile', async (req, res) => {
  const { data, error } = await supabase.from('profile').select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/admin/profile', async (req, res) => {
  const { data: existing } = await supabase.from('profile').select('id').single();
  const { data, error } = await supabase.from('profile').update(req.body).eq('id', existing.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/admin/analytics', async (req, res) => {
  const { data, error } = await supabase.from('analytics').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── CATCH ALL ─────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
