// This script is the main entry point for the application. It sets up the Express app, configures middleware, and defines routes for the API

import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { asyncHandler } from './lib/async-handler.js';
import { requireApiKey } from './middleware/api-key.js';
import { errorHandler, notFound, requestId } from './middleware/error-handler.js';
import { adminRoutes } from './routes/admin-routes.js';
import { catalogRoutes } from './routes/catalog-routes.js';
import { orderRoutes } from './routes/order-routes.js';
import { warehouseRoutes } from './routes/warehouse-routes.js';

// The corsOrigin function takes a comma-separated string of allowed origins and returns a function that checks if a given origin is allowed
function corsOrigin(setting) {
    const allowed = setting.split(',').map((value) => value.trim()).filter(Boolean);
    
    return function checkOrigin(origin, callback) {
        if (!origin || allowed.includes('*') || allowed.includes(origin)) callback(null, true);
        else callback(null, false);
    };
}

// The createApp function initializes the Express application with the provided configuration and services
export function createApp({ config, services }) {
    const app = express();
    app.disable('x-powered-by');
    
    if (config.trustProxy) app.set('trust proxy', 1);
    
    app.use(requestId);
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors({ origin: corsOrigin(config.corsOrigin), credentials: false }));
    app.use(express.json({ limit: '100kb' }));
    morgan.token('request-id', (req) => req.id);
    morgan.token('safe-path', (req) => req.originalUrl.split('?')[0]);
    app.use(morgan(':method :safe-path :status :response-time ms request-id=:request-id', {
        skip: () => config.nodeEnv === 'test',
    }));
    
    app.get('/', (_req, res) => {
        res.json({
            name: 'Auto Parts Ordering API',
            version: '1.0.0',
            documentation: '/docs/openapi.yaml',
        });
    });
    
    app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
    app.get('/health/ready', asyncHandler(async (_req, res) => {
        res.json(await services.healthService.readiness());
    }));
    
    app.use('/docs', express.static(fileURLToPath(new URL('../docs', import.meta.url))));
    app.use('/api/products', catalogRoutes(services.catalogService));
    app.use('/api/orders', orderRoutes(services.orderService));
    app.use(
        '/api/warehouse',
        requireApiKey(config.auth.warehouseApiKey, 'Warehouse'),
        warehouseRoutes({ warehouseService: services.warehouseService, documentService: services.documentService }),
    );
    
    app.use(
        '/api/admin',
        requireApiKey(config.auth.adminApiKey, 'Administrator'),
        adminRoutes(services.adminService),
    );

    app.use(notFound);
    app.use(errorHandler);
    return app;
}
