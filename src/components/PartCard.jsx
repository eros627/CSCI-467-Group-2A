import { useState } from 'react';
import './PartCard.css';
import stockImg from '../assets/stock_img.jpg';

export default function PartCard({ showAddToCart = false, quantity = 1, onQuantityChange, onAddToCart, part, available}) {
    
    const [qty, setQty] = useState(quantity);

    function handleQuantityChange(e) {
        if( e.target.value <= available) {
            const newQty = Number(e.target.value);
            setQty(newQty);
            onQuantityChange && onQuantityChange(newQty);
        }
    }

    function handleAddClick() {
        onAddToCart(qty);
        setQty(1);
    }

    const isAvailable = available > 0;

    return (
        <div className="productCard">
            <img src={stockImg} alt={'stock product image'}/>
            <div className="productInfo">
                <p>{part.description}</p>
                <p>${part.price.toFixed(2)}</p>
                <p>{part.weight.toFixed(2)} lbs</p>
                <p>Available: {available}</p>
            </div>
            <div className="addToCart">
                <label>
                    <span className="quantityLabel">Qty:</span>
                    <input 
                        type="number"
                        className="qtyInput" 
                        min="1" 
                        value={qty}
                        onChange={handleQuantityChange}
                    />
                </label>
                { showAddToCart && (
                    <button 
                        className="addButton"
                        disabled={!isAvailable}
                        onClick={handleAddClick}
                    >
                        Add To Cart
                    </button>
                )}
            </div>
        </div>
    );
}
