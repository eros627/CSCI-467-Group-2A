const mockOrders = [
    {
        no: 1,
        totalPrice: 76.98,
        totalWeight: 4.8,
        packingList: [
            {
                partNumber: 1,
                description: 'Brake Pad Set',
                qty: 1,
            },
            {
                partNumber: 2,
                description: 'Oil Filter',
                qty: 2,
            },
        ],
        shippingInfo: {
            name: 'John Doe',
            address: '123 Main St. Dekalb, IL 60155',
            email: 'john@doe.com',
        },
    },
];

export default mockOrders;
