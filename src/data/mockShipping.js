
const mockShippingBrackets = [
    { maxWeight : 5, cost: 5.99},
    { maxWeight : 15, cost: 9.99},
    { maxWeight : 30, cost: 15.99},
    { maxWeight : Infinity, cost: 24.99},
];


export default function calculateShipping(orderWeight){
    const bracket = mockShippingBrackets.find(b => orderWeight <= b.maxWeight);
    return bracket.cost;
}
