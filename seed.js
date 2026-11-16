// seed.js - loads the sample attendees and registrations into MongoDB
// Run once with:  node seed.js
// Safe to run again: it updates existing records instead of duplicating them.
require("dotenv").config();
const mongoose = require("mongoose");
const Attendee = require("./models/Attendee");
const Registration = require("./models/Registration");

const attendees = [
    { name: "John Miller",  age: 20, email: "johnm35@psu.edu",      address: "200 E Fairmount Ave, State College, PA" },
    { name: "Alex Johnson", age: 31, email: "alexjohn8@gmail.com",  address: "45 Maple St, Harrisburg, PA" },
    { name: "Marcus Lee",   age: 18, email: "marcus.lee@gmail.com", address: "800 N 3rd St, Philadelphia, PA" }
];

const registrations = [
    {
        confirmationNumber: "CS26-100001", name: "John Miller", email: "johnm35@psu.edu",
        participation: "In-Person", location: "Philadelphia, PA", date: "November 15, 2026",
        sessions: [
            { name: "Opening Keynote", time: "9:00 AM - 10:00 AM" },
            { name: "Panel Discussion", time: "1:00 PM - 2:30 PM" }
        ]
    },
    {
        confirmationNumber: "CS26-100002", name: "Alex Johnson", email: "alexjohn8@gmail.com",
        participation: "Virtual", location: "Online (stream link sent by email)", date: "November 15, 2026",
        sessions: [
            { name: "Networking Workshop", time: "10:30 AM - 12:00 PM" }
        ]
    },
    {
        confirmationNumber: "CS26-100003", name: "Marcus Lee", email: "marcus.lee@gmail.com",
        participation: "VIP", location: "Philadelphia, PA", date: "November 15, 2026",
        sessions: [
            { name: "Opening Keynote", time: "9:00 AM - 10:00 AM" },
            { name: "Networking Workshop", time: "10:30 AM - 12:00 PM" },
            { name: "Panel Discussion", time: "1:00 PM - 2:30 PM" },
            { name: "Closing Social", time: "3:30 PM - 5:00 PM" }
        ]
    }
];

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB: " + mongoose.connection.name);

    for (const a of attendees) {
        await Attendee.findOneAndUpdate({ email: a.email }, a, { upsert: true, runValidators: true });
    }
    console.log("Seeded " + attendees.length + " attendees");

    for (const r of registrations) {
        await Registration.findOneAndUpdate(
            { confirmationNumber: r.confirmationNumber }, r, { upsert: true, runValidators: true });
    }
    console.log("Seeded " + registrations.length + " registrations");

    await mongoose.disconnect();
}

seed().catch(function (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
});