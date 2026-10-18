let items = [];

// Allowed dropdown values (must match the <option> values in product.html)
const ALLOWED_CATEGORIES = ["Ticket", "Merchandise", "Food", "Swag", "Other"];
const ALLOWED_UNITS = ["Each", "Pack", "Box", "Digital"];

// Validation limits
const MAX_TITLE_LENGTH = 60;
const MIN_TITLE_LENGTH = 3;
const MAX_INFO_LENGTH = 50;
const MAX_PRICE = 10000;
const ID_PATTERN = /^[A-Za-z]{2,4}-\d{3}$/; // e.g. TKT-001, FD-002

// Load the items, then build the table.
// If the items are already in localStorage, use those. Otherwise, load from productList.json.
function loadItems() {
    let saved = localStorage.getItem("localItems");

    if (saved !== null) {
        items = JSON.parse(saved).items;
        renderTable();
        return;
    }

    fetch("productList.json")
        .then(function (response) {
            return response.json();   // turns the JSON text into a JavaScript object
        })
        .then(function (data) {
            items = data.items;
            renderTable();
        })
}

// Convert items array to JSON
function saveItems() {
    let data = { items: items };
    localStorage.setItem("localItems", JSON.stringify(data));
}

// Page elements

let form = document.getElementById("productForm");
let tableBody = document.getElementById("itemsTableBody");
let itemCount = document.getElementById("itemCount");
let emptyMessage = document.getElementById("emptyMessage");

let fieldIds = ["itemId", "itemTitle", "itemCategory", "itemUnit", "itemPrice", "itemInfo"];

// Dynamic rendering

function formatPrice(price) {
    return "$" + Number(price).toFixed(2);
}

// Create a <td> with plain text
function makeCell(text) {
    let td = document.createElement("td");
    td.textContent = text;
    return td;
}

// Rebuild the table from the items array
function renderTable() {
    tableBody.innerHTML = "";

    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        let row = document.createElement("tr");

        row.appendChild(makeCell(item.itemId));
        row.appendChild(makeCell(item.itemTitle));
        row.appendChild(makeCell(item.itemCategory));
        row.appendChild(makeCell(item.itemUnit));
        row.appendChild(makeCell(formatPrice(item.itemPrice)));

        if (item.itemInfo === "") {
            row.appendChild(makeCell("\u2014"));
        } else {
            row.appendChild(makeCell(item.itemInfo));
        }

        //Edit/Delete buttons added with jQuery
        let actions = document.createElement("td");
        actions.className = "text-end";
        row.appendChild(actions);

        tableBody.appendChild(row);
    }

    itemCount.textContent = items.length;

    if (items.length === 0) {
        emptyMessage.classList.remove("d-none");
    } else {
        emptyMessage.classList.add("d-none");
    }
}

// ==========================================================
// Validation
// ==========================================================

function showError(fieldId, message) {
    document.getElementById(fieldId).classList.add("is-invalid");
    document.getElementById(fieldId + "Error").textContent = message;
}

function clearError(fieldId) {
    document.getElementById(fieldId).classList.remove("is-invalid");
    document.getElementById(fieldId + "Error").textContent = "";
}

function clearAllErrors() {
    for (let i = 0; i < fieldIds.length; i++) {
        clearError(fieldIds[i]);
    }
}

// Returns true if another item (other than the one being edited) already uses this ID
function idExists(id, editingId) {
    for (let i = 0; i < items.length; i++) {
        let sameId = items[i].itemId.toUpperCase() === id.toUpperCase();
        let isItemBeingEdited = editingId && items[i].itemId.toUpperCase() === editingId.toUpperCase();
        if (sameId && !isItemBeingEdited) {
            return true;
        }
    }
    return false;
}

// Validates the whole form.
// editingId: pass the ID of the item being edited so it doesn't count as a duplicate of itself.
function validateForm(editingId) {
    let isValid = true;
    clearAllErrors();

    let id = document.getElementById("itemId").value.trim();
    let title = document.getElementById("itemTitle").value.trim();
    let category = document.getElementById("itemCategory").value;
    let unit = document.getElementById("itemUnit").value;
    let priceText = document.getElementById("itemPrice").value.trim();
    let info = document.getElementById("itemInfo").value.trim();

    // Item ID: required, no spaces, correct format, must be unique
    if (id === "") {
        showError("itemId", "Item ID required.");
        isValid = false;
    } else if (id.indexOf(" ") !== -1) {
        showError("itemId", "Item ID cannot contain spaces.");
        isValid = false;
    } else if (!ID_PATTERN.test(id)) {
        showError("itemId", "Use 2-4 letters, a dash, then 3 digits (e.g. TKT-001).");
        isValid = false;
    } else if (idExists(id, editingId)) {
        showError("itemId", "An item with this ID already exists.");
        isValid = false;
    }

    // Title: required, 3-60 characters
    if (title === "") {
        showError("itemTitle", "Item title required.");
        isValid = false;
    } else if (title.length < MIN_TITLE_LENGTH) {
        showError("itemTitle", "Item title must be at least " + MIN_TITLE_LENGTH + " characters.");
        isValid = false;
    } else if (title.length > MAX_TITLE_LENGTH) {
        showError("itemTitle", "Item title must be " + MAX_TITLE_LENGTH + " characters or fewer.");
        isValid = false;
    }

    // Category and Unit: must pick one of the allowed options
    if (category === "") {
        showError("itemCategory", "Category field required.");
        isValid = false;
    } else if (ALLOWED_CATEGORIES.indexOf(category) === -1) {
        showError("itemCategory", "Choose a valid category.");
        isValid = false;
    }

    if (unit === "") {
        showError("itemUnit", "Unit field required.");
        isValid = false;
    } else if (ALLOWED_UNITS.indexOf(unit) === -1) {
        showError("itemUnit", "Choose a valid unit.");
        isValid = false;
    }

    // Price: required, a number, between 0 and MAX_PRICE, at most 2 decimal places
    if (priceText === "") {
        showError("itemPrice", "Price required.");
        isValid = false;
    } else {
        let price = Number(priceText);
        if (isNaN(price)) {
            showError("itemPrice", "Price must be a number.");
            isValid = false;
        } else if (price < 0) {
            showError("itemPrice", "Price cannot be negative.");
            isValid = false;
        } else if (price > MAX_PRICE) {
            showError("itemPrice", "Price cannot exceed $" + MAX_PRICE.toLocaleString() + ".");
            isValid = false;
        } else if (!/^\d+(\.\d{1,2})?$/.test(priceText)) {
            showError("itemPrice", "Price can have at most 2 decimal places.");
            isValid = false;
        }
    }

    // Additional info: optional, max 50 characters
    if (info.length > MAX_INFO_LENGTH) {
        showError("itemInfo", "Additional info must be " + MAX_INFO_LENGTH + " characters or fewer.");
        isValid = false;
    }

    return isValid;
}

// Adding items

function handleSubmit(event) {
    event.preventDefault();

    // While editing, the jQuery update handler below takes over
    if (document.getElementById("editIndex").value !== "") {
        return;
    }

    if (!validateForm("")) {
        return;
    }

    let newItem = {
        itemId: document.getElementById("itemId").value.trim().toUpperCase(),
        itemTitle: document.getElementById("itemTitle").value.trim(),
        itemCategory: document.getElementById("itemCategory").value,
        itemUnit: document.getElementById("itemUnit").value,
        itemPrice: parseFloat(document.getElementById("itemPrice").value),
        itemInfo: document.getElementById("itemInfo").value.trim()
    };

    items.push(newItem);
    saveItems();
    renderTable();

    form.reset();
    clearAllErrors();
}

// Event listeners & start-up

form.addEventListener("submit", handleSubmit);

// Clear error message when user changes it
for (let i = 0; i < fieldIds.length; i++) {
    let field = document.getElementById(fieldIds[i]);
    // Selects fire "change"; text/number inputs fire "input"
    field.addEventListener("input", function (event) {
        clearError(event.target.id);
    });
    field.addEventListener("change", function (event) {
        clearError(event.target.id);
    });
}

loadItems();

$(document).ready(function () {


    $("#searchInput").on("input", function () {

        let searchText = $(this).val().toLowerCase();

        $("#itemsTableBody tr").each(function () {

            let rowText = $(this).text().toLowerCase();

            if (rowText.includes(searchText)) {
                $(this).show();
            } else {
                $(this).hide();
            }

        });

    });




    function addActionButtons() {

        $("#itemsTableBody tr").each(function () {

            let row = $(this);
            let itemId = row.find("td:first").text();

            let actions = row.find("td:last");

            actions.empty();

            let editButton = $("<button>")
                .text("Edit")
                .addClass("btn btn-primary btn-sm me-2 edit-btn")
                .attr("data-id", itemId);

            let deleteButton = $("<button>")
                .text("Delete")
                .addClass("btn btn-danger btn-sm delete-btn")
                .attr("data-id", itemId);

            actions.append(editButton, deleteButton);

        });

    }



    $("#itemsTableBody").on("click", ".edit-btn", function () {

        let id = $(this).attr("data-id");

        let item = items.find(function (product) {
            return product.itemId === id;
        });

        if (item) {

            $("#itemId").val(item.itemId).prop("readonly", true);

            $("#itemTitle").val(item.itemTitle);
            $("#itemCategory").val(item.itemCategory);
            $("#itemUnit").val(item.itemUnit);
            $("#itemPrice").val(item.itemPrice);
            $("#itemInfo").val(item.itemInfo);

            $("#editIndex").val(id);

            $("#formTitle").text("Edit Item");
            $("#submitBtn").text("Update Item");

            $("#cancelBtn").removeClass("d-none");

            clearAllErrors();

            window.scrollTo(0, 0);

        }

    });




    $("#productForm").on("submit", function (event) {

        let editingId = $("#editIndex").val();


        if (editingId === "") {
            return;
        }

        event.preventDefault();

        let index = items.findIndex(function (item) {
            return item.itemId === editingId;
        });

        if (index === -1) {
            alert("Item not found.");
            return;
        }

        // Validate with the item's own ID excluded from the duplicate check
        if (!validateForm(editingId)) {
            return;
        }

        items[index] = {
            itemId: editingId,
            itemTitle: $("#itemTitle").val().trim(),
            itemCategory: $("#itemCategory").val(),
            itemUnit: $("#itemUnit").val(),
            itemPrice: Number($("#itemPrice").val()),
            itemInfo: $("#itemInfo").val().trim()
        };

        saveItems();
        renderTable();

        resetEditForm();

        alert("Product updated successfully!");

    });



    $("#itemsTableBody").on("click", ".delete-btn", function () {

        let id = $(this).attr("data-id");

        if (confirm("Are you sure you want to delete this item?")) {

            items = items.filter(function (item) {
                return item.itemId !== id;
            });

            saveItems();
            renderTable();

            if ($("#editIndex").val() === id) {
                resetEditForm();
            }

            alert("Product deleted successfully!");

        }

    });



    $("#cancelBtn").on("click", function () {

        resetEditForm();

    });

    function resetEditForm() {

        $("#productForm")[0].reset();

        $("#editIndex").val("");

        $("#itemId").prop("readonly", false);

        $("#formTitle").text("Add New Item");

        $("#submitBtn").text("Add Item");

        $("#cancelBtn").addClass("d-none");

        clearAllErrors();

    }



    let originalRenderTable = renderTable;

    renderTable = function () {

        originalRenderTable();

        addActionButtons();

        // Reapply search after table updates
        $("#searchInput").trigger("input");

    };

    // Add buttons if the table is already loaded
    renderTable();

});