import './Receiving.css';
import PartResultCard from '../../components/PartResultCard';
import mockParts from '../../data/mockParts';
import { useState } from 'react';

export default function Receiving() {
    const [query, setQuery] = useState('');
    const [selectedPart, setSelectedPart] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [confirmation, setConfirmation] = useState('');

    const matchingParts = mockParts.filter((part) =>
        part.description.toLowerCase().includes(query.toLowerCase()) ||
        String(part.partNumber).includes(query)
    );

    function handleSelect(part) {
        setSelectedPart(part);
        setConfirmation('');
    }

    function handleReceive() {
        const qty = Number(quantity);
        if (!qty || qty <= 0) return;

        // TODO: replace with a real inventory update once the backend route exists
        setConfirmation(`Added ${qty} unit(s) of "${selectedPart.description}" to inventory.`);
        setSelectedPart(null);
        setQuantity('');
    }

    return (
        <div>
            <header className="receivingHeader">
                <h1>Auto Parts Warehouse - Receiving</h1>
                <input
                    type="text"
                    className="searchInput"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by description or part number"
                />
            </header>

            {confirmation && <p className="confirmationBanner">{confirmation}</p>}

            <h2>Matching Parts</h2>
            <main className="partResultList">
                {matchingParts.map((part) => (
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
                    <p>Receiving: {selectedPart.description} (Part #: {selectedPart.partNumber})</p>
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
                    <button className="receiveButton" onClick={handleReceive}>
                        Add To Inventory
                    </button>
                </div>
            )}
        </div>
    );
}
