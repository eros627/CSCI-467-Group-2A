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
    {
        no: 2,
        totalPrice: 250.99,
        totalWeight: 11.5,
        packingList: [
            {
                partNumber: 3,
                description: 'Alternator',
                qty: 1,
            },
            {
                partNumber: 6,
                description: 'Timing Belt',
                qty: 1,
            },
        ],
        shippingInfo: {
            name: 'Jane Smith',
            address: '456 Oak Ave. Sycamore, IL 60178',
            email: 'jane@smith.com',
        },
    },
    {
        no: 3,
        totalPrice: 82.99,
        totalWeight: 3.5,
        packingList: [
            {
                partNumber: 4,
                description: 'Spark Plug Set',
                qty: 2,
            },
            {
                partNumber: 8,
                description: 'Air Filter',
                qty: 1,
            },
            {
                partNumber: 2,
                description: 'Oil Filter',
                qty: 1,
            },
        ],
        shippingInfo: {
            name: 'Carlos Ramirez',
            address: '789 Pine St. Rockford, IL 61101',
            email: 'carlos.ramirez@example.com',
        },
    },
    {
        no: 4,
        totalPrice: 109.79,
        totalWeight: 7.4,
        packingList: [
            {
                partNumber: 7,
                description: 'Water Pump',
                qty: 1,
            },
            {
                partNumber: 5,
                description: 'Radiator Hose',
                qty: 2,
            },
        ],
        shippingInfo: {
            name: 'Emily Chen',
            address: '22 Maple Dr. Naperville, IL 60540',
            email: 'emily.chen@example.com',
        },
    },
    {
        no: 5,
        totalPrice: 178.72,
        totalWeight: 9.5,
        packingList: [
            {
                partNumber: 1,
                description: 'Brake Pad Set',
                qty: 2,
            },
            {
                partNumber: 6,
                description: 'Timing Belt',
                qty: 1,
            },
            {
                partNumber: 4,
                description: 'Spark Plug Set',
                qty: 1,
            },
        ],
        shippingInfo: {
            name: 'Marcus Webb',
            address: '10 Birch Ln. Aurora, IL 60502',
            email: 'marcus.webb@example.com',
        },
    },
    {
        no: 6,
        totalPrice: 73.49,
        totalWeight: 3.4,
        packingList: [
            {
                partNumber: 2,
                description: 'Oil Filter',
                qty: 3,
            },
            {
                partNumber: 8,
                description: 'Air Filter',
                qty: 2,
            },
        ],
        shippingInfo: {
            name: 'Priya Nair',
            address: '305 Cedar Ct. Elgin, IL 60120',
            email: 'priya.nair@example.com',
        },
    },
];

export default mockOrders;
