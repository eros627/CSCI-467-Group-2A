/**
 * Tom Bernstein
 * CSCI 467 - 1
 * Group 2A Product System
 *
 * Description: Warehouse employee interface for order fulfillment.
 *****************************************************************************/
import './Fulfillment.css';
import OrderCard from '../../components/OrderCard';
import mockOrders from '../../data/mockOrders';
import mockParts from '../../data/mockParts';
import calculateShipping from '../../data/mockShipping';
import { useState } from 'react';

export default function Fulfillment() {
    const [isOrderOpen, setIsOrderOpen] = useState(false);
    const [orderList, setOrderList] = useState(mockOrders);
    const [currentOrder, setCurrentOrder] = useState(null)

    function handleSelectOrder(id) {
        setCurrentOrder(mockOrders.find(o => o.no === id));
        setIsOrderOpen(true);
    }
    

    const shippingCost = currentOrder !== null ? calculateShipping(currentOrder.totalWeight) : 0;
    

    return (
        <>        
            <div>
                <header className="fulfillmentHeader">
                    <h1>Auto Parts Warehouse</h1>
                    <button>Fulfillment</button>
                    <button>Receiving</button>
                </header>
            </div>

            {isOrderOpen && (
                <>
                    <div className="backdrop" onClick={() => setIsOrderOpen(false)}/>
                    <div className="fulfillmentOverlay">
                        <header className="orderToFulfill">
                            <p className="fulfillmentTitle">Order Filling: {currentOrder.no}</p>
                            <button className="backButton" onClick={() => setIsOrderOpen(false)}>
                                X
                            </button>
                        </header>
                        <p className="fulfillmentSection">Packing List:</p>
                        {currentOrder.packingList.map((item) => {
                            return <p className="fulfillmentBody">{item.description} x {item.qty}</p>;
                        })}
                        <p className="fulfillmentSection">Invoice:</p>
                        {currentOrder.packingList.map((item) => {
                            const part = mockParts.find(p => p.partNumber === item.partNumber);
                            const itemTotal = item.qty * part.price;
                            return <p className="fulfillmentBody">{item.qty} - {item.description}: {itemTotal.toFixed(2)}</p>;
                        })}
                        <p className="fulfillmentBody">Amount: {(currentOrder.totalPrice - shippingCost).toFixed(2)}</p>
                        <p className="fulfillmentBody">Shipping: {shippingCost} </p>
                        <p className="fulfillmentBody">Total: {currentOrder.totalPrice}</p>
                        <p className="fulfillmentSection">Shipping Label:</p>
                        <p className="fulfillmentBody">{currentOrder.shippingInfo.name}</p>
                        <p className="fulfillmentBody">{currentOrder.shippingInfo.address}</p>
                        <p className="fulfillmentBody">Order confirmation will be sent to: {currentOrder.shippingInfo.email}</p>
                        <p className="fulfillmentSection">Order will be marked as fulfilled.</p>
                        <button onClick={() => setIsOrderOpen(false)}>Fulfill Order</button>
                    </div>
                </>
            )}        

            <h2>Orders awaiting fulfillment</h2>

            <div className="orderList">
                
                {mockOrders.map((order) => {
                    return (
                        <OrderCard 
                            key={order.no}
                            order={order}
                            onCompleteOrder={(id) => handleSelectOrder(id)}
                        />
                    );
                })}

            </div>


        </>
    );
}
