import './Receiving.css';
import PartResultCard from '../../components/PartResultCard';
import { searchParts, receiveInventory } from '../../api/apiClient';
import { useEffect, useState } from 'react';

export default function Receiving() {
    const [query, setQuery] = useState('');
    const [parts, setParts] = useState([]);
    const [selectedPart, setSelectedPart] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Debounce: wait for typing to pause before hitting the real API,
    // instead of firing a request on every keystroke like the mock version did.
    useEffect(() => {
        if (query.trim().length < 2) {
            setParts([]);
            return undefined;
        }

        const timeoutId = setTimeout(() => {
            searchParts(query.trim())
                .then(setParts)
                .catch((err) => setError(err.message));
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [query]);

    function handleSelect(part) {
        setSelectedPart(part);
        setConfirmation('');
    }

    async function handleReceive() {
        const qty = Number(quantity);
        if (!qty || qty <= 0) return;

        setSubmitting(true);
        setError('');
        try {
            const result = await receiveInventory({
                partNumber: selectedPart.partNumber,
                quantity: qty,
            });
            setConfirmation(
                `Added ${qty} unit(s) of "${selectedPart.description}" to inventory. ` +
                `New qty on hand: ${result.quantityOnHand}.`
            );
            setSelectedPart(null);
            setQuantity('');
            setParts([]);
            setQuery('');
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div>
            <header className="receivingHeader">
                <h1>Auto Parts Warehouse - Receiving</h1>
                <input
                    type="text"
                    className="searchInput"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by description or part number"
                />
            </header>

            {error && <p className="errorBanner">{error}</p>}
            {confirmation && <p className="confirmationBanner">{confirmation}</p>}

            <h2>Matching Parts</h2>
            <main className="partResultList">
                {parts.map((part) => (
                    <PartResultCard
                        key={part.partNumber}
                        part={part}
                        isSelected={selectedPart?.partNumber === part.partNumber}
                        onSelect={handleSelect}
                    />
                ))}
            </main>

            {selectedPart && (
                <div className="receiveForm">
                    <h2>Record Delivery</h2>
                    <p>
                        Receiving: {selectedPart.description} (Part #: {selectedPart.partNumber}) -
                        currently {selectedPart.availableQuantity} on hand
                    </p>
                    <label className="quantityRow">
                        <span className="quantityLabel">Qty Received:</span>
                        <input
                            type="number"
                            className="qtyInput"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </label>
                    <button className="receiveButton" onClick={handleReceive} disabled={submitting}>
                        {submitting ? 'Saving…' : 'Add To Inventory'}
                    </button>
                </div>
            )}
        </div>
    );
}
