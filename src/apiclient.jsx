
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const WAREHOUSE_API_KEY = import.meta.env.VITE_WAREHOUSE_API_KEY || '';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

async function request(path, { headers = {}, ...options } = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...headers },
        ...options,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed: ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
}

// ---- Receiving ----
// GET /api/parts is public - no API key needed to search the legacy catalog.
export async function searchParts(query) {
    const result = await request(`/parts?search=${encodeURIComponent(query)}`);
    return result.data;
}

// POST /api/inventory/receive requires the warehouse key.
export async function receiveInventory({ partNumber, quantity, note }) {
    const result = await request('/inventory/receive', {
        method: 'POST',
        headers: { 'x-api-key': WAREHOUSE_API_KEY },
        body: JSON.stringify({ partNumber, quantity, note }),
    });
    return result.data; // { movementId, quantityOnHand }
}

// ---- Admin: Orders ----
// GET /api/orders accepts either the admin or warehouse key.
export async function searchOrders(filters) {
    const params = new URLSearchParams(filters).toString();
    return request(`/orders?${params}`, {
        headers: { 'x-api-key': ADMIN_API_KEY },
    }); // returns { data, pagination } - caller decides whether it needs pagination
}

export async function getOrder(orderId) {
    const result = await request(`/orders/${orderId}`, {
        headers: { 'x-api-key': ADMIN_API_KEY },
    });
    return result.data;
}

// ---- Admin: Shipping rates ----
export async function getShippingRates() {
    const result = await request('/shipping-rates', {
        headers: { 'x-api-key': ADMIN_API_KEY },
    });
    return result.data;
}

export async function createShippingRate(rate) {
    const result = await request('/shipping-rates', {
        method: 'POST',
        headers: { 'x-api-key': ADMIN_API_KEY },
        body: JSON.stringify(rate),
    });
    return result.data;
}

export async function updateShippingRate(rateId, rate) {
    const result = await request(`/shipping-rates/${rateId}`, {
        method: 'PUT',
        headers: { 'x-api-key': ADMIN_API_KEY },
        body: JSON.stringify(rate),
    });
    return result.data;
}

export async function deleteShippingRate(rateId) {
    const result = await request(`/shipping-rates/${rateId}`, {
        method: 'DELETE',
        headers: { 'x-api-key': ADMIN_API_KEY },
    });
    return result.data;
}
