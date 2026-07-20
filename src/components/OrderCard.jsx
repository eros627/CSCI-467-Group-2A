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
        onCompleteOrder(order.no);
    }

    return (
        
        <div className="orderCard">
            <div className="orderInfo">
                <p>Order Id: {order.no}</p>
                <p>{order.totalPrice}</p>
                <p>{order.totalWeight}</p>
            </div>
            <div className="completeOrder">
                <button className="completeButton" onClick={onCompleteClick}>Complete Order</button>
                    
            </div>
        </div>


    );
}
