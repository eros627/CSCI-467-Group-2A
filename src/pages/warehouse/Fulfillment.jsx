import './Fulfillment.css';
import OrderCard from '../../components/OrderCard';
import mockOrders from '../../data/mockOrders';
import { useState } from 'react';

export default function Fulfillment() {
    const [isOrderOpen, setIsOrderOpen] = useState(false);
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
                <div className="fulfillmentOverlay">
                    <header className="orderToFulfill">
                        <p className="fulfillmentTitle">Order Filling: ID</p>
                        <button className="backButton" onClick={() => setIsOrderOpen(false)}>
                            X
                        </button>
                    </header>
                    <p className="fulfillmentSection">Packing List:</p>
                    <p className="fulfillmentBody">Item 1 x 1</p>
                    <p className="fulfillmentBody">Item 2 x 1</p>
                    <p className="fulfillmentBody">Item 3 x 1</p>
                    <p className="fulfillmentSection">Invoice:</p>
                    <p className="fulfillmentBody">1 - Item 1: XX.XX</p>
                    <p className="fulfillmentBody">1 - Item 2: XX.XX</p>
                    <p className="fulfillmentBody">1 - Item 3: XX.XX</p>
                    <p className="fulfillmentBody">Amount: XX.XX</p>
                    <p className="fulfillmentBody">Shipping: XX.XX </p>
                    <p className="fulfillmentBody">Total: XX.XX</p>
                    <p className="fulfillmentSection">Shipping Label:</p>
                    <p className="fulfillmentBody">John Doe</p>
                    <p className="fulfillmentBody">123 Main St, DeKalb, IL 60155</p>
                    <p className="fulfillmentBody">Order confirmation will be sent to: johndoe@gmail.com</p>
                    <p className="fulfillmentSection">Order will be marked as fulfilled.</p>
                    <button>Fulfill Order</button>


                </div>
            )}        

            <h2>Orders awaiting fulfillment</h2>

            <div className="orderList">
                
                {mockOrders.map((order) => {
                    return (
                        <OrderCard 
                            key={order.no}
                            order={order}
                        />
                    );
                })}

            </div>


        </>
    );
}
