import { resolve } from 'path';
import { defineConfig } from 'vite';
import fs from 'fs';

const devDataDir = resolve(__dirname, '.dev-data');
const waterOrdersFile = resolve(devDataDir, 'water-orders.json');

function readWaterOrders() {
  try {
    return JSON.parse(fs.readFileSync(waterOrdersFile, 'utf8'));
  } catch {
    return [];
  }
}

function writeWaterOrders(orders) {
  fs.mkdirSync(devDataDir, { recursive: true });
  fs.writeFileSync(waterOrdersFile, JSON.stringify(orders, null, 2));
}

function readBody(req) {
  return new Promise((resolveBody) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch {
        resolveBody({});
      }
    });
  });
}

export default defineConfig({
  plugins: [{
    name: 'local-water-orders-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/water-orders')) return next();

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const orders = readWaterOrders();

        if (req.method === 'GET' && url.pathname === '/api/water-orders') {
          res.end(JSON.stringify(orders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/water-orders') {
          const body = await readBody(req);
          const order = {
            ...body,
            _id: body._id || `dev-water-${Date.now()}`,
            localId: body.localId || `water-${Date.now()}`,
            status: body.status || 'Pending',
            date: body.date || new Date().toISOString(),
          };
          const nextOrders = [order, ...orders.filter((o) => o.localId !== order.localId && o._id !== order._id)];
          writeWaterOrders(nextOrders);
          res.end(JSON.stringify({ success: true, order }));
          return;
        }

        const deliverMatch = url.pathname.match(/^\/api\/water-orders\/([^/]+)\/deliver$/);
        if (req.method === 'PUT' && deliverMatch) {
          const id = decodeURIComponent(deliverMatch[1]);
          const nextOrders = orders.map((order) => (
            order._id === id || order.localId === id ? { ...order, status: 'Delivered' } : order
          ));
          writeWaterOrders(nextOrders);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        const cancelMatch = url.pathname.match(/^\/api\/water-orders\/([^/]+)\/cancel$/);
        if (req.method === 'PUT' && cancelMatch) {
          const id = decodeURIComponent(cancelMatch[1]);
          const nextOrders = orders.map((order) => (
            order._id === id || order.localId === id ? { ...order, status: 'Canceled' } : order
          ));
          writeWaterOrders(nextOrders);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ success: false }));
      });
    },
  }],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
