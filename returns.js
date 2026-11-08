/*
 * returns.js - Returns page (client side)
 *
 * - Loads purchased products from returns.json (name, image, price) with $.getJSON.
 * - jQuery search filters the product list as the customer types.
 * - Validates the return details before submission.
 * - Builds the returns JSON and sends it with jQuery AJAX to the Node backend (server.js).
 *
 * Requires jQuery to be loaded before this file. Open with Live Server
 * (getJSON does not work from file://).
 */

$(document).ready(function () {

    const API_URL = "http://localhost:3000/api/returns";
    const DATA_FILE = "returns.json";
    const LAST_ORDER_KEY = "lastBillingOrder"; // saved by billing.js after a purchase

    // Tiny gray placeholder used when an image file is missing
    const PLACEHOLDER_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">' +
        '<rect width="48" height="48" fill="#e6f0fa"/>' +
        '<text x="24" y="29" font-size="11" text-anchor="middle" fill="#003366">IMG</text></svg>');

    const ALLOWED_REASONS = ["Damaged Product", "Wrong Item", "No Longer Needed", "Event Conflict", "Other"];
    const ALLOWED_CONDITIONS = ["New", "Opened", "Used", "Damaged", "Digital"];
    const ORDER_PATTERN = /^ORD-\d{6}$/i; // same format the billing backend creates

    const fieldIds = ["customerName", "returnEmail", "orderNumber", "returnReason",
        "productCondition", "returnComments"];

    let products = [];
    let selectedProduct = null;

    // ---------- Helpers ----------

    function formatMoney(amount) {
        return "$" + Number(amount).toFixed(2);
    }

    function getValue(id) {
        return $("#" + id).val().trim();
    }

    function showStatus(message, type) {
        $("#returnsStatus")
            .removeClass("d-none alert-success alert-danger alert-info")
            .addClass("alert-" + type)
            .text(message);
    }

    // ---------- Load products from the JSON document ----------

    function loadProducts() {
        $.getJSON(DATA_FILE, function (data) {
            products = Array.isArray(data.purchasedProducts) ? data.purchasedProducts : [];
            displayProducts();
        }).fail(function () {
            showStatus("Could not load " + DATA_FILE + ". Open the page with Live Server.", "danger");
        });
    }

    // ---------- jQuery search + product table ----------

    function displayProducts() {
        const search = $("#productSearch").val().trim().toLowerCase();
        const body = $("#productTableBody");
        body.empty();

        let matches = 0;

        products.forEach(function (p) {
            const haystack = (p.itemId + " " + p.itemTitle + " " + p.itemCategory).toLowerCase();
            if (haystack.indexOf(search) === -1) {
                return;
            }
            matches++;

            const image = $("<img>")
                .attr({ src: p.itemImage, alt: p.itemTitle, width: 48, height: 48 })
                .addClass("rounded me-2")
                .css("object-fit", "cover")
                .on("error", function () {
                    $(this).off("error").attr("src", PLACEHOLDER_IMAGE);
                });

            const nameCell = $("<td></td>").append(
                $("<div></div>").addClass("d-flex align-items-center").append(
                    image,
                    $("<div></div>")
                        .append($("<strong></strong>").text(p.itemTitle))
                        .append($("<small></small>").addClass("d-block text-muted").text(p.itemId))
                )
            );

            const radio = $("<input>")
                .attr({ type: "radio", name: "returnProduct", value: p.itemId })
                .addClass("form-check-input")
                .prop("checked", selectedProduct !== null && selectedProduct.itemId === p.itemId)
                .on("change", function () {
                    selectProduct(p);
                });

            const row = $("<tr></tr>");
            row.append(nameCell);
            row.append($("<td></td>").text(p.itemCategory));
            row.append($("<td></td>").text(formatMoney(p.itemPrice)));
            row.append($("<td></td>").append(radio));
            body.append(row);
        });

        $("#noProductsMessage").toggleClass("d-none", matches !== 0);
    }

    $("#productSearch").on("input", displayProducts);

    // ---------- Selecting a product ----------

    function selectProduct(product) {
        selectedProduct = product;
        $("#productError").addClass("d-none").text("");

        updateSummary();

        // Digital passes only make sense as "Digital", physical items cannot be "Digital"
        if (fieldHasValue("productCondition")) {
            validateField("productCondition");
        }
    }

    function fieldHasValue(id) {
        return getValue(id) !== "";
    }

    // Right-hand Return Summary box
    function updateSummary(submittedId) {
        if (window.returnsApp && window.returnsApp.onUpdate) {
            window.returnsApp.onUpdate(submittedId || "");
        }
    }

    // ---------- Validation rules ----------
    // Each rule returns "" when valid, or an error message.

    const rules = {
        customerName: function (v) {
            if (v === "") return "Full name is required.";
            if (!/^[A-Za-z][A-Za-z\s.'-]{1,59}$/.test(v)) return "Use 2-60 letters (spaces, apostrophes, periods and hyphens allowed).";
            return "";
        },

        returnEmail: function (v) {
            if (v === "") return "Email is required.";
            return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v) ? "" : "Enter a valid email address.";
        },

        orderNumber: function (v) {
            if (v === "") return "Order number is required.";
            return ORDER_PATTERN.test(v) ? "" : "Use the format ORD-123456 (shown after your purchase).";
        },

        returnReason: function (v) {
            if (v === "") return "Please select a reason for the return.";
            return ALLOWED_REASONS.indexOf(v) !== -1 ? "" : "Choose a valid reason.";
        },

        productCondition: function (v) {
            if (v === "") return "Please select the product condition.";
            if (ALLOWED_CONDITIONS.indexOf(v) === -1) return "Choose a valid condition.";

            if (selectedProduct !== null) {
                const isTicket = selectedProduct.itemCategory === "Ticket";
                if (isTicket && v !== "Digital") return "Tickets are digital products. Choose \"Digital Product / Ticket\".";
                if (!isTicket && v === "Digital") return "This product is not digital. Choose its physical condition.";
            }
            return "";
        },

        returnComments: function (v) {
            if (v.length > 500) return "Comments must be 500 characters or less.";
            if (/<|>/.test(v)) return "Comments cannot contain < or >.";
            if (getValue("returnReason") === "Other" && v.length < 10) {
                return "Please explain your reason (at least 10 characters).";
            }
            return "";
        }
    };

    function validateField(id) {
        const error = rules[id](getValue(id));
        const input = $("#" + id);

        input.toggleClass("is-invalid", error !== "");
        input.toggleClass("is-valid", error === "" && getValue(id) !== "");

        let feedback = $("#" + id + "Error");
        if (feedback.length === 0) {
            feedback = $("<div></div>").attr("id", id + "Error").addClass("invalid-feedback");
            input.after(feedback);
        }
        feedback.text(error);
        return error === "";
    }

    function validateProduct() {
        if (selectedProduct === null) {
            $("#productError").removeClass("d-none").text("Select the product you want to return.");
            return false;
        }
        $("#productError").addClass("d-none").text("");
        return true;
    }

    function validateAll() {
        let ok = validateProduct();
        let firstBad = ok ? null : "productSearch";

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

    fieldIds.forEach(function (id) {
        $("#" + id).on("blur change", function () { validateField(id); });
        $("#" + id).on("input", function () {
            if ($(this).hasClass("is-invalid") || $(this).hasClass("is-valid")) {
                validateField(id);
            }
        });
    });

    // "Other" makes comments mandatory, so re-check comments when the reason changes
    $("#returnReason").on("change", function () {
        if ($("#returnComments").hasClass("is-invalid") || $("#returnComments").hasClass("is-valid")) {
            validateField("returnComments");
        }
    });

    // ---------- Build the JSON (matches returns.json "returnRequests") ----------

    function buildReturnJson() {
        return {
            product: {
                itemId: selectedProduct.itemId,
                itemTitle: selectedProduct.itemTitle,
                itemCategory: selectedProduct.itemCategory,
                itemPrice: selectedProduct.itemPrice,
                itemImage: selectedProduct.itemImage
            },
            customer: {
                name: getValue("customerName"),
                email: getValue("returnEmail").toLowerCase()
            },
            orderNumber: getValue("orderNumber").toUpperCase(),
            reason: getValue("returnReason"),
            condition: getValue("productCondition"),
            comments: getValue("returnComments"),
            submittedAt: new Date().toISOString()
        };
    }

    // ---------- AJAX: send the JSON to the Node backend ----------

    function sendReturn(returnData) {
        const button = $("#returnsForm .returns-btn");
        button.prop("disabled", true).text("Submitting...");
        showStatus("Sending your return request...", "info");

        console.log("Returns JSON sent to the REST API:");
        console.log(JSON.stringify(returnData, null, 2));

        $.ajax({
            url: API_URL,
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(returnData),

            success: function (response) {
                showStatus("Return request " + response.returnId + " received. Status: " + response.status + ".", "success");
                updateSummary(response.returnId);

                $("#returnsForm")[0].reset();
                $("#returnsForm .is-valid, #returnsForm .is-invalid").removeClass("is-valid is-invalid");
                selectedProduct = null;
                displayProducts();
            },

            error: function (xhr) {
                let message = "Unable to submit your return. Is the Node server running (npm start)?";
                if (xhr.responseJSON && xhr.responseJSON.errors) {
                    message = "The server rejected the return: " + xhr.responseJSON.errors.join(" ");
                }
                showStatus(message, "danger");
            },

            complete: function () {
                button.prop("disabled", false).text("Submit Return Request");
            }
        });
    }

    // ---------- Submit ----------

    $("#returnsForm").attr("novalidate", "novalidate");

    $("#returnsForm").on("submit", function (event) {
        event.preventDefault(); // always stop the browser's own submit

        if (!validateAll()) {
            showStatus("Please fix the highlighted fields before submitting.", "danger");
            return;
        }

        sendReturn(buildReturnJson());
    });

    // ---------- Start ----------

    // If the shopper just bought something, pre-fill the order number and email
    try {
        const last = JSON.parse(localStorage.getItem(LAST_ORDER_KEY));
        if (last && last.orderNumber) {
            $("#orderNumber").val(last.orderNumber);
            if (last.email) $("#returnEmail").val(last.email);
        }
    } catch (e) {
        // Nothing saved, nothing to pre-fill
    }

    loadProducts();
    updateSummary();

    // ==========================================================
    // REACT PLACEHOLDER
    // ==========================================================
    // TODO (React): replace updateSummary() with a React component that renders
    // into <div id="react-return-summary"></div> and shows the selected product,
    // its price, and the return status.
    //
    // Hooks for the React code to use:
    //   window.returnsApp.getSelectedProduct() -> the selected product object (or null)
    //   window.returnsApp.getProducts()        -> the loaded product list
    //   window.returnsApp.submit(json)         -> send a returns JSON through the same AJAX call
    //
    // Example (when React + Babel are loaded in returns.html):
    //   function ReturnSummary() {
    //       const p = window.returnsApp.getSelectedProduct();
    //       return <p>{p ? p.itemTitle : "None selected"}</p>;
    //   }
    //   ReactDOM.createRoot(document.getElementById("react-return-summary")).render(<ReturnSummary />);
    window.returnsApp = {
        getSelectedProduct: function () { return selectedProduct; },
        getProducts: function () { return products; },
        submit: sendReturn
    };
});
