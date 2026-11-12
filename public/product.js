// Products loaded from MongoDB
let items = [];

// MongoDB API
const PRODUCT_API = "/api/products";

// Allowed dropdown values
const ALLOWED_CATEGORIES = [
    "Ticket",
    "Merchandise",
    "Food",
    "Swag",
    "Other"
];

const ALLOWED_UNITS = [
    "Each",
    "Pack",
    "Box",
    "Digital"
];

// Validation limits
const MAX_TITLE_LENGTH = 60;
const MIN_TITLE_LENGTH = 3;
const MAX_INFO_LENGTH = 50;
const MAX_PRICE = 10000;
const ID_PATTERN = /^[A-Za-z]{2,4}-\d{3}$/;

// Tracks the item currently being edited
let editingMongoId = null;
let editingItemId = "";
let saving = false;

const form = document.getElementById("productForm");
const tableBody = document.getElementById("itemsTableBody");
const itemCount = document.getElementById("itemCount");
const emptyMessage = document.getElementById("emptyMessage");

const fieldIds = [
    "itemId",
    "itemTitle",
    "itemCategory",
    "itemUnit",
    "itemPrice",
    "itemInfo"
];


function formatPrice(price) {
    return "$" + Number(price).toFixed(2);
}

function makeCell(text) {
    let td = document.createElement("td");
    td.textContent = text;
    return td;
}

async function loadProductsFromMongoDB() {

    try {
        const response = await fetch(PRODUCT_API);

        if (!response.ok) {
            throw new Error("Unable to load products from MongoDB.");
        }

        items = await response.json();

        renderTable();

        console.log("Products loaded from MongoDB:", items);

    } catch (error) {
        console.error("MongoDB loading error:", error);

        alert(
            "Could not load products. Make sure Node.js and MongoDB are running."
        );
    }
}

async function addProductToMongoDB(product) {

    const response = await fetch(PRODUCT_API, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(product)

    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error || "Unable to add product."
        );
    }

    console.log("Product added to MongoDB:", result);

    return result;
}


async function updateProductInMongoDB(mongoId, product) {

    const response = await fetch(
        PRODUCT_API + "/" + mongoId,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(product)
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error || "Unable to update product."
        );
    }

    console.log("Product updated in MongoDB:", result);

    return result;
}


async function deleteProductFromMongoDB(mongoId) {

    const response = await fetch(
        PRODUCT_API + "/" + mongoId,
        {
            method: "DELETE"
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error || "Unable to delete product."
        );
    }

    console.log("Product deleted from MongoDB:", result);

    return result;
}

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

        if (!item.itemInfo) {
            row.appendChild(makeCell("—"));
        } else {
            row.appendChild(makeCell(item.itemInfo));
        }

        // Edit and Delete buttons
        let actions = document.createElement("td");
        actions.className = "text-end";

        let editButton = document.createElement("button");

        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.className =
            "btn btn-primary btn-sm me-2 edit-btn";

        editButton.setAttribute("data-id", item.itemId);

        let deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className =
            "btn btn-danger btn-sm delete-btn";

        deleteButton.setAttribute("data-id", item.itemId);

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        row.appendChild(actions);
        tableBody.appendChild(row);
    }

    itemCount.textContent = items.length;

    if (items.length === 0) {
        emptyMessage.classList.remove("d-none");
    } else {
        emptyMessage.classList.add("d-none");
    }

    // Keep search filtering after table updates
    applySearch();
}


function applySearch() {

    let searchText = $("#searchInput").val().trim().toLowerCase();

    let visibleCount = 0;

    $("#itemsTableBody tr").each(function () {

        let rowText = $(this).text().toLowerCase();

        if (rowText.includes(searchText)) {
            $(this).show();
            visibleCount++;
        } else {
            $(this).hide();
        }
    });

    if (items.length > 0) {
        $("#emptyMessage").toggleClass(
            "d-none",
            visibleCount > 0
        );
    }
}

$("#searchInput").on("input", applySearch);


function showError(fieldId, message) {

    const field = document.getElementById(fieldId);
    const errorElement =
        document.getElementById(fieldId + "Error");

    field.classList.add("is-invalid");

    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearError(fieldId) {

    const field = document.getElementById(fieldId);
    const errorElement =
        document.getElementById(fieldId + "Error");

    field.classList.remove("is-invalid");

    if (errorElement) {
        errorElement.textContent = "";
    }
}

function clearAllErrors() {

    for (let i = 0; i < fieldIds.length; i++) {
        clearError(fieldIds[i]);
    }
}

// Check for duplicate product IDs
function idExists(id, editingId) {

    for (let i = 0; i < items.length; i++) {

        let sameId =
            items[i].itemId.toUpperCase() === id.toUpperCase();

        let isItemBeingEdited =
            editingId &&
            items[i].itemId.toUpperCase() ===
                editingId.toUpperCase();

        if (sameId && !isItemBeingEdited) {
            return true;
        }
    }

    return false;
}

// Validate complete form
function validateForm(editingId) {

    let isValid = true;

    clearAllErrors();

    let id =
        document.getElementById("itemId").value.trim().toUpperCase();

    let title =
        document.getElementById("itemTitle").value.trim();

    let category =
        document.getElementById("itemCategory").value;

    let unit =
        document.getElementById("itemUnit").value;

    let priceText =
        document.getElementById("itemPrice").value.trim();

    let info =
        document.getElementById("itemInfo").value.trim();

    // Item ID validation
    if (id === "") {

        showError("itemId", "Item ID required.");
        isValid = false;

    } else if (!ID_PATTERN.test(id)) {

        showError(
            "itemId",
            "Use 2-4 letters, a dash, then 3 digits (e.g. TKT-001)."
        );

        isValid = false;

    } else if (idExists(id, editingId)) {

        showError(
            "itemId",
            "An item with this ID already exists."
        );

        isValid = false;
    }

    // Product title validation
    if (title === "") {

        showError("itemTitle", "Item title required.");
        isValid = false;

    } else if (title.length < MIN_TITLE_LENGTH) {

        showError(
            "itemTitle",
            "Item title must be at least 3 characters."
        );

        isValid = false;

    } else if (title.length > MAX_TITLE_LENGTH) {

        showError(
            "itemTitle",
            "Item title must be 60 characters or fewer."
        );

        isValid = false;
    }

    // Category validation
    if (!ALLOWED_CATEGORIES.includes(category)) {

        showError(
            "itemCategory",
            "Choose a valid category."
        );

        isValid = false;
    }

    // Unit validation
    if (!ALLOWED_UNITS.includes(unit)) {

        showError(
            "itemUnit",
            "Choose a valid unit."
        );

        isValid = false;
    }

    // Price validation
    if (priceText === "") {

        showError("itemPrice", "Price required.");
        isValid = false;

    } else {

        let price = Number(priceText);

        if (!Number.isFinite(price)) {

            showError("itemPrice", "Price must be a number.");
            isValid = false;

        } else if (price < 0) {

            showError("itemPrice", "Price cannot be negative.");
            isValid = false;

        } else if (price > MAX_PRICE) {

            showError(
                "itemPrice",
                "Price cannot exceed $10,000."
            );

            isValid = false;

        } else if (!/^\d+(\.\d{1,2})?$/.test(priceText)) {

            showError(
                "itemPrice",
                "Price can have at most 2 decimal places."
            );

            isValid = false;
        }
    }

    // Additional info validation
    if (info.length > MAX_INFO_LENGTH) {

        showError(
            "itemInfo",
            "Additional info must be 50 characters or fewer."
        );

        isValid = false;
    }

    return isValid;
}


function getProductData() {

    return {
        itemId:
            document.getElementById("itemId")
                .value.trim().toUpperCase(),

        itemTitle:
            document.getElementById("itemTitle")
                .value.trim(),

        itemCategory:
            document.getElementById("itemCategory")
                .value,

        itemUnit:
            document.getElementById("itemUnit")
                .value,

        itemPrice:
            Number(
                document.getElementById("itemPrice").value
            ),

        itemInfo:
            document.getElementById("itemInfo")
                .value.trim()
    };
}


function resetEditForm() {

    form.reset();

    editingMongoId = null;
    editingItemId = "";

    $("#editIndex").val("");

    $("#itemId").prop("readonly", false);

    $("#formTitle").text("Add New Item");
    $("#submitBtn").text("Add Item");

    $("#cancelBtn").addClass("d-none");

    clearAllErrors();
}


form.addEventListener("submit", async function (event) {

    event.preventDefault();

    if (saving) return;

    let currentEditingId = editingItemId;

    if (!validateForm(currentEditingId)) {
        return;
    }

    const productData = getProductData();

    saving = true;
    $("#submitBtn").prop("disabled", true);

    try {

        if (editingMongoId === null) {

            // CREATE NEW PRODUCT
            await addProductToMongoDB(productData);

            alert("Product added to MongoDB successfully!");

        } else {

            // UPDATE EXISTING PRODUCT
            await updateProductInMongoDB(
                editingMongoId,
                productData
            );

            alert("Product updated in MongoDB successfully!");
        }

        resetEditForm();

        await loadProductsFromMongoDB();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to save product: " + error.message
        );

    } finally {

        saving = false;
        $("#submitBtn").prop("disabled", false);

    }
});


$("#itemsTableBody").on(
    "click",
    ".edit-btn",
    function () {

        if (saving) return;

        let id = $(this).attr("data-id");

        let item = items.find(function (product) {
            return product.itemId === id;
        });

        if (!item) {
            alert("Item not found.");
            return;
        }

        // Store MongoDB document ID
        editingMongoId = item._id;
        editingItemId = item.itemId;

        $("#itemId")
            .val(item.itemId)
            .prop("readonly", true);

        $("#itemTitle").val(item.itemTitle);
        $("#itemCategory").val(item.itemCategory);
        $("#itemUnit").val(item.itemUnit);
        $("#itemPrice").val(item.itemPrice);
        $("#itemInfo").val(item.itemInfo || "");

        $("#editIndex").val(item.itemId);

        $("#formTitle").text("Edit Item");
        $("#submitBtn").text("Update Item");

        $("#cancelBtn").removeClass("d-none");

        clearAllErrors();

        window.scrollTo(0, 0);
    }
);

$("#itemsTableBody").on(
    "click",
    ".delete-btn",
    async function () {

        if (saving) return;

        let id = $(this).attr("data-id");

        let item = items.find(function (product) {
            return product.itemId === id;
        });

        if (!item) {
            alert("Product not found.");
            return;
        }

        if (!confirm(
            "Are you sure you want to delete this item?"
        )) {
            return;
        }

        saving = true;

        try {

            // DELETE FROM MONGODB
            await deleteProductFromMongoDB(item._id);

            if (editingItemId === id) {
                resetEditForm();
            }

            await loadProductsFromMongoDB();

            alert(
                "Product deleted from MongoDB successfully!"
            );

        } catch (error) {

            console.error(error);

            alert(
                "Unable to delete product: " + error.message
            );

        } finally {

            saving = false;

        }
    }
);

$("#cancelBtn").on("click", function () {

    if (!saving) {
        resetEditForm();
    }
});


for (let i = 0; i < fieldIds.length; i++) {

    let field = document.getElementById(fieldIds[i]);

    field.addEventListener("input", function (event) {
        clearError(event.target.id);
    });

    field.addEventListener("change", function (event) {
        clearError(event.target.id);
    });
}

loadProductsFromMongoDB();