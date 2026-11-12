$(document).ready(function () {

    // Maximum number of units allowed in cart
    const MAX_CART_ITEMS = 50;

    // MongoDB API endpoints
    const PRODUCTS_API = "/api/products";
    const CART_API = "/api/cart/demo-cart";

    let products = [];
    let cart = [];
    let saving = false;
    let cartLoaded = false;

 

    function isValidQuantity(q) {
        if (isNaN(q)) {
            return false;
        }

        if (Math.floor(q) !== q) {
            return false;
        }

        return q >= 1 && q <= MAX_CART_ITEMS;
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

    // Total number of units currently in cart
    function getCartItemCount() {
        let count = 0;

        for (let i = 0; i < cart.length; i++) {
            count += cart[i].quantity;
        }

        return count;
    }



    async function loadProducts() {
        try {

            const response = await fetch(PRODUCTS_API);

            if (!response.ok) {
                throw new Error("Unable to load products.");
            }

            products = await response.json();

            displayProducts();

            console.log("Products loaded from MongoDB:", products);

        } catch (error) {
            showStatus(
                "Unable to load products from MongoDB.",
                "danger"
            );

            console.error(error);
        }
    }


    async function loadCart() {
        try {

            const response = await fetch(CART_API);

            if (!response.ok) {
                throw new Error("Unable to load shopping cart.");
            }

            const savedCart = await response.json();

            cart = savedCart.items || [];

            cartLoaded = true;

            displayCart();

            console.log("Cart loaded from MongoDB:", cart);

        } catch (error) {

            cartLoaded = false;

            showStatus(
                "Unable to load shopping cart from MongoDB.",
                "danger"
            );

            console.error(error);
        }
    }



    async function saveCart(updatedCart) {

        if (saving || !cartLoaded) {
            return false;
        }

        saving = true;

        try {

            const response = await fetch(CART_API, {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    items: updatedCart.map(item => ({
                        itemId: item.itemId,
                        quantity: item.quantity
                    }))
                })

            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to save cart."
                );
            }

            // Use MongoDB's saved data
            cart = result.items;

            displayCart();

            console.log("Cart saved to MongoDB:", cart);

            return true;

        } catch (error) {

            showStatus(
                "Unable to save shopping cart: " + error.message,
                "danger"
            );

            console.error(error);

            // Keep original cart on screen
            displayCart();

            return false;

        } finally {
            saving = false;
        }
    }



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

            let matchesCategory =
                category === "" || p.itemCategory === category;

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

                button.addClass(
                    "btn btn-primary btn-sm add-to-cart-btn"
                );

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



    async function addToCart(product) {

        if (saving || !cartLoaded) {
            showStatus("Shopping cart is not ready.", "info");
            return;
        }

        if (getCartItemCount() + 1 > MAX_CART_ITEMS) {

            showStatus(
                "Your cart is full. The limit is " +
                MAX_CART_ITEMS + " items.",
                "danger"
            );

            return;
        }

        // Make a copy before saving
        let updatedCart = cart.map(item => ({ ...item }));

        let index = findIndexById(
            updatedCart,
            product.itemId
        );

        if (index !== -1) {

            updatedCart[index].quantity++;

        } else {

            updatedCart.push({
                itemId: product.itemId,
                itemTitle: product.itemTitle,
                itemCategory: product.itemCategory,
                itemUnit: product.itemUnit,
                itemPrice: parseFloat(product.itemPrice),
                quantity: 1
            });

        }

        if (await saveCart(updatedCart)) {

            showStatus(
                product.itemTitle +
                " added to cart and saved in MongoDB.",
                "success"
            );

        }
    }



    function getCartTotal() {

        let total = 0;

        for (let i = 0; i < cart.length; i++) {
            total += cart[i].itemPrice * cart[i].quantity;
        }

        return total;
    }

   

    function displayCart() {

        $("#cartTableBody").html("");

        let totalItems = getCartItemCount();

        for (let i = 0; i < cart.length; i++) {

            let item = cart[i];

            let row = $("<tr></tr>");

            row.append($("<td></td>").text(item.itemId));
            row.append($("<td></td>").text(item.itemTitle));
            row.append(
                $("<td></td>").text(formatMoney(item.itemPrice))
            );

            let qtyInput = $("<input>");

            qtyInput.attr("type", "number");
            qtyInput.attr("min", "1");
            qtyInput.attr("max", MAX_CART_ITEMS);

            qtyInput.addClass(
                "form-control form-control-sm cart-qty"
            );

            qtyInput.val(item.quantity);

            qtyInput.on("change", function () {
                updateQuantity(item, qtyInput.val());
            });

            row.append(
                $("<td></td>").append(qtyInput)
            );

            row.append(
                $("<td></td>").text(
                    formatMoney(
                        item.itemPrice * item.quantity
                    )
                )
            );

            let button = $("<button></button>");

            button.addClass(
                "btn btn-outline-danger btn-sm remove-from-cart-btn"
            );

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

        $("#cartTotal").text(
            formatMoney(getCartTotal())
        );

        if (cart.length === 0) {
            $("#emptyCartMessage").removeClass("d-none");
        } else {
            $("#emptyCartMessage").addClass("d-none");
        }
    }

  
    async function updateQuantity(item, value) {

        if (saving || !cartLoaded) {
            displayCart();
            return;
        }

        let qty = Number(value);

        if (!isValidQuantity(qty)) {

            showStatus(
                "Quantity must be a whole number between 1 and " +
                MAX_CART_ITEMS + ".",
                "danger"
            );

            displayCart();

            return;
        }

        let otherUnits =
            getCartItemCount() - item.quantity;

        if (otherUnits + qty > MAX_CART_ITEMS) {

            let canAdd =
                MAX_CART_ITEMS - otherUnits;

            showStatus(
                "Cart limit is " + MAX_CART_ITEMS +
                " items. You can have at most " +
                canAdd + " of this item.",
                "danger"
            );

            displayCart();

            return;
        }

        let updatedCart = cart.map(cartItem => ({
            ...cartItem,
            quantity:
                cartItem.itemId === item.itemId
                    ? qty
                    : cartItem.quantity
        }));

        if (await saveCart(updatedCart)) {

            showStatus(
                "Quantity updated in MongoDB.",
                "success"
            );

        }
    }

 

    async function removeFromCart(id) {

        if (saving || !cartLoaded) return;

        let updatedCart = cart.filter(
            item => item.itemId !== id
        );

        if (await saveCart(updatedCart)) {

            showStatus(
                "Product removed from cart.",
                "success"
            );

        }
    }

    $("#clearCartBtn").on("click", async function () {

        if (saving || !cartLoaded) return;

        if (cart.length === 0) {

            showStatus(
                "Your cart is already empty.",
                "danger"
            );

            return;
        }

        if (confirm("Are you sure you want to clear your cart?")) {

            if (await saveCart([])) {

                showStatus(
                    "Cart cleared in MongoDB.",
                    "success"
                );

            }
        }
    });


    function showStatus(message, type) {

        let status = $("#statusMessage");

        status.removeClass(
            "d-none alert-success alert-danger alert-info"
        );

        status.addClass("alert-" + type);

        status.text(message);
    }

    // ==========================================
    // CHECKOUT
    // ==========================================

    $("#checkoutBtn").on("click", function () {

        if (saving || !cartLoaded) {
            showStatus("Cart is not ready.", "info");
            return;
        }

        if (cart.length === 0) {

            showStatus(
                "Your cart is empty.",
                "danger"
            );

            return;
        }

        if (getCartItemCount() > MAX_CART_ITEMS) {

            showStatus(
                "Your cart has more than " +
                MAX_CART_ITEMS + " items.",
                "danger"
            );

            return;
        }

        // The cart remains in MongoDB.
        // Billing will use the saved items.
        window.location.href = "billing.html";
    });



    loadProducts();
    loadCart();

});