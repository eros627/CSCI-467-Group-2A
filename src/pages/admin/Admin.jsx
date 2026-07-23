import './Admin.css';
import OrderResultCard from '../../components/OrderResultCard';
import {
    searchOrders,
    getOrder,
    getShippingRates,
    createShippingRate,
    updateShippingRate,
    deleteShippingRate,
} from '../../api/apiClient';
import { useEffect, useState } from 'react';

export default function Admin() {
    const [view, setView] = useState('orders');
    const [error, setError] = useState('');

    // --- Order search state ---
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [orders, setOrders] = useState([]);
    const [viewedOrder, setViewedOrder] = useState(null);

    async function handleSearch() {
        setError('');
        try {
            const filters = {};
            if (dateFrom) filters.dateFrom = dateFrom;
            if (dateTo) filters.dateTo = dateTo;
            if (statusFilter) filters.status = statusFilter;
            if (minPrice) filters.minPrice = minPrice;
            if (maxPrice) filters.maxPrice = maxPrice;

            const result = await searchOrders(filters);
            setOrders(result.data);
        } catch (err) {
            setError(err.message);
        }
    }

    // Load the unfiltered list once when the page first opens
    useEffect(() => {
        handleSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleViewOrder(order) {
        setError('');
        try {
            setViewedOrder(await getOrder(order.id));
        } catch (err) {
            setError(err.message);
        }
    }

    // --- Shipping rates state ---
    const [rates, setRates] = useState([]);
    const [editingRate, setEditingRate] = useState(null);
    const [rateForm, setRateForm] = useState({ minWeight: '', maxWeight: '', charge: '' });

    async function loadRates() {
        setError('');
        try {
            setRates(await getShippingRates());
        } catch (err) {
            setError(err.message);
        }
    }

    useEffect(() => {
        if (view === 'shipping') loadRates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view]);

    function startEditRate(rate) {
        setEditingRate(rate);
        setRateForm({
            minWeight: rate.minWeight,
            maxWeight: rate.maxWeight ?? '',
            charge: rate.charge,
        });
    }

    async function handleRateSubmit() {
        setError('');
        // maxWeight blank means "no upper limit" - the backend expects null,
        // not an empty string, for the final open-ended bracket.
        const parsed = {
            minWeight: Number(rateForm.minWeight),
            maxWeight: rateForm.maxWeight === '' ? null : Number(rateForm.maxWeight),
            charge: Number(rateForm.charge),
        };

        try {
            if (editingRate) {
                await updateShippingRate(editingRate.id, parsed);
            } else {
                await createShippingRate(parsed);
            }
            setEditingRate(null);
            setRateForm({ minWeight: '', maxWeight: '', charge: '' });
            loadRates();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleRateDelete(rateId) {
        setError('');
        try {
            await deleteShippingRate(rateId);
            loadRates();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div>
            <header className="adminHeader">
                <h1>Administration</h1>
                <button onClick={() => setView('orders')}>Search Orders</button>
                <button onClick={() => setView('shipping')}>Shipping Charges</button>
            </header>

            {error && <p className="errorBanner">{error}</p>}

            {view === 'orders' && (
                <>
                    <div className="orderFilterBar">
                        <label>
                            From:
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </label>
                        <label>
                            To:
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </label>
                        <label>
                            Status:
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">All</option>
                                <option value="PENDING_PAYMENT">Pending Payment</option>
                                <option value="AUTHORIZED">Authorized</option>
                                <option value="PAYMENT_FAILED">Payment Failed</option>
                                <option value="SHIPPED">Shipped</option>
                            </select>
                        </label>
                        <label>
                            Min Price:
                            <input
                                type="number"
                                className="priceInput"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                            />
                        </label>
                        <label>
                            Max Price:
                            <input
                                type="number"
                                className="priceInput"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                            />
                        </label>
                        <button onClick={handleSearch}>Search</button>
                    </div>

                    <main className="orderResultList">
                        {orders.map((order) => (
                            <OrderResultCard key={order.id} order={order} onViewOrder={handleViewOrder} />
                        ))}
                    </main>
                </>
            )}

            {view === 'shipping' && (
                <div className="shippingSection">
                    <h2>Weight Brackets</h2>
                    <table className="bracketTable">
                        <thead>
                            <tr>
                                <th>Min Weight (lb)</th>
                                <th>Max Weight (lb)</th>
                                <th>Charge</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rates.map((rate) => (
                                <tr key={rate.id}>
                                    <td>{rate.minWeight}</td>
                                    <td>{rate.maxWeight ?? 'and up'}</td>
                                    <td>${rate.charge.toFixed(2)}</td>
                                    <td>
                                        <button onClick={() => startEditRate(rate)}>Edit</button>
                                        <button className="removeButton" onClick={() => handleRateDelete(rate.id)}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="bracketForm">
                        <h3>{editingRate ? 'Edit Bracket' : 'Add Bracket'}</h3>
                        <label className="bracketFormRow">
                            <span className="bracketLabel">Min (lb):</span>
                            <input
                                type="number"
                                value={rateForm.minWeight}
                                onChange={(e) => setRateForm({ ...rateForm, minWeight: e.target.value })}
                            />
                        </label>
                        <label className="bracketFormRow">
                            <span className="bracketLabel">Max (lb):</span>
                            <input
                                type="number"
                                placeholder="blank = no limit"
                                value={rateForm.maxWeight}
                                onChange={(e) => setRateForm({ ...rateForm, maxWeight: e.target.value })}
                            />
                        </label>
                        <label className="bracketFormRow">
                            <span className="bracketLabel">Charge:</span>
                            <input
                                type="number"
                                value={rateForm.charge}
                                onChange={(e) => setRateForm({ ...rateForm, charge: e.target.value })}
                            />
                        </label>
                        <button className="checkoutButton" onClick={handleRateSubmit}>
                            {editingRate ? 'Save Changes' : 'Add Bracket'}
                        </button>
                    </div>
                </div>
            )}

            {viewedOrder && (
                <div className="orderOverlay">
                    <header className="orderToView">
                        <p className="orderOverlayTitle">Order #{viewedOrder.orderNumber}</p>
                        <button className="backButton" onClick={() => setViewedOrder(null)}>
                            X
                        </button>
                    </header>

                    <p className="overlaySection">Customer:</p>
                    <p className="overlayBody">{viewedOrder.customer.name}</p>
                    <p className="overlayBody">{viewedOrder.customer.email}</p>
                    <p className="overlayBody">
                        {viewedOrder.customer.address.line1}, {viewedOrder.customer.address.city},{' '}
                        {viewedOrder.customer.address.state} {viewedOrder.customer.address.postalCode}
                    </p>

                    <p className="overlaySection">Items:</p>
                    {viewedOrder.items.map((item) => (
                        <p className="overlayBody" key={item.partNumber}>
                            {item.quantity} - {item.description}: ${item.lineTotal.toFixed(2)}
                        </p>
                    ))}

                    <p className="overlaySection">Charges:</p>
                    <p className="overlayBody">Subtotal: ${viewedOrder.subtotal.toFixed(2)}</p>
                    <p className="overlayBody">Shipping: ${viewedOrder.shippingCharge.toFixed(2)}</p>
                    <p className="overlayBody">Total: ${viewedOrder.totalAmount.toFixed(2)}</p>

                    <p className="overlaySection">Status:</p>
                    <p className="overlayBody">{viewedOrder.status}</p>
                    {viewedOrder.payment.authorizationNumber && (
                        <p className="overlayBody">Authorization #: {viewedOrder.payment.authorizationNumber}</p>
                    )}
                </div>
            )}
        </div>
    );
}
