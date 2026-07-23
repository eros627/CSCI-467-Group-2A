import './OrderResultCard.css';

export default function OrderResultCard({ order, onViewOrder }) {

    return (
        <div className="orderResultCard">
            <div className="orderResultInfo">
                <p>Order #{order.orderNumber}</p>
                <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                <p>{order.customer.name}</p>
            </div>
            <div className="orderResultStatus">
                <p className={order.status === 'SHIPPED' ? 'statusShipped' : 'statusAuthorized'}>
                    {order.status}
                </p>
                <p>${order.totalAmount.toFixed(2)}</p>
            </div>
            <div className="viewOrder">
                <button className="viewButton" onClick={() => onViewOrder(order)}>
                    View
                </button>
            </div>
        </div>
    );
}
