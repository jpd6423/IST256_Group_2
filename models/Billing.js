const mongoose = require("mongoose");

// NOTE: we never store the full card number or the security code (CVV).
// Only the card type, last 4 digits, and expiration date are saved.

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN",
    "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
    "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT",
    "VT", "VA", "WA", "WV", "WI", "WY"
];

// One line in the order (a ticket, a shirt, etc.)
const orderItemSchema = new mongoose.Schema(
    {
        itemId: { type: String, required: true, trim: true },
        itemTitle: { type: String, required: true, trim: true },
        itemPrice: { type: Number, required: true, min: [0, "Price cannot be negative."] },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity must be at least 1."],
            max: [50, "Quantity cannot be more than 50."]
        }
    },
    { _id: false }
);

const billingSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            match: [/^ORD-\d{6}$/, "Order number must look like ORD-123456."]
        },

        customer: {
            fullName: {
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

        billingAddress: {
            street: { type: String, required: [true, "Street address is required."], trim: true, maxlength: 100 },
            city: { type: String, required: [true, "City is required."], trim: true },
            state: {
                type: String,
                required: [true, "State is required."],
                uppercase: true,
                enum: { values: US_STATES, message: "Enter a valid 2-letter US state code." }
            },
            zip: {
                type: String,
                required: [true, "ZIP code is required."],
                match: [/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code."]
            }
        },

        paymentMethod: {
            type: { type: String, default: "Credit Card" },
            cardType: {
                type: String,
                required: true,
                enum: {
                    values: ["Visa", "Mastercard", "American Express", "Discover"],
                    message: "Card type must be Visa, Mastercard, American Express, or Discover."
                }
            },
            cardLast4: {
                type: String,
                required: true,
                match: [/^\d{4}$/, "Card last 4 must be exactly 4 digits."]
            },
            expiration: {
                type: String,
                required: true,
                match: [/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiration must be MM/YY."]
            }
        },

        order: {
            items: {
                type: [orderItemSchema],
                validate: {
                    validator: list => list.length > 0,
                    message: "The order must contain at least one item."
                }
            },
            subtotal: { type: Number, required: true, min: 0 },
            shipping: { type: Number, default: 0, min: 0 },
            total: { type: Number, required: true, min: 0 }
        },

        status: {
            type: String,
            default: "Paid",
            enum: {
                values: ["Paid", "Cancelled", "Refunded"],
                message: "Status must be Paid, Cancelled, or Refunded."
            }
        }
    },
    { timestamps: true } // adds createdAt and updatedAt
);

// Mongoose stores this in the "billings" collection
module.exports = mongoose.model("Billing", billingSchema);
