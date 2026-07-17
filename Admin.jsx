import './Admin.css';
import OrderResultCard from '../../components/OrderResultCard';
import mockOrders from '../../data/mockOrders';
import mockBrackets from '../../data/mockBrackets';
import { useState } from 'react';

export default function Admin() {
    const [view, setView] = useState('orders');

    // --- Order search state ---
    const [statusFilter, setStatusFilter] = useState('All');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [viewedOrder, setViewedOrder] = useState(null);

    const filteredOrders = mockOrders.filter((order) => {
        if (statusFilter !== 'All' && order.status !== statusFilter) return false;
        if (minPrice && order.total < Number(minPrice)) return false;
        if (maxPrice && order.total > Number(maxPrice)) return false;
        return true;
    });

    // --- Shipping bracket state ---
    const [brackets, setBrackets] = useState(mockBrackets);
    const [editingBracket, setEditingBracket] = useState(null);
    const [bracketForm, setBracketForm] = useState({ minWeight: '', maxWeight: '', charge: '' });

    function startEditBracket(bracket) {
        setEditingBracket(bracket);
        setBracketForm(bracket);
    }

    function handleBracketSubmit() {
        const parsed = {
            minWeight: Number(bracketForm.minWeight),
            maxWeight: Number(bracketForm.maxWeight),
            charge: Number(bracketForm.charge),
        };

        if (editingBracket) {
            setBrackets(brackets.map((b) => (b.id === editingBracket.id ? { ...b, ...parsed } : b)));
        } else {
            setBrackets([...brackets, { id: Date.now(), ...parsed }]);
        }

        setEditingBracket(null);
        setBracketForm({ minWeight: '', maxWeight: '', charge: '' });
    }

    function handleBracketDelete(id) {
        setBrackets(brackets.filter((b) => b.id !== id));
    }

    return (
        <div>
            <header className="adminHeader">
                <h1>Administration</h1>
                <button onClick={() => setView('orders')}>Search Orders</button>
                <button onClick={() => setView('shipping')}>Shipping Charges</button>
            </header>

            {view === 'orders' && (
                <>
                    <div className="orderFilterBar">
                        <label>
                            Status:
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option>All</option>
                                <option>Authorized</option>
                                <option>Shipped</option>
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
                    </div>

                    <main className="orderResultList">
                        {filteredOrders.map((order) => (
                            <OrderResultCard
                                key={order.id}
                                order={order}
                                onViewOrder={setViewedOrder}
                            />
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
                                <th>Min (lb)</th>
                                <th>Max (lb)</th>
                                <th>Charge</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {brackets.map((bracket) => (
                                <tr key={bracket.id}>
                                    <td>{bracket.minWeight}</td>
                                    <td>{bracket.maxWeight}</td>
                                    <td>${bracket.charge.toFixed(2)}</td>
                                    <td>
                                        <button onClick={() => startEditBracket(bracket)}>Edit</button>
                                        <button className="removeButton" onClick={() => handleBracketDelete(bracket.id)}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="bracketForm">
                        <h3>{editingBracket ? 'Edit Bracket' : 'Add Bracket'}</h3>
                        <label className="bracketFormRow">
                            <span className="bracketLabel">Min (lb):</span>
                            <input
                                type="number"
                                value={bracketForm.minWeight}
                                onChange={(e) => setBracketForm({ ...bracketForm, minWeight: e.target.value })}
                            />
                        </label>
                        <label className="bracketFormRow">
                            <span className="bracketLabel">Max (lb):</span>
                            <input
                                type="number"
                                value={bracketForm.maxWeight}
                                onChange={(e) => setBracketForm({ ...bracketForm, maxWeight: e.target.value })}
                            />
                        </label>
                        <label className="bracketFormRow">
                            <span className="bracketLabel">Charge:</span>
                            <input
                                type="number"
                                value={bracketForm.charge}
                                onChange={(e) => setBracketForm({ ...bracketForm, charge: e.target.value })}
                            />
                        </label>
                        <button className="checkoutButton" onClick={handleBracketSubmit}>
                            {editingBracket ? 'Save Changes' : 'Add Bracket'}
                        </button>
                    </div>
                </div>
            )}

            {viewedOrder && (
                <div className="orderOverlay">
                    <header className="orderToView">
                        <p className="orderOverlayTitle">Order #{viewedOrder.id}</p>
                        <button className="backButton" onClick={() => setViewedOrder(null)}>
                            X
                        </button>
                    </header>

                    <p className="overlaySection">Customer:</p>
                    <p className="overlayBody">{viewedOrder.customerName}</p>
                    <p className="overlayBody">{viewedOrder.email}</p>
                    <p className="overlayBody">{viewedOrder.mailingAddress}</p>

                    <p className="overlaySection">Items:</p>
                    {viewedOrder.items.map((item) => (
                        <p className="overlayBody" key={item.partNumber}>
                            {item.quantity} - {item.description}: ${(item.quantity * item.unitPrice).toFixed(2)}
                        </p>
                    ))}

                    <p className="overlaySection">Charges:</p>
                    <p className="overlayBody">Subtotal: ${viewedOrder.subtotal.toFixed(2)}</p>
                    <p className="overlayBody">Shipping: ${viewedOrder.shippingCharge.toFixed(2)}</p>
                    <p className="overlayBody">Total: ${viewedOrder.total.toFixed(2)}</p>

                    <p className="overlaySection">Status:</p>
                    <p className="overlayBody">{viewedOrder.status}</p>
                    <p className="overlayBody">Authorization #: {viewedOrder.authorizationNumber}</p>
                </div>
            )}
        </div>
    );
}
