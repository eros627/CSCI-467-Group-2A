/**
 * Tom Bernstein
 * CSCI 467 - 1
 * Group 2A Product System
 *
 * Description: User interface for product catalog and ordering.
 *****************************************************************************/

import './Catalog.css';
import PartCard from '../../components/PartCard';
import mockParts from '../../data/mockParts';
import calculateShipping from '../../data/mockShipping';
import { useState } from 'react';

export default function Catalog() {
    //user action states
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isOrderSubmitted, setIsOrderSubmitted] = useState(false);

    //list states
    const [cartItems, setCartItems] = useState([]);
    const [partList, filterPartList] = useState(mockParts);
    
    //value states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [ccNumber, setCcNumber] = useState('');
    const [expMonth, setExpMonth] = useState('');
    const [expYear, setExpYear] = useState('');

    //adds an item to the cart.
    //partInfo {partNumber: x, quantity: x}
    function handleAddItem(partInfo) {
        if (!cartItems.some(item => item.partNumber === partInfo.partNumber)) {
            const updatedCart = [...cartItems, partInfo];
            setCartItems(updatedCart);

        } else {
            const item = cartItems.find(i => i.partNumber === partInfo.partNumber);
            handleQuantityChange(partInfo.partNumber, partInfo.quantity + item.quantity)
        }
    }
   
    //handles updating of part quantities in cart.
    function handleQuantityChange(updatePartNo, newQty) {
        setCartItems(
            cartItems.map((item) =>
                item.partNumber === updatePartNo
                ? {...item, quantity: newQty}
                : item
            )
        );
    }    

    //removes item from cart.
    function handleRemoveItem(removePartNo) {
        setCartItems(cartItems.filter((element) => 
            element.partNumber !== removePartNo
        ));
        
    }

    //filters parts visible in the catalog by description.
    function filterParts(query) {
        filterPartList(mockParts.filter((element) =>
            element.description.toLowerCase().startsWith(query.toLowerCase(), 0)
        ));
    }

    //handles credit card entry. Forces hyphenated formatting for user
    //readability.
    function handleCcChange(e) {
        const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 16);
        const numGroups = onlyDigits.match(/.{1,4}/g) || [];
        setCcNumber(numGroups.join('-'));
    }

    //sets flags to close cart view and show order confirmation popup.
    function handleOrderSubmit() {
        setIsOrderSubmitted(true);
        setIsCartOpen(false);
    }

    function handleResetInfo() {
        setName('');
        setEmail('');
        setAddress('');
        setCcNumber('');
        setExpMonth('');
        setExpYear('');
        setCartItems([]);
        setIsOrderSubmitted(false);
    }
    
    const numItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const subtotal = cartItems.reduce((sum, item) => {
        const part = mockParts.find(p => p.partNumber === item.partNumber);
        return sum + part.price * item.quantity
    }, 0);

    const totalWeight = cartItems.reduce((sum, item) => {
        const part = mockParts.find(p => p.partNumber === item.partNumber);
        return sum + part.weight * item.quantity
    }, 0);

    const totalShipping = calculateShipping(totalWeight);

    const orderTotal = subtotal + totalShipping;

    const isCcValid = /^\d{4}-\d{4}-\d{4}-\d{4}$/.test(ccNumber);

    const isExpValid = expMonth !== '' && expYear !== '';

    const isUserInfoValid = name !== '' && email !== '' && address !== '';

    const isCheckoutReady = isCcValid && isExpValid && isUserInfoValid && cartItems.length > 0;

    return (
        <div>
            <header className="catalogHeader">
                <h1>Auto Parts Catalog</h1>
                <button onClick = {() => setIsCartOpen(true)}>View Cart ({numItems})</button>
                <input
                    type="text"
                    className="searchInput"
                    onChange={(e) => filterParts(e.target.value)}
                    placeholder="Filter parts by description"
                />
            </header>

            {isCartOpen && (
                <>
                    <div className="backdrop" onClick={() => setIsCartOpen(false)} />
                    <div className="cartOverlay">
                        <header className="cartHeader">
                            <h1>My Cart({numItems})</h1>
                            <button
                                onClick={() => setIsCartOpen(false)}
                            >
                                Close
                            </button>
                        </header>

                        <div className="cartItems">
                            {cartItems.map((item) => {
                                const part = mockParts.find(p => p.partNumber === item.partNumber);
                                return (
                                    <div className="cartRow" key={item.partNumber}>
                                        <PartCard
                                            quantity={item.quantity}
                                            onQuantityChange={(newQty) => handleQuantityChange(item.partNumber, newQty)}
                                            part={part}
                                            available={part.qtyAvailable}
                                        />
                                        <button
                                            className="removeButton"
                                            onClick={() => handleRemoveItem(item.partNumber)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <footer className="cartFooter">
                            <div className="orderSummary">
                                <h3>Order Details</h3>
                                <p>Subotal: ${subtotal.toFixed(2)}</p>
                                <p>Weight: {totalWeight.toFixed(2)} lbs</p>
                                <p>Shipping: ${totalShipping.toFixed(2)}</p>
                                <p>Total: ${orderTotal.toFixed(2)}</p>
                            </div>
                            <div className="billingInfo">
                                <h3>Billing Info</h3>
                                <label className="billFormRow">
                                    <span className="billLabel">Name:</span>
                                    <input 
                                        type="text" 
                                        className="billInput" 
                                        placeholder="John Doe"
                                        onChange={(e) => setName(e.target.value)}
                                        value={name}
                                    />
                                </label>
                                <label className="billFormRow">
                                    <span className="billLabel">Email:</span>
                                    <input 
                                        type="text"
                                        className="billInput"
                                        placeholder="jdoe@gmail.com"
                                        onChange={(e) => setEmail(e.target.value)}
                                        value={email}
                                    />

                                </label>
                                <label className="billFormRow">
                                    <span className="billLabel">Address:</span>
                                    <input 
                                        type="text"
                                        className="billInput"
                                        placeholder="123 Main St."
                                        onChange={(e) => setAddress(e.target.value)}
                                        value={address}
                                    />

                                </label>
                                <label className="billFormRow">
                                    <span className="billLabel">CC:</span>
                                    <input 
                                        type="text" 
                                        className="billInput" 
                                        placeholder="xxxx-xxxx-xxxx-xxxx"
                                        onChange={handleCcChange}
                                        value={ccNumber}
                                    />
                                </label>
                                <label className="billFormRow">
                                    <span className="billLabel">Exp.:</span>
                                    <select value={expMonth} onChange={(e) => setExpMonth(e.target.value)}>
                                        <option value="">MM</option>
                                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <select value={expYear} onChange={(e) => setExpYear(e.target.value)}>
                                        <option value="">YY</option>
                                        {Array.from({ length: 10 }, (_, i) => {
                                            const yy = String((new Date().getFullYear() + i) % 100).padStart(2, '0');
                                            return <option key={yy} value={yy}>{yy}</option>
                                        })}
                                    </select>
                                </label>
                            </div>
                            <button 
                                className="checkoutButton"
                                disabled={!isCheckoutReady}
                                onClick={handleOrderSubmit}
                            >
                                Checkout
                            </button>
                        </footer>

                    </div>
                </>
            )}

            {isOrderSubmitted && (
                <>
                    <div className="backdrop" onClick={handleResetInfo}/>
                    <div className="submitOverlay">
                        <h2>Confirmation: Order No. 37</h2>
                        <div className="confirmDetail">
                            <p>Amount: {orderTotal.toFixed(2)}</p>
                            <p>Auth: AUTHCODE HERE</p>
                            <p>For: {name}, {email}</p>
                        </div>
                        <p>Thank you for shopping with us.</p>
                        <button 
                            onClick={handleResetInfo}
                        >
                            Return to Catalog
                        </button>
                    </div>
                </>
            )}

            <main className="productList">
                {partList.map((part) =>  {
                    const qtyInCart = cartItems.find(i => i.partNumber === part.partNumber)?.quantity || 0;
                    const available = part.qtyAvailable - qtyInCart;
                    return (
                        <PartCard 
                            key={part.partNumber}
                            part={part} 
                            available={available}
                            showAddToCart 
                            onAddToCart={(qty) => handleAddItem({partNumber: part.partNumber, quantity: qty})}
                        />

                    );
                })}
            </main>
        </div>
    );
}
