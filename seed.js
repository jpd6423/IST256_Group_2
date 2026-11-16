// seed.js - loads attendees and registrations from the JSON files into MongoDB
//   Signup data:        public/data.json          -> attendees collection
//   Registration data:  public/registration.json  -> registrations collection
// Run with:  node seed.js
// Safe to run again: existing records are updated instead of duplicated.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Attendee = require("./models/Attendee");
const Registration = require("./models/Registration");

// Read a JSON file and return its "registrations" array
function readJson(fileName) {
    const filePath = path.join(__dirname, "public", fileName);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(data.registrations)) {
        throw new Error(fileName + " must have a \"registrations\" array.");
    }
    return data.registrations;
}

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB: " + mongoose.connection.name);

    // ---------- Attendees (from data.json) ----------
    const attendees = readJson("data.json");
    let attendeeCount = 0;

    for (const a of attendees) {
        const record = {
            name: a.name,
            age: a.age,
            email: String(a.email).toLowerCase(),
            address: a.address
        };
        try {
            // Match by email so running this twice doesn't create duplicates
            await Attendee.findOneAndUpdate({ email: record.email }, record,
                { upsert: true, runValidators: true });
            attendeeCount++;
        } catch (error) {
            console.log("Skipped attendee " + a.email + ": " + error.message);
        }
    }
    console.log("Loaded " + attendeeCount + " of " + attendees.length + " attendees from data.json");

    // ---------- Registrations (from registration.json) ----------
    const registrations = readJson("registration.json");
    let registrationCount = 0;

    for (const r of registrations) {
        const record = {
            confirmationNumber: r.confirmationNumber,
            name: r.name,
            email: r.email,
            participation: r.participation,
            location: r.location,
            date: r.date,
            sessions: r.sessions
        };
        try {
            // Match by confirmation number so running this twice doesn't duplicate
            await Registration.findOneAndUpdate(
                { confirmationNumber: record.confirmationNumber }, record,
                { upsert: true, runValidators: true });
            registrationCount++;
        } catch (error) {
            console.log("Skipped registration " + r.confirmationNumber + ": " + error.message);
        }
    }
    console.log("Loaded " + registrationCount + " of " + registrations.length + " registrations from registration.json");

    await mongoose.disconnect();
}

seed().catch(function (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
});