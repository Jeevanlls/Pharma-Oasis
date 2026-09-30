/** Standalone UI rehearsal. Never imports the application server, database or mailer.
 * Build normally, then run this file explicitly. All records below are fictional.
 * This is not a production start command and must never receive credentials.
 */
import express from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function createRehearsal() {
  if (['DATABASE_URL', 'NEON_DATABASE_URL', 'SMTP_PASSWORD', 'SMTP_PASS'].some(key => process.env[key])) {
    throw new Error('The admin rehearsal must run without database or mail credentials.');
  }
  const app = express();
  const createdAt = '2026-09-30T08:30:00.000Z';
  const admin = { id: 9000, email: 'preview@example.invalid', role: 'admin', status: 'active', primaryContactName: 'Jeevan', companyName: 'Pharma Oasis', createdAt };
  const users = [
    { id: 9001, companyName: 'Example North Pharmacy', primaryContactName: 'Alex Example', email: 'north@example.invalid', status: 'active' },
    { id: 9002, companyName: 'Example Wellness Group', primaryContactName: 'Sam Example', email: 'wellness@example.invalid', status: 'pending' },
    { id: 9003, companyName: 'Example Health Partners', primaryContactName: 'Taylor Example', email: 'health@example.invalid', status: 'active' },
  ].map(user => ({ role: 'customer', businessType: 'Pharmacy', billingCountry: 'United Kingdom', billingCity: 'London', notes: 'Fictional application for interface review only.', phoneNumber: 'Not supplied', createdAt, ...user }));
  const suppliers = [{ id: 9010, companyName: 'Example Wellness Supply', contactName: 'Morgan Example', email: 'supply@example.invalid', country: 'United Kingdom', status: 'new', businessType: 'Wholesaler', phoneNumber: 'Not supplied', productCategoriesSupply: 'Vitamins and supplements', brandNamesRepresent: 'Example Wellness', proposalSummary: 'Fictional supplier application for interface review.', createdAt }];
  const brands = [{ id: 1, name: 'Example Wellness', slug: 'example-wellness' }];
  const categories = [{ id: 1, name: 'Vitamins', slug: 'vitamins' }];
  const products = [
    { id: 9020, ean: '0012345678905', productName: 'Example Vitamin C 60 tablets', sku: 'EXAMPLE-001' },
    { id: 9021, ean: '0099999999999', productName: 'Example Vitamin D 30 capsules', sku: 'EXAMPLE-002' },
  ].map(product => ({ ...product, brandId: 1, categoryId: 1, brand: brands[0], category: categories[0], isActive: true, isFeatured: false, moq: 1, imageUrl: null, wholesalePrice: null, rrp: null, createdAt }));
  const quotes = [
    { id: 9101, userId: 9001, status: 'pending', totalEstimate: null, createdAt },
    { id: 9102, userId: 9003, status: 'quoted', totalEstimate: '468.00', createdAt: '2026-09-29T10:00:00.000Z' },
    { id: 9103, userId: 9002, status: 'pending', totalEstimate: null, createdAt: '2026-09-28T11:30:00.000Z' },
  ];
  const orders = [
    { id: 9201, userId: 9001, status: 'submitted', totalAmount: '840.00', archivedAt: null, createdAt: '2026-09-30T07:30:00.000Z' },
    { id: 9202, userId: 9003, status: 'confirmed', totalAmount: '468.00', archivedAt: null, createdAt: '2026-09-29T12:30:00.000Z' },
  ].map(order => ({ ...order, companyName: users.find(user => user.id === order.userId).companyName }));
  const itemsFor = (deal, kind) => [{ id: 9301, productId: products[0].id, priceListItemId: null, product: products[0], productName: products[0].productName, description: products[0].productName, ean: products[0].ean, quantity: 120, unitCost: null, unitPrice: kind === 'quote' && deal.status === 'pending' ? null : Number(deal.totalAmount || deal.totalEstimate) / 120, lineTotal: deal.totalAmount || deal.totalEstimate }];
  const matches = (values, term) => values.some(value => String(value ?? '').toLowerCase().includes(term));
  const matchingDeals = (deals, kind, term) => deals.filter(deal => matches([`${kind === 'quote' ? 'Q' : 'O'}-${deal.id}`, users.find(user => user.id === deal.userId)?.companyName, ...itemsFor(deal, kind).flatMap(item => [item.ean, item.description])], term));
  app.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'same-origin');
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(403).json({ message: 'Rehearsal only: saves, account changes and emails are disabled.' });
    next();
  });
  app.get('/health', (_req, res) => res.json({ ok: true, mode: 'fictional-admin-rehearsal' }));
  app.get('/api/auth/me', (_req, res) => res.json({ user: admin }));
  app.get('/api/admin/users', (_req, res) => res.json(users));
  app.get('/api/admin/supplier-leads', (_req, res) => res.json(suppliers));
  app.get('/api/admin/quotes', (_req, res) => res.json(quotes));
  app.get('/api/admin/orders', (req, res) => res.json(req.query.archived === 'true' ? [] : orders));
  app.get('/api/admin/orders/stats', (_req, res) => res.json({ newCount: 1, toFulfil: 1, doneThisWeek: 0, activeTotal: 2 }));
  app.get('/api/admin/stats', (_req, res) => res.json({ totalProducts: products.length, pendingQuotes: 2, activeCustomers: 2 }));
  app.get('/api/admin/quotes/:id/intelligence', (req, res) => {
    const ean = String(req.query.ean || '');
    const product = products.find(p => p.ean === ean);
    if (!product) return res.status(404).json({ message: 'No fictional product matches this EAN.' });
    const fetchedAt = new Date().toISOString();
    res.json({ product: { id: product.id, ean, name: product.productName, brand: 'Example Wellness', packSize: '60 tablets', caseSize: 12 },
      fetchedAt, customerLinked: true, warnings: ['Fictional records for testing the quotation interface.'],
      inventory: { onHand: 9, allocated: 24, available: -15, incoming: 60 },
      costOptions: [
        { source: 'last_purchase', unitCost: '4.99', currency: 'GBP', supplierId: 1, supplierName: 'Example Wellness Supply', reference: 'GRN-EXAMPLE', priceDate: '2026-09-29', token: 'fictional', fetchedAt, ean, productRef: product.id },
        { source: 'supplier_price', unitCost: '4.92', currency: 'GBP', supplierId: 1, supplierName: 'Example Wellness Supply', reference: 'Older offer', priceDate: '2026-03-05', token: 'fictional', fetchedAt, ean, productRef: product.id },
        { source: 'supplier_price', unitCost: '5.50', currency: 'EUR', supplierId: 2, supplierName: 'Example European Supply', reference: 'EU-EXAMPLE', priceDate: '2026-09-29', fetchedAt, ean, productRef: product.id }
      ],
      customerPrice: { price: 6.49, scope: 'brand', listId: 9001 },
      pricing: { recommendations: { suggestedMinPrice: '5.66', suggestedMaxPrice: '6.46', optimalPricePoint: '6.46', confidence: 'high' }, reasoning: 'Fictional indicative pricing.', dealPerformance: { wonDeals: 10, lostDeals: 0, winRate: '100' } },
      customerSales: [{ reference: 'INV-EXAMPLE', date: '2026-09-28', quantity: 24, unitPrice: '6.49', currency: 'GBP', customerName: 'Example North Pharmacy' }],
      sales: [], purchases: [{ source: 'Goods in', reference: 'GRN-EXAMPLE', date: '2026-09-29', quantity: 60, unitCost: '4.99', currency: 'GBP', supplierName: 'Example Wellness Supply' }]
    });
  });
  app.get('/api/admin/quotes/:id', (req, res) => {
    const quote = quotes.find(row => row.id === Number(req.params.id));
    if (!quote) return res.status(404).json({ message: 'No such fictional quote.' });
    res.json({ ...quote, items: itemsFor(quote, 'quote'), customer: users.find(user => user.id === quote.userId), events: [], notifications: [{ audience: 'sales', status: 'sent' }, { audience: 'customer', status: 'sent' }], notes: 'Sample request. Delivery statuses are fictional; no email has been sent.' });
  });
  app.get('/api/admin/orders/:id', (req, res) => {
    const order = orders.find(row => row.id === Number(req.params.id));
    if (!order) return res.status(404).json({ message: 'No such fictional order.' });
    res.json({ order, items: itemsFor(order, 'order'), customer: users.find(user => user.id === order.userId), events: [] });
  });
  app.get('/api/admin/workspace/:kind', (req, res) => {
    const term = String(req.query.q || '').trim().toLowerCase();
    if (term.length < 3 || term.length > 80) return res.status(400).json({ message: 'Search must contain 3 to 80 characters.' });
    const quoteMatches = matchingDeals(quotes, 'quote', term);
    const orderMatches = matchingDeals(orders, 'order', term);
    if (req.params.kind === 'sales-matches') return res.json({ quotes: quoteMatches.map(row => row.id), orders: orderMatches.map(row => row.id) });
    if (req.params.kind !== 'search') return res.status(404).json({ message: 'Unavailable in rehearsal.' });
    res.json([
      ...quoteMatches.map(row => ({ id: row.id, kind: 'Quote', label: users.find(user => user.id === row.userId).companyName, detail: `Q-${row.id} · ${row.status}`, href: `/admin/sales/quote/${row.id}` })),
      ...orderMatches.map(row => ({ id: row.id, kind: 'Order', label: row.companyName, detail: `O-${row.id} · ${row.status}`, href: `/admin/sales/order/${row.id}` })),
      ...users.filter(row => matches([row.companyName, row.email, row.primaryContactName], term)).map(row => ({ id: row.id, kind: 'Customer', label: row.companyName, detail: row.email, href: `/admin/users?review=${row.id}` })),
      ...suppliers.filter(row => matches([row.companyName, row.email, row.contactName], term)).map(row => ({ id: row.id, kind: 'Supplier', label: row.companyName, detail: row.country, href: `/admin/suppliers?review=${row.id}` })),
      ...products.filter(row => matches([row.productName, row.ean, row.brand.name, row.category.name], term)).map(row => ({ id: row.id, kind: 'Product', label: row.productName, detail: `${row.brand.name} · ${row.ean}`, href: `/admin/products?search=${row.ean}` })),
    ]);
  });
  app.get('/api/products', (req, res) => {
    const filtered = products.filter(row => matches([row.productName, row.ean], String(req.query.search || '').toLowerCase()));
    res.json({ products: filtered, pagination: { page: 1, pageSize: 100, total: filtered.length, totalPages: 1 } });
  });
  app.get('/api/admin/brands', (_req, res) => res.json(brands));
  app.get('/api/admin/categories', (_req, res) => res.json(categories));
  app.use('/api', (_req, res) => res.status(404).json({ message: 'This workflow is not included in the isolated admin rehearsal.' }));
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /'));
  const output = resolve('dist/public');
  const html = () => readFileSync(resolve(output, 'index.html'), 'utf8').replace('<body>', `<body><div style="position:relative;z-index:60;padding:9px 16px;background:#def58d;color:#432338;font:12px/1.5 system-ui;text-align:center">IMPLEMENTATION REHEARSAL · Fictional records. Saves and emails disabled.</div><style>body.aw-active .aw-sidebar{top:36px;height:calc(100dvh - 36px)}</style>`);
  app.get('/__rehearsal/mobile', (req, res) => {
    const route = ['/admin', '/admin/accounts', '/admin/sales'].includes(req.query.page) ? req.query.page : '/admin';
    res.type('html').send(`<!doctype html><title>Admin mobile rehearsal</title><style>body{margin:0;background:#ece8e4;font:14px system-ui;color:#432338;text-align:center}iframe{display:block;width:390px;height:844px;margin:20px auto;border:1px solid #bfb2ba;border-radius:20px;background:white}a{color:inherit}</style><p>390px mobile layout · Fictional records · <a href="/admin">Desktop view</a></p><iframe title="Admin mobile preview" src="${route}"></iframe>`);
  });
  app.get('/admin*', (_req, res) => res.type('html').send(html()));
  app.use('/brand', express.static(resolve(output, 'brand')));
  app.use('/assets', express.static(resolve(output, 'assets')));
  app.get('/', (_req, res) => res.redirect('/admin'));
  app.use((_req, res) => res.status(404).send('Only the admin rehearsal is available here.'));
  return app;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createRehearsal().listen(Number(process.env.PORT || 5001), '0.0.0.0', () => console.log('Fictional admin rehearsal ready. No database or email connections.'));
}
