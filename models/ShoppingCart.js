const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
    {
        itemId: { type: String, required: true, trim: true },
        quantity: {
            type: Number, required: true,
            min: [1, "Quantity must be at least 1."],
            max: [50, "Cart limit is 50 items."],
            validate: { validator: Number.isInteger, message: "Quantity must be a whole number." }
        }
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        cartId: { type: String, required: true, unique: true, trim: true },
        items: { type: [cartItemSchema], default: [] }
    },
    { timestamps: true }
);

module.exports = mongoose.model("ShoppingCart", cartSchema); // "shoppingcarts" collection