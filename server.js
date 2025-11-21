const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Admin credentials – only Eng. Alaa knows these.
// Default values can be changed via environment variables if needed.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'alaa';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0000';

const ADMIN_COOKIE_NAME = 'admin_token';
const activeAdminTokens = new Set();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data directory', e);
  }
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

async function writeJson(file, value) {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

async function getProducts() {
  return readJson(PRODUCTS_FILE, [
    {
      id: 'p1',
      name: 'Smart Desk Lamp',
      price: 39,
      category: 'Office',
      description: 'Adjustable LED desk lamp with warm & cool light modes and USB charging.',
      image:
        'https://images.pexels.com/photos/667838/pexels-photo-667838.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      id: 'p2',
      name: 'Wireless Keyboard & Mouse',
      price: 59,
      category: 'Accessories',
      description: 'Slim wireless combo with silent keys and long‑life battery – perfect for any desk.',
      image:
        'https://images.pexels.com/photos/461064/pexels-photo-461064.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      id: 'p3',
      name: 'USB‑C Multiport Hub',
      price: 29,
      category: 'Electronics',
      description: 'Expand your laptop ports with HDMI, USB‑A, card reader and fast charging support.',
      image:
        'https://images.pexels.com/photos/1054397/pexels-photo-1054397.jpeg?auto=compress&cs=tinysrgb&w=800'
    }
  ]);
}

async function saveProducts(products) {
  await writeJson(PRODUCTS_FILE, products);
}

async function getUsers() {
  return readJson(USERS_FILE, []);
}

async function saveUsers(users) {
  await writeJson(USERS_FILE, users);
}

function createToken() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2) +
    '-' +
    Math.random().toString(36).slice(2)
  );
}

function requireAdmin(req, res, next) {
  const token = req.cookies[ADMIN_COOKIE_NAME];
  if (!token || !activeAdminTokens.has(token)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = createToken();
  activeAdminTokens.add(token);

  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  });

  res.json({ ok: true, role: 'admin' });
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies[ADMIN_COOKIE_NAME];
  if (token) {
    activeAdminTokens.delete(token);
  }
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const token = req.cookies[ADMIN_COOKIE_NAME];
  if (token && activeAdminTokens.has(token)) {
    return res.json({ authenticated: true, role: 'admin', username: ADMIN_USERNAME });
  }
  res.json({ authenticated: false });
});

// Public products API (read‑only for visitors)
app.get('/api/products', async (req, res) => {
  const products = await getProducts();
  res.json(products);
});

// User registration (regular visitors, not admins)
app.post('/api/users/register', async (req, res) => {
  const { username, password, fullName } = req.body || {};

  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    return res.status(400).json({ error: 'Username cannot be empty' });
  }

  if (trimmedUsername.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
    return res.status(400).json({ error: 'This username is reserved for the admin' });
  }

  const users = await getUsers();
  if (users.some((u) => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
    return res.status(409).json({ error: 'This username is already taken' });
  }

  const user = {
    id: 'u-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 100000).toString(36),
    username: trimmedUsername,
    password: password, // For a real production system you would hash this.
    fullName: typeof fullName === 'string' ? fullName.trim() : '',
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await saveUsers(users);

  res.status(201).json({ ok: true, username: user.username });
});

// User login (regular visitors). Admin should use the /admin dashboard.
app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Prevent logging in here as admin – admin uses dedicated /admin login.
  if (username === ADMIN_USERNAME) {
    return res.status(403).json({ error: 'Use the admin dashboard to sign in as admin' });
  }

  const users = await getUsers();
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  res.json({ ok: true, role: 'user', username: user.username, fullName: user.fullName });
});

// Admin‑only product management
app.post('/api/products', requireAdmin, async (req, res) => {
  const { name, price, category, description, image } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const numericPrice = Number(price || 0);

  const products = await getProducts();
  const id = 'p-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 100000).toString(36);

  const product = {
    id,
    name: name.trim(),
    price: Number.isFinite(numericPrice) ? numericPrice : 0,
    category: (category || '').trim(),
    description: (description || '').trim(),
    image: (image || '').trim()
  };

  products.unshift(product);
  await saveProducts(products);

  res.status(201).json(product);
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, price, category, description, image } = req.body || {};

  const products = await getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const numericPrice = Number(price ?? products[index].price ?? 0);

  products[index] = {
    ...products[index],
    name: typeof name === 'string' && name.trim() ? name.trim() : products[index].name,
    price: Number.isFinite(numericPrice) ? numericPrice : products[index].price,
    category:
      typeof category === 'string' && category.trim() ? category.trim() : products[index].category,
    description:
      typeof description === 'string' && description.trim()
        ? description.trim()
        : products[index].description,
    image: typeof image === 'string' && image.trim() ? image.trim() : products[index].image
  };

  await saveProducts(products);
  res.json(products[index]);
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const products = await getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const [removed] = products.splice(index, 1);
  await saveProducts(products);
  res.json({ ok: true, removed });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Product website server for Eng. Alaa Kamel running on http://localhost:${PORT}`);
});
