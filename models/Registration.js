const mongoose = require("mongoose");

// The four sessions offered at Connect Summit 2026
const SESSION_NAMES = [
    "Opening Keynote",
    "Networking Workshop",
    "Panel Discussion",
    "Closing Social"
];

// Each registration stores the sessions the attendee picked
const sessionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, enum: SESSION_NAMES },
        time: { type: String, required: true }
    },
    { _id: false } // no separate id for each session entry
);

const registrationSchema = new mongoose.Schema(
    {
        confirmationNumber: {
            type: String,
            required: true,
            unique: true,
            match: [/^CS26-\d{6}$/, "Confirmation number must look like CS26-123456."]
        },
        name: {
            type: String,
            required: [true, "Name is required."],
            trim: true,
            match: [/^[A-Za-z][A-Za-z\s'-]{1,49}$/, "Enter your full name (letters only)."]
        },
        email: {
            type: String,
            required: [true, "Email is required."],
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."]
        },
        participation: {
            type: String,
            required: [true, "Participation type is required."],
            enum: {
                values: ["In-Person", "Virtual", "VIP"],
                message: "Participation must be In-Person, Virtual, or VIP."
            }
        },
        location: { type: String, required: true },
        date: { type: String, default: "November 15, 2026" },
        sessions: {
            type: [sessionSchema],
            validate: {
                validator: list => list.length > 0,
                message: "Select at least one conference session."
            }
        }
    },
    { timestamps: true }
);

// Mongoose stores this in the "registrations" collection
module.exports = mongoose.model("Registration", registrationSchema);