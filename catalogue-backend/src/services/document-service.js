// This script defines the document service for generating HTML documents such as packing lists, invoices, and shipping labels. 
// It includes functions to create these documents based on order data and customer information

// Import escapeHtml: it allows to safely escape HTML characters in strings to prevent XSS attacks
import { escapeHtml } from '../lib/html.js';

// Define the CSS styles for the generated HTML documents
const styles = `
    @page { margin: 0.55in; }
    body { font-family: Arial, sans-serif; color: #111; font-size: 12px; }
    h1 { margin: 0 0 18px; font-size: 24px; }
    h2 { margin: 18px 0 6px; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border-bottom: 1px solid #bbb; padding: 7px; text-align: left; }
    th.number, td.number { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals td:first-child { font-weight: bold; }
    .label { border: 2px solid #111; max-width: 650px; padding: 30px; font-size: 18px; }
    .muted { color: #555; }
    @media print { .no-print { display: none; } }
`;

// The page function generates a complete HTML document with the given title and body content, applying the defined styles
function page(title, body) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${styles}</style></head><body>${body}</body></html>`;
}

// The address function formats a customer's address into an HTML string, escaping any HTML characters to prevent XSS attacks
function address(customer) {
    const value = customer.address;
    
    return [
        escapeHtml(customer.name),
        escapeHtml(value.line1),
        value.line2 ? escapeHtml(value.line2) : null,
        `${escapeHtml(value.city)}, ${escapeHtml(value.state)} ${escapeHtml(value.postalCode)}`,
        escapeHtml(value.country),
    ].filter(Boolean).join('<br>');
}

// The itemRows function generates HTML table rows for each item in an order, including part number, description, quantity, and optionally prices
function itemRows(order, { prices }) {
    return order.items.map((item) => `<tr>
        <td>${escapeHtml(item.partNumber)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td class="number">${item.quantity}</td>
        ${prices ? `<td class="number">$${item.unitPrice.toFixed(2)}</td><td class="number">$${item.lineTotal.toFixed(2)}</td>` : ''}
     </tr>`).join('');
}

// The documentService object provides methods to generate different types of HTML documents based on order data
export const documentService = {
    // This method generates a packing list document for the given order, including the order number, shipping address...
    // ...and item details without prices
    packingList(order) {
        return page(`Packing list ${order.orderNumber}`, `
            <h1>Packing List #${order.orderNumber}</h1>
            <p><strong>Ship to</strong><br>${address(order.customer)}</p>
            <p class="muted">Order ID: ${escapeHtml(order.id)}<br>Order date: ${escapeHtml(order.createdAt)}</p>
            <table><thead><tr><th>Part #</th><th>Description</th><th class="number">Quantity</th></tr></thead>
            <tbody>${itemRows(order, { prices: false })}</tbody></table>`);
    },

    // This method generates an invoice document for the given order, including the order number, customer information...
    // ...item details with prices, and payment authorization
    invoice(order) {
        return page(`Invoice ${order.orderNumber}`, `
            <h1>Invoice #${order.orderNumber}</h1>
            <p><strong>Customer</strong><br>${address(order.customer)}<br>${escapeHtml(order.customer.email)}</p>
            <table><thead><tr><th>Part #</th><th>Description</th><th class="number">Qty</th><th class="number">Unit</th><th class="number">Amount</th></tr></thead>
            <tbody>${itemRows(order, { prices: true })}</tbody></table>
            <table class="totals"><tr><td>Subtotal</td><td class="number">$${order.subtotal.toFixed(2)}</td></tr>
            <tr><td>Shipping & handling</td><td class="number">$${order.shippingCharge.toFixed(2)}</td></tr>
            <tr><td>Total paid</td><td class="number">$${order.totalAmount.toFixed(2)}</td></tr></table>
            <p>Payment authorization: ${escapeHtml(order.payment.authorizationNumber)} (card ending ${escapeHtml(order.payment.cardLast4)})</p>`);
    },
    
    // This method generates a shipping label document for the given order, including the shipping address, order number...
    // ...and carrier/tracking information if available
    shippingLabel(order) {
        return page(`Shipping label ${order.orderNumber}`, `
            <div class="label"><div class="muted">SHIP TO</div><h2>${address(order.customer)}</h2>
            <hr><p>Order #${order.orderNumber}</p>
            ${order.shipping.carrier ? `<p>${escapeHtml(order.shipping.carrier)} — ${escapeHtml(order.shipping.trackingNumber)}</p>` : '<p>Carrier/tracking assigned when shipment is completed.</p>'}
            </div>`);
    },
};
