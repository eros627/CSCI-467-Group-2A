import './OrderResultCard.css';

export default function OrderResultCard({ order, onViewOrder }) {

    return (
        <div className="orderResultCard">
            <div className="orderResultInfo">
                <p>Order #{order.id}</p>
                <p>{new Date(order.date).toLocaleDateString()}</p>
                <p>{order.customerName}</p>
            </div>
            <div className="orderResultStatus">
                <p className={order.status === 'Shipped' ? 'statusShipped' : 'statusAuthorized'}>
                    {order.status}
                </p>
                <p>${order.total.toFixed(2)}</p>
            </div>
            <div className="viewOrder">
                <button className="viewButton" onClick={() => onViewOrder(order)}>
                    View
                </button>
            </div>
        </div>
    );
}
