require("dotenv").config();
const mongoose = require("mongoose");
const Billing = require("./models/Billing");
const Return = require("./models/Return");

const orders = [
    {
        orderNumber: "ORD-100001",
        customer: { fullName: "John Miller", email: "johnm35@psu.edu" },
        billingAddress: { street: "200 E Fairmount Ave", city: "State College", state: "PA", zip: "16801" },
        paymentMethod: { type: "Credit Card", cardType: "Visa", cardLast4: "1111", expiration: "12/29" },
        order: {
            items: [
                { itemId: "TKT-001", itemTitle: "General Admission Pass", itemPrice: 99, quantity: 1 },
                { itemId: "MER-001", itemTitle: "Connect Summit T-Shirt", itemPrice: 25, quantity: 1 }
            ],
            subtotal: 124, shipping: 0, total: 124
        },
        status: "Paid"
    },
    {
        orderNumber: "ORD-100002",
        customer: { fullName: "Alex Johnson", email: "alexjohn8@gmail.com" },
        billingAddress: { street: "45 Maple St", city: "Harrisburg", state: "PA", zip: "17101" },
        paymentMethod: { type: "Credit Card", cardType: "Mastercard", cardLast4: "4444", expiration: "08/28" },
        order: {
            items: [
                { itemId: "TKT-003", itemTitle: "Student Pass", itemPrice: 35, quantity: 1 },
                { itemId: "MER-003", itemTitle: "Insulated Water Bottle", itemPrice: 18.5, quantity: 2 }
            ],
            subtotal: 72, shipping: 0, total: 72
        },
        status: "Paid"
    }
];

const returns = [
    {
        returnId: "RET-100001",
        orderNumber: "ORD-100002",
        customer: { name: "Alex Johnson", email: "alexjohn8@gmail.com" },
        product: {
            itemId: "MER-003", itemTitle: "Insulated Water Bottle", itemCategory: "Merchandise",
            itemPrice: 18.5, itemImage: "images/mer-003.jpg"
        },
        reason: "Damaged Product",
        condition: "Damaged",
        comments: "The lid arrived cracked.",
        status: "Received"
    }
];

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB: " + mongoose.connection.name);

    for (const o of orders) {
        await Billing.findOneAndUpdate({ orderNumber: o.orderNumber }, o, { upsert: true, runValidators: true });
    }
    console.log("Seeded " + orders.length + " orders (billings collection)");

    for (const r of returns) {
        await Return.findOneAndUpdate({ returnId: r.returnId }, r, { upsert: true, runValidators: true });
    }
    console.log("Seeded " + returns.length + " returns (returns collection)");

    await mongoose.disconnect();
}

seed().catch(function (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
});
