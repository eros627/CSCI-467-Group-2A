/* This script defines the catalog service for managing products and their inventory. It includes functions to list products...
...with their available quantities and to retrieve a specific product by its part number. The service ensures that...
...the inventory quantities are attached to the product data before returning it */

// Import NotFoundError: it allows to throw an error when an order is not found in the repository
import { NotFoundError } from '../lib/errors.js';

// The createCatalogService function initializes the catalog service with the provided catalog and inventory repositories
export function createCatalogService({ catalogRepository, inventoryRepository }) {
    // The attachInventory function retrieves the available quantities for the given products and attaches them to the product data
    async function attachInventory(products) {
        const quantities = await inventoryRepository.getQuantities(products.map((item) => item.partNumber));

        return products.map((product) => ({
            ...product,
            availableQuantity: quantities.get(product.partNumber) || 0,
        }));
    }
    
    return {
        // The list method retrieves a list of products from the catalog repository based on the provided query and attaches their available quantities
        async list(query) {
            const result = await catalogRepository.list(query);
            return { ...result, items: await attachInventory(result.items) };
        },

        // The get method retrieves a specific product by its part number from the catalog repository and attaches its available quantity
        async get(partNumber) {
            const product = await catalogRepository.getByNumber(partNumber);
            if (!product) throw new NotFoundError('Product');
            return (await attachInventory([product]))[0];
        },
    };
}
