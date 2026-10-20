/* CommonJS is required to compile and load the TypeScript modules without extra test dependencies. */
/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
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
  instance.require = (id) => id.startsWith('@/')
    ? load(`${id.slice(2)}.ts`)
    : originalRequire(id);
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
