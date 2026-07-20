# Auto Parts Ordering Backend

Production-minded Express/Node.js backend for the CSCI 467 product system. It covers catalog browsing, inventory-aware checkout, credit-card authorization, order emails, warehouse receiving and shipping, printable packing documents, and administrative order/rate management.

## Architecture

- **Legacy catalog (read-only):** MySQL `csci467.parts(number, description, price, weight, pictureURL)`.
- **Application database:** inventory, shipping brackets, orders, item snapshots, status history, and inventory movements. The SQL contract is in [`database/schema.sql`](database/schema.sql).
- **Credit-card service:** JSON `POST` to the course service using the exact `vendor`, `trans`, `cc`, `name`, `exp`, and `amount` fields.
- **Email:** Nodemailer SMTP in production; safe console mode for local development.
- **Security boundary:** catalog and checkout are public; warehouse and admin APIs use independent API keys. Full card numbers are only held in memory for the authorization request and are never persisted or logged.

The database code is isolated in `src/repositories`, so a database teammate can change tables or stored procedures without changing routes and business services.

## Quick start

Prerequisites: Node.js 20+, pnpm/npm, and MySQL 8.

```bash
cp .env.example .env
pnpm install
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed-development.sql   # optional local data
pnpm dev
```

Update `.env` with the separate application and legacy database credentials, the assigned payment vendor ID, and strong API keys. The assignment's shared legacy credentials are deliberately not hardcoded in source control.

For a local application database, `docker compose up -d mysql` creates MySQL and applies both SQL files. Point these `.env` values at it:

```dotenv
APP_DB_HOST=127.0.0.1
APP_DB_NAME=auto_parts_app
APP_DB_USER=auto_parts
APP_DB_PASSWORD=local-password
```

The API starts at `http://localhost:3000`. OpenAPI documentation is served at `http://localhost:3000/docs/openapi.yaml`.

## API summary

| Method | Route | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/products` | Search/paginate catalog with available quantity | Public |
| `GET` | `/api/products/:partNumber` | Product detail | Public |
| `POST` | `/api/orders` | Price, reserve inventory, authorize, confirm | Public/rate-limited |
| `GET` | `/api/orders/:id?email=...` | Customer order status | Customer email match |
| `POST` | `/api/orders/:id/payment` | Retry a failed payment | Customer email match |
| `GET` | `/api/warehouse/orders/ready` | Orders ready to pack | Warehouse key |
| `GET` | `/api/warehouse/orders/:id/{packing-list,invoice,shipping-label}` | Printable HTML | Warehouse key |
| `POST` | `/api/warehouse/orders/:id/ship` | Mark shipped and email customer | Warehouse key |
| `POST` | `/api/warehouse/inventory/receipts` | Receive stock by part number or exact description | Warehouse key |
| `GET` | `/api/warehouse/inventory/movements` | Inventory audit trail | Warehouse key |
| `GET/PUT` | `/api/admin/shipping-rates` | View/replace weight brackets | Admin key |
| `GET` | `/api/admin/orders` | Search by dates, status, or total-price range | Admin key |
| `GET` | `/api/admin/orders/:id` | Complete order details/history | Admin key |

Protected requests accept either `X-API-Key: value` or `Authorization: Bearer value`.

### Checkout example

Use an `Idempotency-Key` header (a UUID is ideal) so a network retry cannot create a second order or charge attempt.

```http
POST /api/orders HTTP/1.1
Content-Type: application/json
Idempotency-Key: 86b43491-7378-47ef-901c-fbb863d5980f

{
  "customer": {
    "name": "Jane Driver",
    "email": "jane@example.com",
    "address": {
      "line1": "123 Main St",
      "city": "DeKalb",
      "state": "IL",
      "postalCode": "60115",
      "country": "US"
    }
  },
  "items": [
    { "partNumber": 2, "quantity": 2 },
    { "partNumber": 10, "quantity": 1 }
  ],
  "payment": {
    "cardNumber": "4111111111111111",
    "expirationDate": "12/2099",
    "cardholderName": "Jane Driver"
  }
}
```

Prices, weights, shipping, and availability are always recalculated on the server. Client-supplied totals are not accepted.

## Order and inventory behavior

1. Duplicate item lines are consolidated.
2. Current descriptions/prices/weights are loaded from the legacy database.
3. The matching shipping bracket is selected. Brackets are `[minWeight, maxWeight)`; the last bracket is unbounded.
4. Inventory rows are locked inside an InnoDB transaction, stock is reserved, and the pending order/item snapshots are saved atomically.
5. The external card service is called with the stable order transaction ID.
6. Approval changes the order to `AUTHORIZED`; a decline/error changes it to `PAYMENT_FAILED` and restores inventory.
7. Shipping changes only an `AUTHORIZED` order to `SHIPPED` and records carrier/tracking data.

Inventory movements and order events provide an audit trail. Concurrent updates use row locks and guarded decrements to prevent overselling.

## Database teammate handoff

The backend assumes only the schema in `database/schema.sql`. Important choices to coordinate before merging database work:

- Keep legacy `parts` access read-only and separate from the mutable application pool.
- Preserve decimal precision or return prices/weights in a form `mysql2` can convert to numbers.
- Keep `orders.idempotency_key` and `orders.payment_transaction_id` unique.
- Do not add a foreign key from application inventory/items to the legacy database; deployments may use different MySQL servers.
- All mutable tables must use InnoDB because checkout relies on transactions and `SELECT ... FOR UPDATE`.
- If table/column names change, only files under `src/repositories` should need updates.

## Email and printable documents

Set `MAIL_MODE=smtp` plus SMTP settings to send messages. In console mode, only delivery metadata is logged. Packing lists, invoices, and labels are print-friendly HTML so warehouse browsers can print them directly or choose “Save as PDF.”

Email failure is logged but does not roll back an already authorized or shipped order. A production follow-up would normally use a durable email outbox/worker.

## Verification

```bash
pnpm check
pnpm test
```

Tests mock MySQL repositories and the credit-card service; they do not contact NIU systems. Readiness at `/health/ready` is the intentional exception at runtime: it checks both configured database connections.

## Deployment notes

- Terminate HTTPS at a reverse proxy and do not expose the service over plain Internet HTTP.
- Rotate API keys and database/payment credentials; never commit `.env`.
- Restrict the application DB account to the application schema and the legacy account to `SELECT` on `parts`.
- The course payment URL is HTTP as supplied. In a real payment system, require TLS and use a PCI-compliant hosted/tokenized card flow.
- Set `TRUST_PROXY=true` only when running behind a trusted single reverse proxy; rate limiting depends on the client IP.
