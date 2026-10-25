$(document).ready(function () {

    const API_URL = "";

    let products = [];
    let cart = [];

    //Field integrity checks
    function isValidQuantity(q) {
        if (isNaN(q)) {
            return false;
        }
        if (Math.floor(q) !== q) {
            return false;
        }
        return q >= 1 && q <= 999;
    }

    function formatMoney(amount) {
        return "$" + parseFloat(amount).toFixed(2);
    }

    function findIndexById(list, id) {
        for (let i = 0; i < list.length; i++) {
            if (list[i].itemId === id) {
                return i;
            }
        }
        return -1;
    }

    //Load products from JSON

    function loadProducts() {
                $.getJSON("cart.json", function (data) {
            products = data.items;
            displayProducts();
        }).fail(function () {
            showStatus("Unable to load cart.json.", "danger");
        });
    }

    //jQuery search and product table

    function displayProducts() {
        let search = $("#searchInput").val().trim().toLowerCase();
        let category = $("#categoryFilter").val();

        $("#productTableBody").html("");
        let searchCount = 0;

        for (let i = 0; i < products.length; i++) {
            let p = products[i];

            let matchesSearch =
                p.itemId.toLowerCase().indexOf(search) !== -1 ||
                p.itemTitle.toLowerCase().indexOf(search) !== -1 ||
                p.itemCategory.toLowerCase().indexOf(search) !== -1;
            let matchesCategory = category === "" || p.itemCategory === category;

            if (matchesSearch && matchesCategory) {
                searchCount++;

                let info = "—";
                if (p.itemInfo) {
                    info = p.itemInfo;
                }

                let row = $("<tr></tr>");
                row.append($("<td></td>").text(p.itemId));
                row.append($("<td></td>").text(p.itemTitle));
                row.append($("<td></td>").text(p.itemCategory));
                row.append($("<td></td>").text(p.itemUnit));
                row.append($("<td></td>").text(formatMoney(p.itemPrice)));
                row.append($("<td></td>").text(info));

                let button = $("<button></button>");
                button.addClass("btn btn-primary btn-sm add-to-cart-btn");
                button.attr("type", "button");
                button.text("Add to Cart");
                button.on("click", function () {
                    addToCart(p);
                });

                let buttonCell = $("<td></td>");
                buttonCell.addClass("text-end");
                buttonCell.append(button);
                row.append(buttonCell);

                $("#productTableBody").append(row);
            }
        }

        $("#productCount").text(searchCount);

        if (searchCount === 0) {
            $("#noResultsMessage").removeClass("d-none");
        } else {
            $("#noResultsMessage").addClass("d-none");
        }
    }

    $("#searchInput").on("input", displayProducts);
    $("#categoryFilter").on("change", displayProducts);

    //Add to cart

    function addToCart(product) {
        let index = findIndexById(cart, product.itemId);

        if (index !== -1) {
            cart[index].quantity++;
        } else {
            cart.push({
                itemId: product.itemId,
                itemTitle: product.itemTitle,
                itemCategory: product.itemCategory,
                itemUnit: product.itemUnit,
                itemPrice: parseFloat(product.itemPrice),
                quantity: 1
            });
        }

        displayCart();
        showStatus(product.itemTitle + " added to cart.", "success");
    }


    //Cart table

    function getCartTotal() {
        let total = 0;
        for (let i = 0; i < cart.length; i++) {
            total += cart[i].itemPrice * cart[i].quantity;
        }
        return total;
    }

    function displayCart() {
        $("#cartTableBody").html("");
        let totalItems = 0;

        for (let i = 0; i < cart.length; i++) {
            let item = cart[i];
            totalItems += item.quantity;

            let row = $("<tr></tr>");
            row.append($("<td></td>").text(item.itemId));
            row.append($("<td></td>").text(item.itemTitle));
            row.append($("<td></td>").text(formatMoney(item.itemPrice)));

            let qtyInput = $("<input>");
            qtyInput.attr("type", "number");
            qtyInput.attr("min", "1");
            qtyInput.attr("max", "999");
            qtyInput.addClass("form-control form-control-sm cart-qty");
            qtyInput.val(item.quantity);
            qtyInput.on("change", function () {
                updateQuantity(item, qtyInput.val());
            });
            row.append($("<td></td>").append(qtyInput));

            row.append($("<td></td>").text(formatMoney(item.itemPrice * item.quantity)));

            let button = $("<button></button>");
            button.addClass("btn btn-outline-danger btn-sm remove-from-cart-btn");
            button.attr("type", "button");
            button.text("Remove");
            button.on("click", function () {
                removeFromCart(item.itemId);
            });

            let buttonCell = $("<td></td>");
            buttonCell.addClass("text-end");
            buttonCell.append(button);
            row.append(buttonCell);

            $("#cartTableBody").append(row);
        }

        $("#cartCount").text(totalItems);
        $("#cartTotal").text(formatMoney(getCartTotal()));

        if (cart.length === 0) {
            $("#emptyCartMessage").removeClass("d-none");
        } else {
            $("#emptyCartMessage").addClass("d-none");
        }
    }

    //Update quantity

    function updateQuantity(item, value) {
        let qty = parseFloat(value);

        if (!isValidQuantity(qty)) {
            showStatus("Quantity must be a whole number between 1 and 999.", "danger");
            displayCart(); // restore old value
            return;
        }

        item.quantity = qty;
        displayCart();
        showStatus("Quantity updated.", "success");
    }

    //Remove / clear

    function removeFromCart(id) {
        let index = findIndexById(cart, id);

        if (index !== -1) {
            cart.splice(index, 1);
        }

        displayCart();
        showStatus("Product removed from cart.", "success");
    }

    $("#clearCartBtn").on("click", function () {
        if (cart.length === 0) {
            showStatus("Your cart is already empty.", "danger");
            return;
        }
        if (confirm("Are you sure you want to clear your cart?")) {
            cart = [];
            displayCart();
            showStatus("Cart cleared.", "success");
        }
    });

    //Status

    function showStatus(message, type) {
        let status = $("#statusMessage");
        status.removeClass("d-none alert-success alert-danger alert-info");
        status.addClass("alert-" + type);
        status.text(message);
    }

    //Checkout: send cart JSON with AJAX

    $("#checkoutBtn").on("click", function () {
        if (cart.length === 0) {
            showStatus("Your cart is empty.", "danger");
            return;
        }

        let checkoutData = {
            items: cart,
            total: parseFloat(getCartTotal().toFixed(2))
        };

        console.log("JSON data for REST API:");
        console.log(JSON.stringify(checkoutData, null, 2));

        if (API_URL === "") {
            showStatus("Checkout data saved! View JSON in the browser console. API connection will be added later.", "info");
            cart = [];
            displayCart();
            return;
        }

        $.ajax({
            url: API_URL,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(checkoutData),
            success: function () {
                showStatus("Checkout successful!", "success");
                cart = [];
                displayCart();
            },
            error: function () {
                showStatus("Unable to checkout.", "danger");
            }
        });
    });

    loadProducts();
    displayCart();
});