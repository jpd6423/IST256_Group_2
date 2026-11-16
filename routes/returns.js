const express = require("express");
const Return = require("../models/Return");
const Billing = require("../models/Billing");

const router = express.Router();

function pickFields(body) {
    const product = body.product || {};
    const customer = body.customer || {};

    return {
        orderNumber: String(body.orderNumber || "").trim().toUpperCase(),
        customer: {
            name: customer.name,
            email: customer.email
        },
        product: {
            itemId: product.itemId,
            itemTitle: product.itemTitle,
            itemCategory: product.itemCategory,
            itemPrice: Number(product.itemPrice),
            itemImage: product.itemImage || ""
        },
        reason: body.reason,
        condition: body.condition,
        comments: body.comments || ""
    };
}

// Make a new unique return ID like RET-482913
async function newReturnId() {
    let id;
    do {
        id = "RET-" + Math.floor(100000 + Math.random() * 900000);
    } while (await Return.exists({ returnId: id }));
    return id;
}

// READ - all returns (newest first).
// Optional filters: /api/returns?email=someone@psu.edu  or  ?orderNumber=ORD-100001
router.get("/", async function (req, res) {
    const filter = {};
    if (req.query.email) filter["customer.email"] = String(req.query.email).trim().toLowerCase();
    if (req.query.orderNumber) filter.orderNumber = String(req.query.orderNumber).trim().toUpperCase();

    const returns = await Return.find(filter).sort({ createdAt: -1 });
    res.json(returns);
});

// READ - one return
router.get("/:returnId", async function (req, res) {
    const ret = await Return.findOne({ returnId: req.params.returnId.toUpperCase() });
    if (!ret) return res.status(404).json({ error: "Return not found." });
    res.json(ret);
});

// CREATE - a new return request
router.post("/", async function (req, res) {
    const data = pickFields(req.body);

    // The order number must belong to a real order in the billings collection
    const order = await Billing.findOne({ orderNumber: data.orderNumber });
    if (!order) {
        return res.status(404).json({
            error: "Order " + (data.orderNumber || "") + " was not found.",
            errors: { orderNumber: "No order with that number. Check your purchase confirmation." }
        });
    }
    if (order.status === "Cancelled") {
        return res.status(400).json({
            error: "That order was cancelled, so it can't be returned.",
            errors: { orderNumber: "This order was cancelled." }
        });
    }

    data.returnId = await newReturnId();
    data.status = "Received";

    const ret = await Return.create(data);
    console.log("Created return:", ret.returnId, "for order", ret.orderNumber);
    res.status(201).json(ret);
});

// UPDATE - change the status (e.g. Approved, Refunded, Cancelled) or the details
router.put("/:returnId", async function (req, res) {
    const changes = {};
    ["status", "reason", "condition", "comments"].forEach(function (field) {
        if (req.body[field] !== undefined) changes[field] = req.body[field];
    });

    if (Object.keys(changes).length === 0) {
        return res.status(400).json({ error: "Nothing to update." });
    }

    const ret = await Return.findOneAndUpdate(
        { returnId: req.params.returnId.toUpperCase() },
        { $set: changes },
        { returnDocument: "after", runValidators: true }
    );
    if (!ret) return res.status(404).json({ error: "Return not found." });
    console.log("Updated return:", ret.returnId, "->", ret.status);
    res.json(ret);
});

// DELETE
router.delete("/:returnId", async function (req, res) {
    const ret = await Return.findOneAndDelete({ returnId: req.params.returnId.toUpperCase() });
    if (!ret) return res.status(404).json({ error: "Return not found." });
    console.log("Deleted return:", ret.returnId);
    res.json({ message: "Return deleted.", returnId: ret.returnId });
});

module.exports = router;
