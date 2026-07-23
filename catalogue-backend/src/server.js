// This script is the entry point for the application. It loads the configuration, creates the dependency injection container, and starts the HTTP server

// Import createApp: it initializes the Express application with the provided configuration and services
import { createApp } from './app.js';

// Import loadConfig: it loads the application configuration from environment variables or a configuration file
import { loadConfig } from './config.js';

// Import createContainer: it creates the dependency injection container that holds all the services and repositories used in the application
import { createContainer } from './container.js';

// Import logger: it provides logging functionality for the application, allowing for structured and leveled logging
import { logger } from './lib/logger.js';

// Load the application configuration, create the dependency injection container, and start the HTTP server
const config = loadConfig();
const container = createContainer(config);
const app = createApp({ config, services: container.services });
const server = app.listen(config.port, () => {
    logger.info('HTTP server started', { port: config.port, environment: config.nodeEnv });
});

// The shutdown function gracefully shuts down the application when a termination signal is received
async function shutdown(signal) {
    logger.info('Shutting down', { signal });
    server.close(async () => {
        await container.close();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
}

// Listen for termination signals (SIGINT and SIGTERM) to initiate the shutdown process
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions and unhandled promise rejections to log the errors and prevent the application from crashing silently
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection', { error: error?.message || String(error) });
});
