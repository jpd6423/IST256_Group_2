const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const router = express.Router();

function pickFields(body) {
    return {
        itemId: body.itemId,
        itemTitle: body.itemTitle,
        itemCategory: body.itemCategory,
        itemUnit: body.itemUnit,
        itemPrice: Number(body.itemPrice),
        itemInfo: body.itemInfo || ""
    };
}

function checkId(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: "Invalid product id." });
    }
    next();
}

// READ - all products
router.get("/", async function (req, res) {
    res.json(await Product.find().sort({ itemId: 1 }));
});

// READ - one product
router.get("/:id", checkId, async function (req, res) {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json(product);
});

// CREATE
router.post("/", async function (req, res) {
    const product = await Product.create(pickFields(req.body));
    console.log("Created product:", product.itemId);
    res.status(201).json(product);
});

// UPDATE
router.put("/:id", checkId, async function (req, res) {
    const product = await Product.findByIdAndUpdate(
        req.params.id, pickFields(req.body),
        { returnDocument: "after", runValidators: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found." });
    console.log("Updated product:", product.itemId);
    res.json(product);
});

// DELETE
router.delete("/:id", checkId, async function (req, res) {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    console.log("Deleted product:", product.itemId);
    res.json({ message: "Product deleted.", id: product._id });
});

module.exports = router;