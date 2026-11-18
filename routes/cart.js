const express = require("express");
const ShoppingCart = require("../models/ShoppingCart");
const Product = require("../models/Product");

const router = express.Router();
const MAX_CART_ITEMS = 50;

function checkCartId(req, res, next) {
    if (!/^[A-Za-z0-9-]{1,40}$/.test(req.params.cartId)) {
        return res.status(400).json({ error: "Invalid cart id." });
    }
    next();
}

// Attach title/price from the products collection (drops products that were deleted)
async function buildResponse(cart) {
    const products = await Product.find({ itemId: { $in: cart.items.map(i => i.itemId) } });
    const byId = {};
    products.forEach(p => { byId[p.itemId] = p; });

    const items = cart.items
        .filter(i => byId[i.itemId])
        .map(i => ({
            itemId: i.itemId,
            itemTitle: byId[i.itemId].itemTitle,
            itemCategory: byId[i.itemId].itemCategory,
            itemUnit: byId[i.itemId].itemUnit,
            itemPrice: byId[i.itemId].itemPrice,
            quantity: i.quantity
        }));
    return { cartId: cart.cartId, items: items };
}

// READ - get (or create) a cart
router.get("/:cartId", checkCartId, async function (req, res) {
    let cart = await ShoppingCart.findOne({ cartId: req.params.cartId });
    if (!cart) cart = await ShoppingCart.create({ cartId: req.params.cartId, items: [] });
    res.json(await buildResponse(cart));
});

// CREATE / UPDATE - replace the cart contents
router.put("/:cartId", checkCartId, async function (req, res) {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    const seen = new Set();
    let total = 0;
    for (const item of items) {
        const qty = Number(item.quantity);
        if (typeof item.itemId !== "string" || !Number.isInteger(qty) || qty < 1) {
            return res.status(400).json({ error: "Each cart item needs an itemId and a whole-number quantity of 1 or more." });
        }
        if (seen.has(item.itemId)) {
            return res.status(400).json({ error: "Duplicate item in cart: " + item.itemId });
        }
        seen.add(item.itemId);
        total += qty;
    }
    if (total > MAX_CART_ITEMS) {
        return res.status(400).json({ error: "Cart limit is " + MAX_CART_ITEMS + " items." });
    }

    const found = await Product.find({ itemId: { $in: [...seen] } });
    if (found.length !== seen.size) {
        return res.status(400).json({ error: "One of those products no longer exists." });
    }

    const cart = await ShoppingCart.findOneAndUpdate(
        { cartId: req.params.cartId },
        { $set: { items: items.map(i => ({ itemId: i.itemId, quantity: Number(i.quantity) })) } },
        { upsert: true, returnDocument: "after", runValidators: true }
    );
    console.log("Saved cart:", cart.cartId, "(" + total + " items)");
    res.json(await buildResponse(cart));
});

// DELETE - empty the cart
router.delete("/:cartId", checkCartId, async function (req, res) {
    await ShoppingCart.findOneAndUpdate({ cartId: req.params.cartId }, { $set: { items: [] } });
    res.json({ message: "Cart cleared.", cartId: req.params.cartId });
});

module.exports = router;