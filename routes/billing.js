const express = require("express");
const Billing = require("../models/Billing");

const router = express.Router();

const SHIPPING_COST = 0; // tickets are digital, merchandise is picked up at the event

function roundMoney(amount) {
    return Math.round(amount * 100) / 100;
}

// Build the stored fields from the request body.
// The server recalculates the totals so the browser can't change the price.
function pickFields(body) {
    const customer = body.customer || {};
    const address = body.billingAddress || {};
    const payment = body.paymentMethod || {};
    const items = (body.order && Array.isArray(body.order.items)) ? body.order.items : [];

    const cleanItems = items.map(item => ({
        itemId: item.itemId,
        itemTitle: item.itemTitle,
        itemPrice: Number(item.itemPrice),
        quantity: Number(item.quantity)
    }));

    const subtotal = roundMoney(cleanItems.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0));

    return {
        customer: {
            fullName: customer.fullName,
            email: customer.email
        },
        billingAddress: {
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip
        },
        // Only the safe card fields. Anything else the browser sends is ignored.
        paymentMethod: {
            type: "Credit Card",
            cardType: payment.cardType,
            cardLast4: payment.cardLast4,
            expiration: payment.expiration
        },
        order: {
            items: cleanItems,
            subtotal: subtotal,
            shipping: SHIPPING_COST,
            total: roundMoney(subtotal + SHIPPING_COST)
        }
    };
}

// Make a new unique order number like ORD-482913
async function newOrderNumber() {
    let number;
    do {
        number = "ORD-" + Math.floor(100000 + Math.random() * 900000);
    } while (await Billing.exists({ orderNumber: number }));
    return number;
}

// READ - all orders (newest first). Optional filter: /api/billing?email=someone@psu.edu
router.get("/", async function (req, res) {
    const filter = {};
    if (req.query.email) filter["customer.email"] = String(req.query.email).trim().toLowerCase();

    const orders = await Billing.find(filter).sort({ createdAt: -1 });
    res.json(orders);
});

// READ - one order
router.get("/:orderNumber", async function (req, res) {
    const order = await Billing.findOne({ orderNumber: req.params.orderNumber.toUpperCase() });
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json(order);
});

// CREATE - complete a purchase
router.post("/", async function (req, res) {
    const data = pickFields(req.body);
    data.orderNumber = await newOrderNumber();
    data.status = "Paid";

    const order = await Billing.create(data);
    console.log("Created order:", order.orderNumber);
    res.status(201).json(order);
});

// UPDATE - change the billing contact, address, or status of an order.
// Items and card details are not editable after purchase.
router.put("/:orderNumber", async function (req, res) {
    const changes = {};
    const body = req.body;

    if (body.customer) {
        if (body.customer.fullName !== undefined) changes["customer.fullName"] = body.customer.fullName;
        if (body.customer.email !== undefined) changes["customer.email"] = body.customer.email;
    }
    if (body.billingAddress) {
        ["street", "city", "state", "zip"].forEach(function (field) {
            if (body.billingAddress[field] !== undefined) {
                changes["billingAddress." + field] = body.billingAddress[field];
            }
        });
    }
    if (body.status !== undefined) changes.status = body.status;

    if (Object.keys(changes).length === 0) {
        return res.status(400).json({ error: "Nothing to update." });
    }

    const order = await Billing.findOneAndUpdate(
        { orderNumber: req.params.orderNumber.toUpperCase() },
        { $set: changes },
        { returnDocument: "after", runValidators: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found." });
    console.log("Updated order:", order.orderNumber);
    res.json(order);
});

// DELETE
router.delete("/:orderNumber", async function (req, res) {
    const order = await Billing.findOneAndDelete({ orderNumber: req.params.orderNumber.toUpperCase() });
    if (!order) return res.status(404).json({ error: "Order not found." });
    console.log("Deleted order:", order.orderNumber);
    res.json({ message: "Order deleted.", orderNumber: order.orderNumber });
});

module.exports = router;
