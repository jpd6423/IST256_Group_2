require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("Missing MONGO_URI. Create a .env file (see .env.example).");
    process.exit(1);
}

// ---------- Middleware ----------
app.use(express.json({ limit: "100kb" }));                   // parse JSON bodies
app.use(express.static(path.join(__dirname, "public")));     // serve frontend files

// ---------- Routes ----------
app.get("/", function (req, res) {
    res.redirect("/web.html");
});

app.get("/api/health", function (req, res) {
    res.json({
        status: "ok",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
});


app.use("/api/attendees", require("./routes/attendees"));
app.use("/api/registrations", require("./routes/registrations"));
app.use("/api/billing", require("./routes/billing"));
app.use("/api/returns", require("./routes/returns"));


// TODO (later): app.use("/api/products", require("./routes/products")); etc.


app.use(function (err, req, res, next) {
    // Schema validation failed (bad email, missing field, etc.)
    if (err.name === "ValidationError") {
        const errors = {};
        for (const field in err.errors) {
            errors[field.split(".")[0]] = err.errors[field].message;
        }
        return res.status(400).json({ error: "Validation failed.", errors: errors });
    }
    // Unique index violated (email already registered)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        return res.status(409).json({
            error: "That " + field + " is already registered.",
            errors: { [field]: "This " + field + " is already in use." }
        });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
});


// ---------- Connect to MongoDB, then start the server ----------
mongoose
    .connect(MONGO_URI)
    .then(function () {
        console.log("Connected to MongoDB: " + mongoose.connection.name);
        app.listen(PORT, function () {
            console.log("Connect Summit server running at http://localhost:" + PORT);
        });
    })
    .catch(function (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });