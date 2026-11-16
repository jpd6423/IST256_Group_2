const mongoose = require("mongoose");

const attendeeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required."],
            trim: true,
            match: [/^[A-Za-z][A-Za-z\s'-]{1,49}$/, "Enter your full name (letters only)."]
        },
        age: {
            type: Number,
            required: [true, "Age is required."],
            min: [13, "Age must be 13 or older."],
            max: [120, "Enter a realistic age."],
            validate: {
                validator: Number.isInteger,
                message: "Age must be a whole number."
            }
        },
        email: {
            type: String,
            required: [true, "Email is required."],
            trim: true,
            lowercase: true,
            unique: true, // no two attendees with the same email
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."]
        },
        address: {
            type: String,
            required: [true, "Address is required."],
            trim: true,
            minlength: [5, "Enter your address (at least 5 characters)."]
        }
    },
    { timestamps: true } // adds createdAt and updatedAt
);

// Mongoose stores this in the "attendees" collection
module.exports = mongoose.model("Attendee", attendeeSchema);