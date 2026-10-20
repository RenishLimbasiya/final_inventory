/* CommonJS is required to compile and load the TypeScript modules without extra test dependencies. */
/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const loaded = new Map();

function load(relativePath) {
  const filename = require('node:path').resolve(relativePath);
  if (loaded.has(filename)) return loaded.get(filename);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = module.paths;
  const originalRequire = instance.require.bind(instance);
  instance.require = (id) => {
    if (id.startsWith('@/')) return load(`${id.slice(2)}.ts`);
    if (id.startsWith('.')) {
      const candidate = path.resolve(path.dirname(filename), `${id}.ts`);
      if (fs.existsSync(candidate)) return load(candidate);
    }
    return originalRequire(id);
  };
  instance._compile(compiled.outputText, filename);
  loaded.set(filename, instance.exports);
  return instance.exports;
}

const { validateProductInput } = load('lib/validation.ts');
test('rejects invalid update values and protected fields', () => {
  for (const value of [null, [], { quantity: '5' }, { quantity: 0.5 },
    { price: Infinity }, { quantity: Number.MAX_SAFE_INTEGER + 1 },
    { id: 'changed' }, { name: '  ' }, { category: 'invalid' }, { isActive: 'false' }]) {
    assert.equal(typeof validateProductInput(value, true), 'string');
  }
  assert.equal(validateProductInput({ quantity: 0, maxStockLevel: 0 }, true), null);
});

test('creation requires core fields', () => {
  assert.ok(validateProductInput({}));
  assert.equal(validateProductInput({ sku: 'SKU', name: 'Item', price: 100,
    costPrice: 50, quantity: 0, minStockLevel: 0 }), null);
});

test('empty inventory stays empty and rejected movements preserve stock', () => {
  process.env.INVENTORY_PERSISTENCE_MODE = 'memory';
  const db = load('lib/db.ts');
  db.initializeDatabase();
  const product = db.getProducts()[0];
  for (const quantity of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.equal(db.createMovement({ productId: product.id, type: 'restock', quantity }), null);
    assert.equal(db.getProductById(product.id).quantity, product.quantity);
  }
  assert.equal(db.createMovement({ productId: product.id, type: 'sale', quantity: product.quantity + 1 }), null);
  for (const item of db.getProducts()) db.deleteProduct(item.id);
  db.initializeDatabase();
  assert.deepEqual(db.getProducts(), []);
});

test('product and movement APIs reject invalid bodies without changing inventory', async () => {
  const { NextRequest } = require('next/server');
  const products = load('app/api/products/route.ts');
  const product = load('app/api/products/[id]/route.ts');
  const movements = load('app/api/movements/route.ts');
  const request = (path, method, body) => new NextRequest(`http://localhost${path}`, {
    method, headers: { 'Content-Type': 'application/json' }, body,
  });
  for (const body of ['{', 'null', '[]', '{"quantity":"5"}']) {
    assert.equal((await products.POST(request('/api/products', 'POST', body))).status, 400);
    assert.equal((await movements.POST(request('/api/movements', 'POST', body))).status, 400);
  }
  const response = await products.POST(request('/api/products', 'POST', JSON.stringify({
    sku: 'API-001', name: 'API test product', price: 100, costPrice: 50,
    quantity: 2, minStockLevel: 1, maxStockLevel: 0,
  })));
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.equal(data.maxStockLevel, 0);
  const context = { params: Promise.resolve({ id: data.id }) };
  for (const body of ['{', 'null', '{"quantity":"5"}', '{"id":"changed"}']) {
    assert.equal((await product.PUT(request(`/api/products/${data.id}`, 'PUT', body), context)).status, 400);
  }
  assert.equal((await movements.POST(request('/api/movements', 'POST', JSON.stringify({
    productId: data.id, type: 'sale', quantity: 3,
  })))).status, 400);
  assert.equal(load('lib/db.ts').getProductById(data.id).quantity, 2);
  const moved = await movements.POST(request('/api/movements', 'POST', JSON.stringify({
    productId: data.id, type: 'sale', quantity: 1,
  })));
  assert.equal(moved.status, 201);
  assert.equal(load('lib/db.ts').getProductById(data.id).quantity, 1);
});

test('login redirects stay on the application origin', () => {
  const { getSafeRedirect } = load('lib/navigation.ts');
  const origin = 'https://inventory.example';
  for (const value of [null, '//evil.example', '/\\evil.example', 'javascript:alert(1)',
    '/\t/evil.example', 'https://evil.example/products', 'http://[']) {
    assert.equal(getSafeRedirect(value, origin), '/');
  }
  assert.equal(getSafeRedirect('/products?search=chair#list', origin), '/products?search=chair#list');
});

test('protected pages redirect to login and APIs return JSON 401', () => {
  const { NextRequest } = require('next/server');
  const { proxy } = load('proxy.ts');
  for (const pathname of ['/', '/dashboard', '/products/123', '/alerts', '/movements/add']) {
    const response = proxy(new NextRequest(`http://localhost${pathname}?test=1`));
    assert.equal(response.status, 307);
    const target = new URL(response.headers.get('location'));
    assert.equal(target.pathname, '/login');
    assert.equal(target.searchParams.get('redirect'), pathname + '?test=1');
  }
  for (const pathname of ['/api/products', '/api/products/123', '/api/movements', '/api/admin/logs']) {
    assert.equal(proxy(new NextRequest(`http://localhost${pathname}`)).status, 401);
  }
  for (const pathname of ['/login', '/api/auth/login', '/products-other']) {
    assert.equal(proxy(new NextRequest(`http://localhost${pathname}`)).status, 200);
  }
  const authorized = proxy(new NextRequest('http://localhost/', {
    headers: { Cookie: 'inventory_token=demo-session' },
  }));
  assert.equal(authorized.status, 200);
  assert.equal(authorized.headers.get('Authorization'), null);
});

test('stock statistics separate empty stock and exclude inactive products', () => {
  const { getInventoryStats } = load('lib/inventory-stats.ts');
  const item = { category: 'tools', price: 100, minStockLevel: 3, isActive: true };
  const products = [
    { ...item, id: 'empty', quantity: 0 }, { ...item, id: 'low', quantity: 2 },
    { ...item, id: 'normal', quantity: 8 },
    { ...item, id: 'inactive', quantity: 1, isActive: false },
  ];
  const stats = getInventoryStats(products);
  assert.equal(stats.totalProducts, 3);
  assert.equal(stats.lowStockCount, 1);
  assert.equal(stats.outOfStockCount, 1);
  assert.equal(stats.totalValue, 1000);
  assert.equal(stats.byCategory.tools, 3);
  assert.equal(getInventoryStats(products, 1).lowStockCount, 0);
  assert.equal(products[0].id, 'empty');
});

test('login rejects invalid warehouse names and trims valid names', async () => {
  const { NextRequest } = require('next/server');
  const { POST } = load('app/api/auth/login/route.ts');
  const request = (body) => new NextRequest('http://localhost/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  });
  for (const body of ['null', '[]', '{', '{"warehouseName":42}', JSON.stringify({ warehouseName: 'x'.repeat(101) })]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  const response = await POST(request('{"warehouseName":"  Test warehouse  "}'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).warehouseName, 'Test warehouse');
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
});

test('a failed product refresh does not reject an already saved movement', async (t) => {
  const { configureStore } = require('@reduxjs/toolkit');
  const productSlice = load('store/productSlice.ts');
  const movementSlice = load('store/movementSlice.ts');
  const store = configureStore({ reducer: { products: productSlice.default, movements: movementSlice.default } });
  store.dispatch(productSlice.setProducts([{ id: 'item', quantity: 3 }]));
  const movement = { id: 'movement', productId: 'item', type: 'sale', quantity: 1,
    previousQuantity: 3, newQuantity: 2, performedAt: new Date().toISOString() };
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    requests.push(url);
    if (url === '/api/movements') return Response.json({ success: true, data: movement });
    throw new Error('Refresh disconnected');
  });
  const result = await store.dispatch(movementSlice.recordMovement({ productId: 'item', type: 'sale', quantity: 1 }));
  assert.equal(movementSlice.recordMovement.fulfilled.match(result), true);
  assert.equal(store.getState().products.products[0].quantity, 2);
  assert.equal(store.getState().movements.movements.length, 1);
  assert.equal(requests.filter((url) => url === '/api/movements').length, 1);
});

test('product form reports a failed save instead of succeeding', async (t) => {
  const React = require('react');
  const { renderToString } = require('react-dom/server');
  const { Provider } = require('react-redux');
  const { configureStore } = require('@reduxjs/toolkit');
  const { useProductForm } = load('hooks/useProductForm.ts');
  const products = load('store/productSlice.ts');
  const store = configureStore({ reducer: { products: products.default } });
  let form;
  function Harness() {
    form = useProductForm({ id: 'item', sku: 'SKU', name: 'Valid item', category: 'tools',
      description: '', price: 100, costPrice: 50, quantity: 3, minStockLevel: 1,
      maxStockLevel: 10, unit: 'piece', isActive: true });
    return null;
  }
  renderToString(React.createElement(Provider, { store }, React.createElement(Harness)));
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Rejected' }, { status: 400 }));
  assert.equal(await form.submitForm(), false);
});

test('separately loaded database modules share saved products and initialization', () => {
  const original = load('lib/db.ts');
  loaded.delete(path.resolve('lib/db.ts'));
  const reloaded = load('lib/db.ts');
  reloaded.initializeDatabase();
  assert.equal(reloaded.db, original.db);
  const product = original.createProduct({ sku: 'SHARED-STATE', name: 'Shared product',
    category: 'tools', description: '', price: 100, costPrice: 50, quantity: 1,
    minStockLevel: 0, unit: 'piece', isActive: true });
  assert.deepEqual(reloaded.getProductById(product.id), product);
  reloaded.deleteProduct(product.id);
  assert.equal(original.getProductById(product.id), undefined);
});
