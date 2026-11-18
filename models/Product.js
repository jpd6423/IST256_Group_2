const mongoose = require("mongoose");

const CATEGORIES = ["Ticket", "Merchandise", "Food", "Swag", "Other"];
const UNITS = ["Each", "Pack", "Box", "Digital"];

const productSchema = new mongoose.Schema(
    {
        itemId: {
            type: String, required: [true, "Item ID is required."], unique: true,
            trim: true, uppercase: true,
            match: [/^[A-Z]{2,4}-\d{3}$/, "Use an ID such as TKT-001 or MER-001."]
        },
        itemTitle: {
            type: String, required: [true, "Title is required."], trim: true,
            minlength: [3, "Title must be between 3 and 60 characters."],
            maxlength: [60, "Title must be between 3 and 60 characters."]
        },
        itemCategory: {
            type: String, required: [true, "Category is required."],
            enum: { values: CATEGORIES, message: "Choose a valid category." }
        },
        itemUnit: {
            type: String, required: [true, "Unit is required."],
            enum: { values: UNITS, message: "Choose a valid unit." }
        },
        itemPrice: {
            type: Number, required: [true, "Price is required."],
            min: [0, "Price cannot be negative."], max: [10000, "Price must be $10,000 or less."]
        },
        itemInfo: { type: String, default: "", trim: true, maxlength: [50, "Additional info must be 50 characters or fewer."] }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema); // "products" collection