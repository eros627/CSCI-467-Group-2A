/**
 * Tom Bernstein
 * CSCI 467 - 1
 * Group 2A Product System
 *
 * Description: Order card used to populate the fulfillment interface. 
 *****************************************************************************/
import './OrderCard.css'
export default function OrderCard({ onCompleteOrder, order}) {

    function onCompleteClick() {
        onCompleteOrder(order.id);
    }

    return (
        
        <div className="orderCard">
            <div className="orderInfo">
                <p>Order Number: {order.orderNumber}</p>
                <p>${order.totalAmount.toFixed(2)}</p>
                <p>{order.totalWeight.toFixed(2)} lbs</p>
            </div>
            <div className="completeOrder">
                <button className="completeButton" onClick={onCompleteClick}>Complete Order</button>
                    
            </div>
        </div>


    );
}
