const express = require("express");
const mongoose = require("mongoose");
const Attendee = require("../models/Attendee");

const router = express.Router();

// Only allow the fields we expect (ignores anything extra sent by the browser)
function pickFields(body) {
    return {
        name: body.name,
        age: body.age,
        email: body.email,
        address: body.address
    };
}

// Reject ids that aren't valid MongoDB ObjectIds before querying
function checkId(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: "Invalid attendee id." });
    }
    next();
}

// READ - all attendees, oldest first
router.get("/", async function (req, res) {
    const attendees = await Attendee.find().sort({ createdAt: 1 });
    res.json(attendees);
});

// READ - one attendee
router.get("/:id", checkId, async function (req, res) {
    const attendee = await Attendee.findById(req.params.id);
    if (!attendee) return res.status(404).json({ error: "Attendee not found." });
    res.json(attendee);
});

// CREATE
router.post("/", async function (req, res) {
    const attendee = await Attendee.create(pickFields(req.body));
    console.log("Created attendee:", attendee.email);
    res.status(201).json(attendee);
});

// UPDATE
router.put("/:id", checkId, async function (req, res) {
    const attendee = await Attendee.findByIdAndUpdate(
        req.params.id,
        pickFields(req.body),
        { new: true, runValidators: true } // return updated doc + re-check rules
    );
    if (!attendee) return res.status(404).json({ error: "Attendee not found." });
    console.log("Updated attendee:", attendee.email);
    res.json(attendee);
});

// DELETE
router.delete("/:id", checkId, async function (req, res) {
    const attendee = await Attendee.findByIdAndDelete(req.params.id);
    if (!attendee) return res.status(404).json({ error: "Attendee not found." });
    console.log("Deleted attendee:", attendee.email);
    res.json({ message: "Attendee deleted.", id: attendee._id });
});

module.exports = router;