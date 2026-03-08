const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET profile
app.get('/api/profile', async (req, res) => {
  const { data, error } = await supabase.from('profile').select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET projects
app.get('/api/projects', async (req, res) => {
  const { data, error } = await supabase.from('projects').select('*').eq('featured', true).order('display_order', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET single project
app.get('/api/projects/:id', async (req, res) => {
  const { data, error } = await supabase.from('projects').select('*').eq('id', req.params.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST project view
app.post('/api/projects/:id/view', async (req, res) => {
  const { data: project } = await supabase.from('projects').select('views').eq('id', req.params.id).single();
  await supabase.from('projects').update({ views: (project?.views || 0) + 1 }).eq('id', req.params.id);
  await supabase.from('analytics').insert({ type: 'project_view', project_id: req.params.id, user_agent: req.headers['user-agent'] });
  res.json({ success: true });
});

// POST contact
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) return res.status(400).json({ error: 'All fields required' });
  const { error } = await supabase.from('messages').insert({ name, email, subject, message });
  if (error) return res.status(500).json({ error: error.message });
  await supabase.from('analytics').insert({ type: 'contact_submit', user_agent: req.headers['user-agent'] });
  res.json({ success: true, message: 'Message sent!' });
});

// POST page view
app.post('/api/analytics/pageview', async (req, res) => {
  await supabase.from('analytics').insert({ type: 'page_view', page: req.body.page || '/', user_agent: req.headers['user-agent'] });
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});