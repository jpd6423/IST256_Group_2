const mongoose = require("mongoose");

const REASONS = ["Damaged Product", "Wrong Item", "No Longer Needed", "Event Conflict", "Other"];
const CONDITIONS = ["New", "Opened", "Used", "Damaged", "Digital"];
const STATUSES = ["Received", "Approved", "Rejected", "Refunded", "Cancelled"];

// The product being returned (copied from the order so it stays the same later)
const returnProductSchema = new mongoose.Schema(
    {
        itemId: { type: String, required: [true, "Select a product to return."], trim: true },
        itemTitle: { type: String, required: true, trim: true },
        itemCategory: { type: String, required: true, trim: true },
        itemPrice: { type: Number, required: true, min: 0 },
        itemImage: { type: String, default: "" }
    },
    { _id: false }
);

const returnSchema = new mongoose.Schema(
    {
        returnId: {
            type: String,
            required: true,
            unique: true,
            match: [/^RET-\d{6}$/, "Return ID must look like RET-123456."]
        },

        // Links this return to an order in the "billings" collection
        orderNumber: {
            type: String,
            required: [true, "Order number is required."],
            uppercase: true,
            trim: true,
            match: [/^ORD-\d{6}$/, "Order number must look like ORD-123456."]
        },

        customer: {
            name: {
                type: String,
                required: [true, "Full name is required."],
                trim: true,
                match: [/^[A-Za-z][A-Za-z\s.'-]{1,59}$/, "Enter your full name (letters only)."]
            },
            email: {
                type: String,
                required: [true, "Email is required."],
                trim: true,
                lowercase: true,
                match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."]
            }
        },

        product: { type: returnProductSchema, required: [true, "Select a product to return."] },

        reason: {
            type: String,
            required: [true, "Select a reason for the return."],
            enum: { values: REASONS, message: "Choose a valid return reason." }
        },

        condition: {
            type: String,
            required: [true, "Select the product condition."],
            enum: { values: CONDITIONS, message: "Choose a valid product condition." }
        },

        comments: {
            type: String,
            default: "",
            trim: true,
            maxlength: [500, "Comments must be 500 characters or less."]
        },

        status: {
            type: String,
            default: "Received",
            enum: { values: STATUSES, message: "Status must be one of: " + STATUSES.join(", ") + "." }
        }
    },
    { timestamps: true }
);

// Mongoose stores this in the "returns" collection
module.exports = mongoose.model("Return", returnSchema);
