/**
 * Tom Bernstein
 * CSCI 467 - 1
 * Group 2A Product System
 *
 * Description: Warehouse employee interface for order fulfillment.
 *****************************************************************************/
import './Fulfillment.css';
import OrderCard from '../../components/OrderCard';
import { useState, useEffect } from 'react';

export default function Fulfillment() {
    const [isOrderOpen, setIsOrderOpen] = useState(false);
    const [orderList, setOrderList] = useState([]);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [carrier, setCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [fulfillError, setFulfillError] = useState({code: '', message: ''});


    async function handleSelectOrder(id) {
        
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/warehouse/orders/${id}`,
            {
                headers: {
                    'X-API-KEY': import.meta.env.VITE_WAREHOUSE_API_KEY
                }
            });
            
            if (!res.ok) {
                throw new Error('Failed to load order detail');
            }

            const body = await res.json();

            setCurrentOrder(body.data);
            setIsOrderOpen(true);

        } catch(err) {
            console.error(err);
        }
    }

    async function handleFulfillOrder() {

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/warehouse/orders/${currentOrder.id}/ship`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-KEY': import.meta.env.VITE_WAREHOUSE_API_KEY
                    },
                    body: JSON.stringify( {carrier, trackingNumber} )
                });
            if (res.status === 200) {
                setOrderList(orderList.filter((o) => o.id !== currentOrder.id));
                setIsOrderOpen(false);
                setCarrier('');
                setTrackingNumber('');
            }
            else if (res.status === 409) {
                setFulfillError({
                    code: 409,
                    message: "This order could not be marked as shipped. It may have already been shipped, or the order list is out of date."});
            }
            else {
                setFulfillError({
                    code: 999,
                    message: "An error occurred, please try again."});
            }

        } catch(err) {
            console.error(err);
            setFulfillError({
                code: 999,
                message: "An error occurred, please try again."});
        }

    }

    function handlePrint(doc) {

        const win = window.open('', '_blank');
        win.document.write('Loading...');

        fetch(`${import.meta.env.VITE_API_URL}/api/warehouse/orders/${currentOrder.id}/${doc}`,
        {
            headers: {
                'X-API-KEY': import.meta.env.VITE_WAREHOUSE_API_KEY
            }
        })
            .then((res) => {
                if(!res.ok) {
                    throw new Error(`Failed to load ${doc}`);
                }
                return res.text();
            }) 
            .then((html) => {
                win.document.open();
                win.document.write(html);
                win.document.close();
            })
            .catch((err) => {
                console.error(err);
            });
    }

    useEffect(() => {

        async function loadOrders() {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/warehouse/orders/ready`,
                {
                    headers: {
                        'X-API-KEY': import.meta.env.VITE_WAREHOUSE_API_KEY
                    }
                }); 
                
                if (!res.ok) {
                    throw new Error("failed to load order list");
                }
                
                const body = await res.json();

                setOrderList(body.data);
            } catch(err) {
                console.error(err)
            }
        }

        loadOrders();

    }, []) 

    const isReadyToShip = carrier !== '' && trackingNumber !== '';

    return (
        <>        
            <div>
                <header className="fulfillmentHeader">
                    <h1>Auto Parts Warehouse</h1>
                </header>
            </div>

            {isOrderOpen && (
                <>
                    <div className="backdrop" onClick={() => setIsOrderOpen(false)}/>
                    <div className="fulfillmentOverlay">
                        <header className="orderToFulfill">
                            <p className="fulfillmentTitle">Order Filling: {currentOrder.orderNumber}</p>
                            <button className="backButton" onClick={() => setIsOrderOpen(false)}>
                                X
                            </button>
                        </header>
                        <div className="fulfillmentSectionRow">
                            <p className="fulfillmentSection">Packing List:</p>
                            <button onClick={() => handlePrint('packing-list')}>Print</button>
                        </div>
                        {currentOrder.items.map((item) => {
                            return <p 
                                className="fulfillmentBody"
                                key={item.partNumber}
                            >
                                {item.description} x {item.quantity}
                            </p>;
                        })}
                        <div className="fulfillmentSectionRow">
                            <p className="fulfillmentSection">Invoice:</p>
                            <button onClick={() => handlePrint('invoice')}>Print</button>
                        </div>
                        {currentOrder.items.map((item) => {
                            return <p 
                                className="fulfillmentBody"
                                key={item.partNumber}
                            >
                                {item.quantity} - {item.description}: {item.lineTotal.toFixed(2)}
                            </p>;
                        })}
                        <p className="fulfillmentBody">Amount: {currentOrder.subtotal.toFixed(2)}</p>
                        <p className="fulfillmentBody">Shipping: {currentOrder.shippingCharge.toFixed(2)} </p>
                        <p className="fulfillmentBody">Total: {currentOrder.totalAmount.toFixed(2)}</p>
                        <div className="fulfillmentSectionRow">
                            <p className="fulfillmentSection">Shipping Label:</p>
                            <button onClick={() => handlePrint('shipping-label')}>Print</button>
                        </div>
                        <p className="fulfillmentBody">{currentOrder.customer.name}</p>
                        <p className="fulfillmentBody">{currentOrder.customer.address.line1}</p>
                        {currentOrder.customer.address.line2 && (
                            <p className="fulfillmentBody">{currentOrder.customer.address.line2}</p>
                        )}
                        <p className="fulfillmentBody">
                            {currentOrder.customer.address.city}, {currentOrder.customer.address.state} {currentOrder.customer.address.postalCode}
                        </p>
                        <p className="fulfillmentBody">{currentOrder.customer.address.country}</p>
                        <p className="fulfillmentBody">Order confirmation will be sent to: {currentOrder.customer.email}</p>
                        <p className="fulfillmentSection">Order will be marked as fulfilled.</p>
                        <label className="fulfillmentBody">
                            Carrier:
                            <input type="text" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                        </label>
                        <label className="fulfillmentBody">
                            Tracking Number:
                            <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                        </label>
                        <button 
                            onClick={handleFulfillOrder}
                            disabled={!isReadyToShip}
                        >
                            Fulfill Order
                        </button>
                    </div>
                </>
            )}        

            {fulfillError.code !== '' && (
                <>
                    <div className="backdrop" onClick={() => setFulfillError({ code: '', message: '' })} />
                    <div className="errorOverlay">
                        <h2 className="errorHeader">Error</h2>
                        <div className="errorDetail">
                            <p>{orderError.message}</p>
                            <button onClick={() => setFulfillError({ code: '', message: '' })}>
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}


            <h2>Orders awaiting fulfillment</h2>

            <div className="orderList">
                
                {orderList.map((order) => {
                    return (
                        <OrderCard 
                            key={order.id}
                            order={order}
                            onCompleteOrder={(id) => handleSelectOrder(id)}
                        />
                    );
                })}

            </div>
        </>
    );
}
