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

// TODO (later): app.use("/api/products", require("./routes/products")); etc.

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