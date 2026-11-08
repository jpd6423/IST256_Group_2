/*
 * server.js - Node backend for Connect Summit 2026 (Billing + Returns)
 *
 * Uses only built-in Node modules, so there is nothing to npm install.
 *
 *   node server.js          (or: npm start)
 *
 * Endpoints:
 *   GET  /api/health    -> { status: "ok" }
 *   POST /api/billing   -> validates a billing JSON, stores it, returns { orderNumber }
 *   POST /api/returns   -> validates a return JSON, stores it, returns { returnId, status }
 *
 * Records are saved in ./data/billing-records.json and ./data/returns-records.json.
 * The server re-validates everything, because the front end can be bypassed.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const BILLING_FILE = path.join(DATA_DIR, "billing-records.json");
const RETURNS_FILE = path.join(DATA_DIR, "returns-records.json");
const MAX_BODY_BYTES = 100 * 1024;

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN",
    "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
    "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT",
    "VT", "VA", "WA", "WV", "WI", "WY"
];
const CARD_TYPES = ["Visa", "Mastercard", "American Express", "Discover"];
const REASONS = ["Damaged Product", "Wrong Item", "No Longer Needed", "Event Conflict", "Other"];
const CONDITIONS = ["New", "Opened", "Used", "Damaged", "Digital"];

// ---------- Storage ----------

function readRecords(file, key) {
    try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        return Array.isArray(data[key]) ? data[key] : [];
    } catch (error) {
        return []; // file missing or empty: start fresh
    }
}

function writeRecords(file, key, records) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const data = {};
    data[key] = records;
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ORD-100001, ORD-100002, ...
function nextId(prefix, records, field) {
    let highest = 100000;
    records.forEach(function (r) {
        const num = parseInt(String(r[field]).replace(prefix + "-", ""), 10);
        if (!isNaN(num) && num > highest) highest = num;
    });
    return prefix + "-" + (highest + 1);
}

// ---------- Helpers ----------

function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value, min, max) {
    return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

function isEmail(value) {
    return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value);
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

function sendJson(res, status, body) {
    res.writeHead(status, {
        "Content-Type": "application/json",
        // Open CORS so the pages can call this from Live Server (another port).
        // Restrict this to your real site address in production.
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end(JSON.stringify(body));
}

function readBody(req) {
    return new Promise(function (resolve, reject) {
        let body = "";
        req.on("data", function (chunk) {
            body += chunk;
            if (body.length > MAX_BODY_BYTES) {
                reject(new Error("too_large"));
                req.destroy();
            }
        });
        req.on("end", function () {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error("bad_json"));
            }
        });
        req.on("error", reject);
    });
}

// ---------- Billing validation ----------

function validateBilling(b) {
    const errors = [];
    if (!isObject(b)) return ["Body must be a JSON object."];

    // Full card numbers and CVVs must never reach the server
    const text = JSON.stringify(b).toLowerCase();
    if (text.indexOf("cardnumber\"") !== -1 || text.indexOf("securitycode") !== -1 || text.indexOf("cvv") !== -1) {
        return ["Do not send the full card number or security code. Send only the card type and last 4 digits."];
    }

    const c = b.customer;
    if (!isObject(c) || !isText(c.fullName, 3, 60)) errors.push("Customer name is invalid.");
    if (!isObject(c) || !isEmail(c.email)) errors.push("Customer email is invalid.");

    const a = b.billingAddress;
    if (!isObject(a) || !isText(a.street, 5, 100)) errors.push("Street address is invalid.");
    if (!isObject(a) || !isText(a.city, 2, 50)) errors.push("City is invalid.");
    if (!isObject(a) || US_STATES.indexOf(String(a.state).toUpperCase()) === -1) errors.push("State is invalid.");
    if (!isObject(a) || !/^\d{5}(-\d{4})?$/.test(String(a.zip))) errors.push("ZIP code is invalid.");

    const p = b.paymentMethod;
    if (!isObject(p)) {
        errors.push("Payment method is missing.");
    } else {
        if (CARD_TYPES.indexOf(p.cardType) === -1) errors.push("Card type is invalid.");
        if (!/^\d{4}$/.test(String(p.cardLast4))) errors.push("Card last 4 digits are invalid.");

        const match = /^(\d{2})\/(\d{2})$/.exec(String(p.expiration));
        if (!match || +match[1] < 1 || +match[1] > 12) {
            errors.push("Expiration date is invalid.");
        } else {
            const now = new Date();
            const year = 2000 + +match[2];
            const month = +match[1];
            if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
                errors.push("Card has expired.");
            }
        }
    }

    const o = b.order;
    if (!isObject(o) || !Array.isArray(o.items) || o.items.length === 0 || o.items.length > 50) {
        errors.push("Order must contain between 1 and 50 line items.");
    } else {
        let subtotal = 0;
        o.items.forEach(function (item) {
            const validItem = isObject(item) && isText(item.itemId, 1, 20) &&
                typeof item.itemPrice === "number" && item.itemPrice >= 0 &&
                Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 50;
            if (!validItem) {
                errors.push("An order item is invalid.");
            } else {
                subtotal += item.itemPrice * item.quantity;
            }
        });

        // Recompute totals so a tampered total is rejected
        if (errors.length === 0) {
            subtotal = round2(subtotal);
            const shipping = typeof o.shipping === "number" ? o.shipping : NaN;
            if (isNaN(shipping) || shipping < 0) errors.push("Shipping is invalid.");
            if (Math.abs(subtotal - o.subtotal) > 0.01) errors.push("Subtotal does not match the items.");
            if (Math.abs(round2(subtotal + shipping) - o.total) > 0.01) errors.push("Total does not match the items.");
        }
    }

    return errors;
}

// ---------- Returns validation ----------

function validateReturn(r) {
    const errors = [];
    if (!isObject(r)) return ["Body must be a JSON object."];

    const p = r.product;
    if (!isObject(p) || !isText(p.itemId, 1, 20) || !isText(p.itemTitle, 1, 100)) errors.push("Product is invalid.");
    if (!isObject(p) || typeof p.itemPrice !== "number" || p.itemPrice < 0) errors.push("Product price is invalid.");

    const c = r.customer;
    if (!isObject(c) || !isText(c.name, 2, 60)) errors.push("Customer name is invalid.");
    if (!isObject(c) || !isEmail(c.email)) errors.push("Customer email is invalid.");

    if (!/^ORD-\d{6}$/i.test(String(r.orderNumber))) errors.push("Order number must look like ORD-123456.");
    if (REASONS.indexOf(r.reason) === -1) errors.push("Reason for return is invalid.");
    if (CONDITIONS.indexOf(r.condition) === -1) errors.push("Product condition is invalid.");

    const comments = typeof r.comments === "string" ? r.comments.trim() : "";
    if (typeof r.comments !== "string" && r.comments !== undefined) errors.push("Comments are invalid.");
    if (comments.length > 500) errors.push("Comments must be 500 characters or less.");
    if (r.reason === "Other" && comments.length < 10) errors.push("Comments are required when the reason is Other.");

    if (isObject(p)) {
        const isTicket = p.itemCategory === "Ticket";
        if (isTicket && r.condition !== "Digital") errors.push("Tickets must use the Digital condition.");
        if (!isTicket && r.condition === "Digital") errors.push("Only tickets can use the Digital condition.");
    }

    return errors;
}

// ---------- Request handlers ----------

function handleBilling(body) {
    const errors = validateBilling(body);
    if (errors.length > 0) return { status: 400, body: { success: false, errors: errors } };

    const records = readRecords(BILLING_FILE, "billingRecords");
    const orderNumber = nextId("ORD", records, "orderNumber");

    // Store only what we validated (nothing extra from the client)
    records.push({
        orderNumber: orderNumber,
        customer: { fullName: body.customer.fullName.trim(), email: body.customer.email.toLowerCase() },
        billingAddress: {
            street: body.billingAddress.street.trim(),
            city: body.billingAddress.city.trim(),
            state: body.billingAddress.state.toUpperCase(),
            zip: body.billingAddress.zip
        },
        paymentMethod: {
            type: "Credit Card",
            cardType: body.paymentMethod.cardType,
            cardLast4: body.paymentMethod.cardLast4,
            expiration: body.paymentMethod.expiration
        },
        order: body.order,
        submittedAt: new Date().toISOString(),
        status: "Paid"
    });
    writeRecords(BILLING_FILE, "billingRecords", records);

    console.log("Billing saved: " + orderNumber);
    return { status: 201, body: { success: true, orderNumber: orderNumber, total: body.order.total } };
}

function handleReturn(body) {
    const errors = validateReturn(body);
    if (errors.length > 0) return { status: 400, body: { success: false, errors: errors } };

    const records = readRecords(RETURNS_FILE, "returnRequests");
    const returnId = nextId("RET", records, "returnId");

    records.push({
        returnId: returnId,
        product: body.product,
        customer: { name: body.customer.name.trim(), email: body.customer.email.toLowerCase() },
        orderNumber: String(body.orderNumber).toUpperCase(),
        reason: body.reason,
        condition: body.condition,
        comments: (body.comments || "").trim(),
        submittedAt: new Date().toISOString(),
        status: "Received"
    });
    writeRecords(RETURNS_FILE, "returnRequests", records);

    console.log("Return saved: " + returnId);
    return { status: 201, body: { success: true, returnId: returnId, status: "Received" } };
}

// ---------- Server ----------

const routes = {
    "/api/billing": handleBilling,
    "/api/returns": handleReturn
};

const server = http.createServer(function (req, res) {
    const url = req.url.split("?")[0];

    if (req.method === "OPTIONS") {
        sendJson(res, 204, {});
        return;
    }

    if (req.method === "GET" && url === "/api/health") {
        sendJson(res, 200, { status: "ok" });
        return;
    }

    const handler = routes[url];
    if (!handler) {
        sendJson(res, 404, { success: false, errors: ["Not found."] });
        return;
    }
    if (req.method !== "POST") {
        sendJson(res, 405, { success: false, errors: ["Use POST."] });
        return;
    }

    readBody(req)
        .then(function (body) {
            const result = handler(body);
            sendJson(res, result.status, result.body);
        })
        .catch(function (error) {
            if (error.message === "too_large") {
                sendJson(res, 413, { success: false, errors: ["Request is too large."] });
            } else if (error.message === "bad_json") {
                sendJson(res, 400, { success: false, errors: ["Body is not valid JSON."] });
            } else {
                console.error(error);
                sendJson(res, 500, { success: false, errors: ["Server error."] });
            }
        });
});

server.listen(PORT, function () {
    console.log("Connect Summit API running at http://localhost:" + PORT);
});
