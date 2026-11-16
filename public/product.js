

// Product data loaded from MongoDB
let items = [];

// Node.js API endpoint
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

// Edit tracking
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
    const td = document.createElement("td");
    td.textContent = text;
    return td;
}

async function apiRequest(url, options = {}) {

    const response = await fetch(url, options);

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error || "Database request failed."
        );
    }

    return result;
}



async function loadProductsFromMongoDB() {

    try {

        items = await apiRequest(PRODUCT_API);

        renderTable();

        console.log("Products loaded from MongoDB:", items);

    } catch (error) {

        console.error(error);

        alert(
            "Unable to load products. Check your Node.js server."
        );

    }
}



async function addProductToMongoDB(product) {

    return await apiRequest(PRODUCT_API, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(product)

    });
}


async function updateProductInMongoDB(mongoId, product) {

    return await apiRequest(
        PRODUCT_API + "/" + mongoId,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(product)
        }
    );
}


async function deleteProductFromMongoDB(mongoId) {

    return await apiRequest(
        PRODUCT_API + "/" + mongoId,
        {
            method: "DELETE"
        }
    );
}



function renderTable() {

    tableBody.innerHTML = "";

    for (let i = 0; i < items.length; i++) {

        const item = items[i];
        const row = document.createElement("tr");

        row.appendChild(makeCell(item.itemId));
        row.appendChild(makeCell(item.itemTitle));
        row.appendChild(makeCell(item.itemCategory));
        row.appendChild(makeCell(item.itemUnit));

        row.appendChild(
            makeCell(formatPrice(item.itemPrice))
        );

        row.appendChild(
            makeCell(item.itemInfo || "—")
        );

        // Action buttons
        const actions = document.createElement("td");

        actions.className = "text-end";

        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.className =
            "btn btn-primary btn-sm me-2 edit-btn";

        editButton.textContent = "Edit";

        editButton.dataset.id = item.itemId;

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className =
            "btn btn-danger btn-sm delete-btn";

        deleteButton.textContent = "Delete";

        deleteButton.dataset.id = item.itemId;

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        row.appendChild(actions);

        tableBody.appendChild(row);
    }

    itemCount.textContent = items.length;

    applySearch();
}



function applySearch() {

    const searchText =
        $("#searchInput").val().trim().toLowerCase();

    let visibleCount = 0;

    $("#itemsTableBody tr").each(function () {

        const rowText = $(this).text().toLowerCase();

        if (rowText.includes(searchText)) {

            $(this).show();
            visibleCount++;

        } else {

            $(this).hide();

        }
    });

    if (visibleCount === 0) {

        emptyMessage.classList.remove("d-none");

    } else {

        emptyMessage.classList.add("d-none");

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

    fieldIds.forEach(function (id) {
        clearError(id);
    });
}


function idExists(id, editingId) {

    return items.some(function (item) {

        const sameId =
            item.itemId.toUpperCase() === id.toUpperCase();

        const isEditingItem =
            editingId &&
            item.itemId.toUpperCase() ===
                editingId.toUpperCase();

        return sameId && !isEditingItem;
    });
}



function validateForm(editingId = "") {

    let isValid = true;

    clearAllErrors();

    const id =
        $("#itemId").val().trim().toUpperCase();

    const title =
        $("#itemTitle").val().trim();

    const category =
        $("#itemCategory").val();

    const unit =
        $("#itemUnit").val();

    const priceText =
        $("#itemPrice").val().trim();

    const info =
        $("#itemInfo").val().trim();

    // Item ID
    if (id === "") {

        showError("itemId", "Item ID is required.");
        isValid = false;

    } else if (!ID_PATTERN.test(id)) {

        showError(
            "itemId",
            "Use an ID such as TKT-001 or MER-001."
        );

        isValid = false;

    } else if (idExists(id, editingId)) {

        showError(
            "itemId",
            "This product ID already exists."
        );

        isValid = false;
    }

    // Product title
    if (title.length < MIN_TITLE_LENGTH ||
        title.length > MAX_TITLE_LENGTH) {

        showError(
            "itemTitle",
            "Title must be between 3 and 60 characters."
        );

        isValid = false;
    }

    // Category
    if (!ALLOWED_CATEGORIES.includes(category)) {

        showError(
            "itemCategory",
            "Choose a valid category."
        );

        isValid = false;
    }

    // Unit
    if (!ALLOWED_UNITS.includes(unit)) {

        showError(
            "itemUnit",
            "Choose a valid unit."
        );

        isValid = false;
    }

    // Price
    if (priceText === "") {

        showError("itemPrice", "Price is required.");
        isValid = false;

    } else if (!/^\d+(\.\d{1,2})?$/.test(priceText)) {

        showError(
            "itemPrice",
            "Enter a valid price with at most 2 decimal places."
        );

        isValid = false;

    } else if (
        Number(priceText) < 0 ||
        Number(priceText) > MAX_PRICE
    ) {

        showError(
            "itemPrice",
            "Price must be between $0 and $10,000."
        );

        isValid = false;
    }

    // Additional information
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
            $("#itemId").val().trim().toUpperCase(),

        itemTitle:
            $("#itemTitle").val().trim(),

        itemCategory:
            $("#itemCategory").val(),

        itemUnit:
            $("#itemUnit").val(),

        itemPrice:
            Number($("#itemPrice").val()),

        itemInfo:
            $("#itemInfo").val().trim()

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

    if (!validateForm(editingItemId)) {
        return;
    }

    const productData = getProductData();

    saving = true;

    $("#submitBtn").prop("disabled", true);

    try {

        if (editingMongoId === null) {

            // CREATE
            await addProductToMongoDB(productData);

            alert(
                "Product added to MongoDB successfully!"
            );

        } else {

            // UPDATE
            await updateProductInMongoDB(
                editingMongoId,
                productData
            );

            alert(
                "Product updated in MongoDB successfully!"
            );
        }

        resetEditForm();

        await loadProductsFromMongoDB();

    } catch (error) {

        console.error(error);

        alert("Unable to save product: " + error.message);

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

        const id = $(this).attr("data-id");

        const item = items.find(
            product => product.itemId === id
        );

        if (!item) {
            alert("Product not found.");
            return;
        }

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

        const id = $(this).attr("data-id");

        const item = items.find(
            product => product.itemId === id
        );

        if (!item) {
            alert("Product not found.");
            return;
        }

        if (!confirm(
            "Are you sure you want to delete this product?"
        )) {
            return;
        }

        saving = true;

        try {

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


fieldIds.forEach(function (id) {

    const field = document.getElementById(id);

    field.addEventListener("input", function () {
        clearError(id);
    });

    field.addEventListener("change", function () {
        clearError(id);
    });
});


loadProductsFromMongoDB();