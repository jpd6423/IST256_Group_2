// seed.js - Loads initial data from JSON files into MongoDB
// Signup data:        public/data.json         -> attendees
// Registration data:  public/registration.json -> registrations
// Product data:       public/productList.json  -> products
// Shopping Cart:      Creates demo-cart         -> shoppingcarts
// Run with: node seed.js
// Safe to run again without duplicating existing records.

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Attendee = require("./models/Attendee");
const Registration = require("./models/Registration");
const Product = require("./models/Product");
const ShoppingCart = require("./models/ShoppingCart");

// Read a JSON file and return its specified array
function readJson(fileName, arrayName = "registrations") {
    const filePath = path.join(__dirname, "public", fileName);

    const data = JSON.parse(
        fs.readFileSync(filePath, "utf8")
    );

    if (!Array.isArray(data[arrayName])) {
        throw new Error(
            fileName + ' must have an "' + arrayName + '" array.'
        );
    }

    return data[arrayName];
}

async function seed() {

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);

        console.log(
            "Connected to MongoDB: " + mongoose.connection.name
        );


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
                // Match by email to avoid duplicates
                await Attendee.findOneAndUpdate(
                    { email: record.email },
                    record,
                    {
                        upsert: true,
                        runValidators: true
                    }
                );

                attendeeCount++;

            } catch (error) {

                console.log(
                    "Skipped attendee " +
                    a.email + ": " + error.message
                );
            }
        }

        console.log(
            "Loaded " + attendeeCount + " of " +
            attendees.length + " attendees from data.json"
        );

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
                // Match by confirmation number
                await Registration.findOneAndUpdate(
                    {
                        confirmationNumber:
                            record.confirmationNumber
                    },
                    record,
                    {
                        upsert: true,
                        runValidators: true
                    }
                );

                registrationCount++;

            } catch (error) {

                console.log(
                    "Skipped registration " +
                    r.confirmationNumber + ": " +
                    error.message
                );
            }
        }

        console.log(
            "Loaded " + registrationCount + " of " +
            registrations.length +
            " registrations from registration.json"
        );

        const products = readJson("productList.json", "items");
        let productCount = 0;

        for (const p of products) {

            const record = {
                itemId: p.itemId,
                itemTitle: p.itemTitle,
                itemCategory: p.itemCategory,
                itemUnit: p.itemUnit,
                itemPrice: p.itemPrice,
                itemInfo: p.itemInfo || ""
            };

            try {
                
                await Product.updateOne(
                    { itemId: record.itemId },
                    {
                        $setOnInsert: record
                    },
                    {
                        upsert: true,
                        runValidators: true
                    }
                );

                productCount++;

            } catch (error) {

                console.log(
                    "Skipped product " +
                    p.itemId + ": " + error.message
                );
            }
        }

        console.log(
            "Checked " + productCount + " of " +
            products.length +
            " products from productList.json"
        );


        try {
    

            await ShoppingCart.updateOne(
                { cartId: "demo-cart" },
                {
                    $setOnInsert: {
                        cartId: "demo-cart",
                        items: []
                    }
                },
                {
                    upsert: true,
                    runValidators: true
                }
            );

            console.log(
                "Shopping cart initialized successfully!"
            );

        } catch (error) {

            console.log(
                "Shopping cart error: " + error.message
            );
        }

        console.log("Database seeding completed!");

    } finally {

        // Disconnect when seeding finishes
        await mongoose.disconnect();

        console.log("MongoDB disconnected.");
    }
}

// Run seed function
seed().catch(function (error) {

    console.error("Seeding failed:", error.message);

    process.exitCode = 1;
});