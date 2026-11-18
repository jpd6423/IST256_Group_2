

$(document).ready(function () {

    // API endpoints
    const PRODUCTS_API = "/api/products";
    const CART_API = "/api/cart/demo-cart";

    // Cart limit
    const MAX_CART_ITEMS = 50;

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
        return "$" + Number(amount).toFixed(2);
    }

    function findIndexById(list, id) {

        for (let i = 0; i < list.length; i++) {

            if (list[i].itemId === id) {
                return i;
            }
        }

        return -1;
    }

    function getCartItemCount() {

        let count = 0;

        for (let i = 0; i < cart.length; i++) {
            count += cart[i].quantity;
        }

        return count;
    }

    function getCartTotal() {

        let total = 0;

        for (let i = 0; i < cart.length; i++) {
            total += cart[i].itemPrice * cart[i].quantity;
        }

        return total;
    }

    function showStatus(message, type) {

        const status = $("#statusMessage");

        status.removeClass(
            "d-none alert-success alert-danger alert-info"
        );

        status.addClass("alert-" + type);

        status.text(message);
    }


    async function loadProducts() {

        try {

            const response = await fetch(PRODUCTS_API);

            if (!response.ok) {
                throw new Error("Unable to load products.");
            }

            products = await response.json();

            displayProducts();

            console.log(
                "Products loaded from MongoDB:",
                products
            );

        } catch (error) {

            console.error(error);

            showStatus(
                "Unable to load products from MongoDB.",
                "danger"
            );
        }
    }


    async function loadCart() {

        try {

            const response = await fetch(CART_API);

            if (!response.ok) {
                throw new Error("Unable to load cart.");
            }

            const savedCart = await response.json();

            cart = savedCart.items || [];

            cartLoaded = true;

            displayCart();

            console.log(
                "Cart loaded from MongoDB:",
                cart
            );

        } catch (error) {

            console.error(error);

            cartLoaded = false;

            showStatus(
                "Unable to load shopping cart.",
                "danger"
            );
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

            // Reload items and prices returned by server
            cart = result.items || [];

            displayCart();

            console.log(
                "Cart saved in MongoDB:",
                cart
            );

            return true;

        } catch (error) {

            console.error(error);

            showStatus(
                "Unable to save shopping cart: " +
                error.message,
                "danger"
            );

            // Original cart remains unchanged
            displayCart();

            return false;

        } finally {

            saving = false;

        }
    }


    function displayProducts() {

        const search =
            $("#searchInput").val().trim().toLowerCase();

        const category =
            $("#categoryFilter").val();

        $("#productTableBody").empty();

        let searchCount = 0;

        for (let i = 0; i < products.length; i++) {

            const p = products[i];

            const matchesSearch =
                p.itemId.toLowerCase().includes(search) ||
                p.itemTitle.toLowerCase().includes(search) ||
                p.itemCategory.toLowerCase().includes(search);

            const matchesCategory =
                category === "" ||
                p.itemCategory === category;

            if (matchesSearch && matchesCategory) {

                searchCount++;

                const info = p.itemInfo || "—";

                const row = $("<tr></tr>");

                row.append($("<td></td>").text(p.itemId));

                row.append(
                    $("<td></td>").text(p.itemTitle)
                );

                row.append(
                    $("<td></td>").text(p.itemCategory)
                );

                row.append(
                    $("<td></td>").text(p.itemUnit)
                );

                row.append(
                    $("<td></td>").text(
                        formatMoney(p.itemPrice)
                    )
                );

                row.append(
                    $("<td></td>").text(info)
                );

                const button = $("<button></button>");

                button.addClass(
                    "btn btn-primary btn-sm add-to-cart-btn"
                );

                button.attr("type", "button");

                button.text("Add to Cart");

                button.on("click", function () {
                    addToCart(p);
                });

                const buttonCell = $("<td></td>");

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

            showStatus(
                "Shopping cart is still loading.",
                "info"
            );

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

        // Copy cart without changing saved data
        const updatedCart = cart.map(
            item => ({ ...item })
        );

        const index = findIndexById(
            updatedCart,
            product.itemId
        );

        if (index !== -1) {

            updatedCart[index].quantity++;

        } else {

            updatedCart.push({
                itemId: product.itemId,
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


    function displayCart() {

        $("#cartTableBody").empty();

        for (let i = 0; i < cart.length; i++) {

            const item = cart[i];

            const row = $("<tr></tr>");

            row.append(
                $("<td></td>").text(item.itemId)
            );

            row.append(
                $("<td></td>").text(item.itemTitle)
            );

            row.append(
                $("<td></td>").text(
                    formatMoney(item.itemPrice)
                )
            );

            // Quantity input
            const qtyInput = $("<input>");

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

            // Remove button
            const button = $("<button></button>");

            button.addClass(
                "btn btn-outline-danger btn-sm remove-from-cart-btn"
            );

            button.attr("type", "button");

            button.text("Remove");

            button.on("click", function () {
                removeFromCart(item.itemId);
            });

            const buttonCell = $("<td></td>");

            buttonCell.addClass("text-end");

            buttonCell.append(button);

            row.append(buttonCell);

            $("#cartTableBody").append(row);
        }

        $("#cartCount").text(getCartItemCount());

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

        const qty = Number(value);

        if (!isValidQuantity(qty)) {

            showStatus(
                "Quantity must be a whole number between 1 and " +
                MAX_CART_ITEMS + ".",
                "danger"
            );

            displayCart();

            return;
        }

        const otherUnits =
            getCartItemCount() - item.quantity;

        if (otherUnits + qty > MAX_CART_ITEMS) {

            const canAdd =
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

        const updatedCart = cart.map(
            cartItem => ({

                ...cartItem,

                quantity:
                    cartItem.itemId === item.itemId
                        ? qty
                        : cartItem.quantity

            })
        );

        if (await saveCart(updatedCart)) {

            showStatus(
                "Quantity updated in MongoDB.",
                "success"
            );

        }
    }


    async function removeFromCart(id) {

        if (saving || !cartLoaded) return;

        const updatedCart = cart.filter(
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

        if (confirm(
            "Are you sure you want to clear your cart?"
        )) {

            if (await saveCart([])) {

                showStatus(
                    "Cart cleared in MongoDB.",
                    "success"
                );

            }
        }
    });



    $("#checkoutBtn").on("click", function () {

        if (saving || !cartLoaded) {

            showStatus(
                "Shopping cart is not ready.",
                "info"
            );

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

        // Keep cart saved for the Billing page
            // Hand the cart to the Billing page
        try {
            localStorage.setItem("checkoutCart", JSON.stringify({
                items: cart.map(item => ({
                    itemId: item.itemId,
                    itemTitle: item.itemTitle,
                    itemPrice: item.itemPrice,
                    quantity: item.quantity
                }))
            }));
        } catch (e) { console.error(e); }

        window.location.href = "billing.html";
    });

    loadProducts();
    loadCart();

});