/**
 * Tom Bernstein
 * CSCI 467 - 1
 * Group 2A Product System
 *
 * Description: User interface for product catalog and ordering.
 *****************************************************************************/

import './Catalog.css';
import PartCard from '../../components/PartCard';
import { useState, useEffect } from 'react';

export default function Catalog() {
    //user action/view states
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isOrderSubmitted, setIsOrderSubmitted] = useState(false);

    //list states
    const [cartItems, setCartItems] = useState([]);
    const [allParts, setAllParts] = useState([]);
    const [partList, setPartList] = useState([]);

    //billing info value states
    const [shippingCost, setShippingCost] = useState(0);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [line1, setLine1] = useState('');
    const [line2, setLine2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [ccNumber, setCcNumber] = useState('');
    const [expMonth, setExpMonth] = useState('');
    const [expYear, setExpYear] = useState('');

    //order states
    const [orderResult, setOrderResult] = useState(null);
    const [orderError, setOrderError] = useState({ code: '', message: '' });

    useEffect(() => {
        async function loadParts() {
            try {
                const [first, second] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/api/products?limit=100&offset=0`),
                    fetch(`${import.meta.env.VITE_API_URL}/api/products?limit=100&offset=100`),
                ]);

                if (!first.ok || !second.ok) {
                    throw new Error('Failed to load product list');
                }

                const firstPage = await first.json();
                const secondPage = await second.json();

                const allProducts = [...firstPage.data, ...secondPage.data];

                setAllParts(allProducts);
                setPartList(allProducts);
            } catch (err) {
                console.error(err);
            }
        }
        loadParts();
    }, []);

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
        setPartList(allParts.filter((element) =>
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
    async function handleOrderSubmit() {
        const body = {
            customer: {
                name,
                email,
                address: { line1, line2, city, state, postalCode, country }
            },
            items: cartItems.map((item) => ({
                partNumber: item.partNumber,
                quantity: item.quantity
            })),
            payment: {
                cardNumber: ccNumber.replace(/-/g, ''),
                expirationDate: [expMonth, expYear].join('/'),
                cardholderName: name
            }
        };

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotency-Key': crypto.randomUUID()
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.status === 201 || res.status === 200) {
                setOrderResult(data.data);
                setIsOrderSubmitted(true);
                setIsCartOpen(false);
            } else if (res.status === 400) {
                setOrderError({
                    code: '400',
                    message: "There was a problem submitting your order. Please check billing details and try again."
                });
            } else if (res.status === 402) {
                setOrderError({
                    code: '402',
                    message: "Credit card declined."
                });
            } else if (res.status === 409) {
                setOrderError({
                    code: '409',
                    message: "This order could not be completed. It may already have been submitted, or an item may be out of stock"
                });
            } else if (res.status === 500) {
                setOrderError({
                    code: '500',
                    message: "We're sorry, something went wrong on our end. Please try again shortly."
                });
            } else {
                setOrderError({
                    code: '999',
                    message: "An error occured, please try again."
                });
            }
        } catch (err) {
            console.error(err);
            setOrderError({
                code: '999',
                message: "An error occured, please try again."
            });
        }
    }

    //resets billing fields and cart state upon order submission
    function handleResetInfo() {
        setName('');
        setEmail('');
        setLine1('');
        setLine2('');
        setCity('');
        setState('');
        setPostalCode('');
        setCountry('');
        setCcNumber('');
        setExpMonth('');
        setExpYear('');
        setCartItems([]);
        setIsOrderSubmitted(false);
    }

    const numItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const subtotal = cartItems.reduce((sum, item) => {
        const part = allParts.find(p => p.partNumber === item.partNumber);
        return sum + part.price * item.quantity
    }, 0);

    const totalWeight = cartItems.reduce((sum, item) => {
        const part = allParts.find(p => p.partNumber === item.partNumber);
        return sum + part.weight * item.quantity
    }, 0);

    useEffect(() => {
        if (totalWeight === 0) {
            setShippingCost(0);
            return;
        }

        let cancelled = false;

        async function loadShippingQuote() {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/shipping-quote?weight=${totalWeight}`);
                if (!res.ok) {
                    throw new Error('Failed to get shipping quote');
                }
                const data = await res.json();

                if (!cancelled) {
                    setShippingCost(data.charge); //TODO : replace field name with actual endpoint return when it exists
                }
            } catch (err) {
                console.error(err);
            }
        }
        loadShippingQuote();
        return () => { cancelled = true; };
    }, [totalWeight]);

    const orderTotal = subtotal + shippingCost;

    const isCcValid = /^\d{4}-\d{4}-\d{4}-\d{4}$/.test(ccNumber);

    const isExpValid = expMonth !== '' && expYear !== '';

    const isUserInfoValid = name !== '' &&
        email !== '' &&
        line1 !== '' &&
        city !== '' &&
        state !== '' &&
        postalCode !== '' &&
        country !== '';

    const isCheckoutReady = isCcValid && isExpValid && isUserInfoValid && cartItems.length > 0;

    return (
        <div>
            <header className="catalogHeader">
                <h1>Auto Parts Catalog</h1>
                <button onClick={() => setIsCartOpen(true)}>View Cart ({numItems})</button>
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
                            <button onClick={() => setIsCartOpen(false)}>
                                Close
                            </button>
                        </header>

                        <div className="cartItems">
                            {cartItems.map((item) => {
                                const part = allParts.find(p => p.partNumber === item.partNumber);
                                return (
                                    <div className="cartRow" key={item.partNumber}>
                                        <PartCard
                                            quantity={item.quantity}
                                            onQuantityChange={(newQty) => handleQuantityChange(item.partNumber, newQty)}
                                            part={part}
                                            available={part.availableQuantity}
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
                                <p>Shipping: ${shippingCost.toFixed(2)}</p>
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
                                    <span className="billLabel">Address Line 1:</span>
                                    <input
                                        type="text"
                                        className="billInput"
                                        placeholder="123 Main St."
                                        onChange={(e) => setLine1(e.target.value)}
                                        value={line1}
                                    />
                                </label>
                                <label className="billFormRow">
                                    <span className="billLabel">Address Line 2:</span>
                                    <input
                                        type="text"
                                        className="billInput"
                                        placeholder="Apt 1"
                                        onChange={(e) => setLine2(e.target.value)}
                                        value={line2}
                                    />
                                </label>
                                <label className="billFormRow">
                                    <span className="billLabel">City:</span>
                                    <input
                                        type="text"
                                        className="billInput"
                                        placeholder="Dekalb"
                                        onChange={(e) => setCity(e.target.value)}
                                        value={city}
                                    />
                                </label>
                                <label className="billFormRow">
                                    <span className="billLabel">State:</span>
                                    <input
                                        type="text"
                                        className="billInput"
                                        placeholder="IL"
                                        onChange={(e) => setState(e.target.value)}
                                        value={state}
                                    />
                                </label>
                                <label className="billFormRow">
                                    <span className="billLabel">Postal Code:</span>
                                    <input
                                        type="text"
                                        className="billInput"
                                        placeholder="60115"
                                        onChange={(e) => setPostalCode(e.target.value)}
                                        value={postalCode}
                                    />
                                </label>
                                <label className="billFormRow">
                                    <span className="billLabel">Country:</span>
                                    <input
                                        type="text"
                                        className="billInput"
                                        placeholder="United States"
                                        onChange={(e) => setCountry(e.target.value)}
                                        value={country}
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
                                        <option value="">YYYY</option>
                                        {Array.from({ length: 10 }, (_, i) => {
                                            const yy = String((new Date().getFullYear() + i));
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

            {orderError.code !== '' && (
                <>
                    <div className="backdrop" onClick={() => setOrderError({ code: '', message: '' })} />
                    <div className="errorOverlay">
                        <h2 className="errorHeader">Error</h2>
                        <div className="confirmDetail">
                            <p>{orderError.message}</p>
                            <button onClick={() => setOrderError({ code: '', message: '' })}>
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}

            {isOrderSubmitted && (
                <>
                    <div className="backdrop" onClick={handleResetInfo} />
                    <div className="submitOverlay">
                        <h2>Confirmation: Order No. {orderResult.orderNumber}</h2>
                        <div className="confirmDetail">
                            <p>Amount: {orderTotal.toFixed(2)}</p>
                            <p>Auth: {orderResult.payment.authorizationNumber}</p>
                            <p>For: {name}, {email}</p>
                        </div>
                        <p>Thank you for shopping with us.</p>
                        <button onClick={handleResetInfo}>
                            Return to Catalog
                        </button>
                    </div>
                </>
            )}

            <main className="productList">
                {partList.map((part) => {
                    const qtyInCart = cartItems.find(i => i.partNumber === part.partNumber)?.quantity || 0;
                    const available = part.availableQuantity - qtyInCart;
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
