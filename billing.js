/*
 * billing.js - Billing Details page (client side)
 *
 * - Fills the order summary from the cart saved by cart.js (localStorage "checkoutCart"),
 *   or from a sample order if no cart was saved.
 * - Validates every field before submission.
 * - Builds the billing JSON (see billing.json for the shape) and sends it with
 *   jQuery AJAX to the Node backend (server.js).
 *
 * SECURITY NOTE: the full card number and CVV are validated here but are NEVER
 * put into the JSON or sent to the server. Only the card type and last 4 digits go out.
 *
 * Requires jQuery to be loaded before this file. Open with Live Server.
 */

$(document).ready(function () {

    const API_URL = "http://localhost:3000/api/billing";
    const CART_STORAGE_KEY = "checkoutCart";   // written by cart.js at checkout
    const LAST_ORDER_KEY = "lastBillingOrder"; // confirmation info for the page / returns

    const US_STATES = [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN",
        "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
        "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT",
        "VT", "VA", "WA", "WV", "WI", "WY"
    ];

    // Used only when nothing was saved by cart.js
    const SAMPLE_ORDER_ITEMS = [
        { itemId: "TKT-001", itemTitle: "General Admission Pass", itemPrice: 99, quantity: 1 },
        { itemId: "MER-001", itemTitle: "Connect Summit T-Shirt", itemPrice: 25, quantity: 1 },
        { itemId: "SWG-001", itemTitle: "Branded Notebook", itemPrice: 0, quantity: 1 }
    ];
    const SHIPPING_COST = 0; // tickets are digital, merchandise is picked up at the event

    const fieldIds = ["fullName", "email", "address", "city", "state", "zip",
        "cardNumber", "expiration", "securityCode"];

    let order = { items: [], subtotal: 0, shipping: SHIPPING_COST, total: 0 };

    // ---------- Helpers ----------

    function formatMoney(amount) {
        return "$" + Number(amount).toFixed(2);
    }

    function roundMoney(amount) {
        return Math.round(amount * 100) / 100;
    }

    function digitsOnly(text) {
        return String(text).replace(/\D/g, "");
    }

    function showStatus(message, type) {
        $("#billingStatus")
            .removeClass("d-none alert-success alert-danger alert-info")
            .addClass("alert-" + type)
            .text(message);
    }

    // ---------- Order summary ----------

    function loadOrder() {
        let items = SAMPLE_ORDER_ITEMS;

        try {
            const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
            if (saved && Array.isArray(saved.items) && saved.items.length > 0) {
                items = saved.items;
            }
        } catch (e) {
            // Corrupted saved cart: fall back to the sample order
        }

        let subtotal = 0;
        items.forEach(function (item) {
            subtotal += Number(item.itemPrice) * Number(item.quantity);
        });
        subtotal = roundMoney(subtotal);

        order = {
            items: items.map(function (item) {
                return {
                    itemId: item.itemId,
                    itemTitle: item.itemTitle,
                    itemPrice: Number(item.itemPrice),
                    quantity: Number(item.quantity)
                };
            }),
            subtotal: subtotal,
            shipping: SHIPPING_COST,
            total: roundMoney(subtotal + SHIPPING_COST)
        };
    }

    // Plain jQuery rendering. React can replace this later (see placeholder at the bottom).
    function renderOrderSummary() {
        const list = $("#orderItems");
        list.empty();

        order.items.forEach(function (item) {
            const left = $("<div></div>")
                .append($("<strong></strong>").text(item.itemTitle))
                .append($("<p></p>").addClass("text-muted mb-0").text("Quantity: " + item.quantity));
            const right = $("<span></span>").text(formatMoney(item.itemPrice * item.quantity));
            list.append($("<div></div>").addClass("order-item").append(left, right));
        });

        $("#orderSubtotal").text(formatMoney(order.subtotal));
        $("#orderShipping").text(formatMoney(order.shipping));
        $("#orderTotal").text(formatMoney(order.total));
    }

    // ---------- Card helpers ----------

    function getCardType(number) {
        if (/^4/.test(number)) return "Visa";
        if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(number)) return "Mastercard";
        if (/^3[47]/.test(number)) return "American Express";
        if (/^(6011|65)/.test(number)) return "Discover";
        return "Unknown";
    }

    // Luhn checksum: catches mistyped card numbers
    function passesLuhn(number) {
        let sum = 0;
        let doubleIt = false;
        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number.charAt(i), 10);
            if (doubleIt) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            doubleIt = !doubleIt;
        }
        return sum % 10 === 0;
    }

    // ---------- Validation rules ----------
    // Each rule returns "" when valid, or an error message.

    const rules = {
        fullName: function (v) {
            if (v === "") return "Full name is required.";
            if (!/^[A-Za-z][A-Za-z\s.'-]{1,59}$/.test(v)) return "Use 2-60 letters (spaces, apostrophes, periods and hyphens allowed).";
            if (v.indexOf(" ") === -1) return "Enter your first and last name.";
            return "";
        },

        email: function (v) {
            if (v === "") return "Email is required.";
            return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v) ? "" : "Enter a valid email address.";
        },

        address: function (v) {
            if (v === "") return "Street address is required.";
            if (v.length < 5) return "Enter your full street address (at least 5 characters).";
            if (v.length > 100) return "Address must be 100 characters or less.";
            if (!/\d/.test(v)) return "Address should include a street number.";
            return "";
        },

        city: function (v) {
            if (v === "") return "City is required.";
            return /^[A-Za-z][A-Za-z\s.'-]{1,49}$/.test(v) ? "" : "Enter a valid city name.";
        },

        state: function (v) {
            if (v === "") return "State is required.";
            if (!/^[A-Za-z]{2}$/.test(v)) return "Use the 2-letter state code (e.g. PA).";
            return US_STATES.indexOf(v.toUpperCase()) !== -1 ? "" : "Enter a valid US state code.";
        },

        zip: function (v) {
            if (v === "") return "ZIP code is required.";
            return /^\d{5}(-\d{4})?$/.test(v) ? "" : "Enter a 5-digit ZIP (or ZIP+4, e.g. 19104-1234).";
        },

        cardNumber: function (v) {
            const number = v.replace(/[\s-]/g, "");
            if (number === "") return "Card number is required.";
            if (!/^\d+$/.test(number)) return "Card number can only contain digits.";

            const type = getCardType(number);
            const expectedLength = type === "American Express" ? 15 : 16;
            if (number.length !== expectedLength) return "Card number must be " + expectedLength + " digits.";
            if (type === "Unknown") return "Card type not recognized (Visa, Mastercard, Amex, Discover).";
            return passesLuhn(number) ? "" : "Card number is not valid. Check for typos.";
        },

        expiration: function (v) {
            if (v === "") return "Expiration date is required.";
            const match = /^(\d{2})\/(\d{2})$/.exec(v);
            if (!match) return "Use the format MM/YY.";

            const month = parseInt(match[1], 10);
            const year = 2000 + parseInt(match[2], 10);
            if (month < 1 || month > 12) return "Month must be between 01 and 12.";

            // A card is valid through the last day of its expiration month
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            if (year < currentYear || (year === currentYear && month < currentMonth)) return "This card has expired.";
            if (year > currentYear + 10) return "Expiration year is too far in the future.";
            return "";
        },

        securityCode: function (v) {
            if (v === "") return "Security code is required.";
            if (!/^\d+$/.test(v)) return "Security code can only contain digits.";

            const isAmex = getCardType(digitsOnly($("#cardNumber").val())) === "American Express";
            const expectedLength = isAmex ? 4 : 3;
            return v.length === expectedLength ? "" : "Security code must be " + expectedLength + " digits.";
        }
    };

    function getValue(id) {
        return $("#" + id).val().trim();
    }

    // Bootstrap valid / invalid styling plus the message under the field
    function validateField(id) {
        const error = rules[id](getValue(id));
        const input = $("#" + id);

        input.toggleClass("is-invalid", error !== "");
        input.toggleClass("is-valid", error === "");

        let feedback = $("#" + id + "Error");
        if (feedback.length === 0) {
            feedback = $("<div></div>").attr("id", id + "Error").addClass("invalid-feedback");
            input.after(feedback);
        }
        feedback.text(error);
        return error === "";
    }

    function validateAll() {
        let firstBad = null;
        fieldIds.forEach(function (id) {
            if (!validateField(id) && firstBad === null) {
                firstBad = id;
            }
        });
        if (firstBad !== null) {
            $("#" + firstBad).trigger("focus");
        }
        return firstBad === null;
    }

    // ---------- Live input formatting ----------

    $("#cardNumber").on("input", function () {
        $(this).val(digitsOnly($(this).val()).slice(0, 16));
    });

    $("#securityCode").on("input", function () {
        $(this).val(digitsOnly($(this).val()).slice(0, 4));
    });

    $("#state").on("input", function () {
        $(this).val($(this).val().replace(/[^A-Za-z]/g, "").toUpperCase());
    });

    // Auto-insert the slash: 1225 -> 12/25
    $("#expiration").on("input", function () {
        let digits = digitsOnly($(this).val()).slice(0, 4);
        if (digits.length > 2) {
            digits = digits.slice(0, 2) + "/" + digits.slice(2);
        }
        $(this).val(digits);
    });

    // Validate on blur, then live while the field is marked
    fieldIds.forEach(function (id) {
        $("#" + id).on("blur", function () { validateField(id); });
        $("#" + id).on("input", function () {
            if ($(this).hasClass("is-invalid") || $(this).hasClass("is-valid")) {
                validateField(id);
            }
        });
    });

    // ---------- Build the JSON (matches billing.json) ----------

    function buildBillingJson() {
        const cardNumber = digitsOnly($("#cardNumber").val());

        return {
            customer: {
                fullName: getValue("fullName"),
                email: getValue("email").toLowerCase()
            },
            billingAddress: {
                street: getValue("address"),
                city: getValue("city"),
                state: getValue("state").toUpperCase(),
                zip: getValue("zip")
            },
            // Only safe fields. Never the full card number or the CVV.
            paymentMethod: {
                type: "Credit Card",
                cardType: getCardType(cardNumber),
                cardLast4: cardNumber.slice(-4),
                expiration: getValue("expiration")
            },
            order: order,
            submittedAt: new Date().toISOString()
        };
    }

    // ---------- AJAX: send the JSON to the Node backend ----------

    function sendBilling(billingData) {
        const button = $("#billingForm .billing-btn");
        button.prop("disabled", true).text("Processing...");
        showStatus("Sending your billing details...", "info");

        console.log("Billing JSON sent to the REST API:");
        console.log(JSON.stringify(billingData, null, 2));

        $.ajax({
            url: API_URL,
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(billingData),

            success: function (response) {
                showStatus("Purchase complete! Your order number is " + response.orderNumber +
                    ". Keep it for returns.", "success");

                try {
                    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({
                        orderNumber: response.orderNumber,
                        email: billingData.customer.email,
                        items: billingData.order.items
                    }));
                    localStorage.removeItem(CART_STORAGE_KEY);
                } catch (e) {
                    console.error(e);
                }

                $("#billingForm")[0].reset();
                $("#billingForm .is-valid, #billingForm .is-invalid").removeClass("is-valid is-invalid");
            },

            error: function (xhr) {
                let message = "Unable to process your order. Is the Node server running (npm start)?";
                if (xhr.responseJSON && xhr.responseJSON.errors) {
                    message = "The server rejected the order: " + xhr.responseJSON.errors.join(" ");
                }
                showStatus(message, "danger");
            },

            complete: function () {
                button.prop("disabled", false).text("Complete Purchase");
            }
        });
    }

    // ---------- Submit ----------

    $("#billingForm").attr("novalidate", "novalidate");

    $("#billingForm").on("submit", function (event) {
        event.preventDefault(); // always stop the browser's own submit

        if (!validateAll()) {
            showStatus("Please fix the highlighted fields before purchasing.", "danger");
            return;
        }
        if (order.items.length === 0) {
            showStatus("Your order is empty. Add items in the shopping cart first.", "danger");
            return;
        }

        sendBilling(buildBillingJson());
    });

    // ---------- Start ----------

    loadOrder();
    

    // ==========================================================
    // REACT PLACEHOLDER
    // ==========================================================
    // TODO (React): replace renderOrderSummary() with a React component that
    // renders into <div id="react-order-summary"></div>.
    //
    // Hooks for the React code to use:
    //   window.billingApp.getOrder()         -> the current order object
    //   window.billingApp.validateField(id)  -> validate one field, returns true/false
    //   window.billingApp.submit(json)       -> send a billing JSON through the same AJAX call
    //
    // Example (when React + Babel are loaded in billing.html):
    //   function OrderSummary() {
    //       const order = window.billingApp.getOrder();
    //       return <div>{order.items.map(i => <div key={i.itemId}>{i.itemTitle}</div>)}</div>;
    //   }
    //   ReactDOM.createRoot(document.getElementById("react-order-summary")).render(<OrderSummary />);
    window.billingApp = {
        getOrder: function () { return order; },
        validateField: validateField,
        submit: sendBilling
    };
});
