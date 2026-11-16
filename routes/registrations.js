const express = require("express");
const Registration = require("../models/Registration");

const router = express.Router();

const SESSION_TIMES = {
    "Opening Keynote": "9:00 AM - 10:00 AM",
    "Networking Workshop": "10:30 AM - 12:00 PM",
    "Panel Discussion": "1:00 PM - 2:30 PM",
    "Closing Social": "3:30 PM - 5:00 PM"
};

// Build the stored fields from the request. The server sets location and
// session times itself so the browser can't send mismatched values.
function pickFields(body) {
    const sessions = Array.isArray(body.sessions) ? body.sessions : [];
    return {
        name: body.name,
        email: body.email,
        participation: body.participation,
        location: body.participation === "Virtual"
            ? "Online (stream link sent by email)"
            : "Philadelphia, PA",
        date: "November 15, 2026",
        sessions: sessions.map(s => ({
            name: s.name,
            time: SESSION_TIMES[s.name] || s.time
        }))
    };
}

// Make a new unique confirmation number like CS26-482913
async function newConfirmationNumber() {
    let number;
    do {
        number = "CS26-" + Math.floor(100000 + Math.random() * 900000);
    } while (await Registration.exists({ confirmationNumber: number }));
    return number;
}

// READ - all registrations
router.get("/", async function (req, res) {
    const registrations = await Registration.find().sort({ createdAt: 1 });
    res.json(registrations);
});

// READ - one registration
router.get("/:confNumber", async function (req, res) {
    const registration = await Registration.findOne({ confirmationNumber: req.params.confNumber });
    if (!registration) return res.status(404).json({ error: "Registration not found." });
    res.json(registration);
});

// CREATE
router.post("/", async function (req, res) {
    const data = pickFields(req.body);
    data.confirmationNumber = await newConfirmationNumber();
    const registration = await Registration.create(data);
    console.log("Created registration:", registration.confirmationNumber);
    res.status(201).json(registration);
});

// UPDATE
router.put("/:confNumber", async function (req, res) {
    const registration = await Registration.findOneAndUpdate(
        { confirmationNumber: req.params.confNumber },
        pickFields(req.body),
        { new: true, runValidators: true }
    );
    if (!registration) return res.status(404).json({ error: "Registration not found." });
    console.log("Updated registration:", registration.confirmationNumber);
    res.json(registration);
});

// DELETE
router.delete("/:confNumber", async function (req, res) {
    const registration = await Registration.findOneAndDelete({ confirmationNumber: req.params.confNumber });
    if (!registration) return res.status(404).json({ error: "Registration not found." });
    console.log("Deleted registration:", registration.confirmationNumber);
    res.json({ message: "Registration deleted.", confirmationNumber: registration.confirmationNumber });
});

module.exports = router;