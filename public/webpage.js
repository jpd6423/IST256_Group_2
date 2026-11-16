const API = "/api/attendees";
const form = document.getElementById("signupForm");
const formFields = ["name", "age", "email", "address"];
const submitBtn = form.querySelector("button[type=submit]");

let attendees = [];      // latest list from the database
let editingId = null;    // MongoDB _id of the attendee being edited

// ---------- Validation rules (same as before) ----------
const rules = {
    name: (n) => /^[A-Za-z][A-Za-z\s'-]{1,49}$/.test(n) ? "" : "Enter your full name (letters only).",
    age: (a) => {
        if (!/^\d+$/.test(a)) return "Age must be a whole number.";
        const age = parseInt(a);
        if (age < 13) return "Age must be 13 or older.";
        if (age > 120) return "Enter a realistic age.";
        return "";
    },
    email: (e) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "Enter a valid email address.";
        // Duplicate check (skip the attendee being edited)
        const taken = attendees.some(a => a.email === e.toLowerCase() && a._id !== editingId);
        return taken ? "This email is already in use." : "";
    },
    address: (a) => a.length >= 5 ? "" : "Enter your address (at least 5 characters)."
};

// ---------- Bootstrap error display ----------
function showFieldError(field, error) {
    const input = document.getElementById(field);
    input.classList.toggle("is-invalid", error !== "");
    input.classList.toggle("is-valid", error === "");

    let feedback = document.getElementById(field + "Error");
    if (feedback === null) {
        feedback = document.createElement("div");
        feedback.id = field + "Error";
        feedback.className = "invalid-feedback";
        input.parentNode.appendChild(feedback);
    }
    feedback.textContent = error;
}

function validate(field) {
    const error = rules[field](document.getElementById(field).value.trim());
    showFieldError(field, error);
    return error === "";
}

function clearForm() {
    form.reset();
    formFields.forEach(f => document.getElementById(f).classList.remove("is-valid", "is-invalid"));
    editingId = null;
    submitBtn.textContent = "Submit";
    cancelBtn.classList.add("d-none");
}

// ---------- Status alert + attendee table ----------
const alertBox = document.createElement("div");
alertBox.className = "alert mt-3 d-none";
form.after(alertBox);

function showAlert(type, message) {
    alertBox.className = "alert alert-" + type + " mt-3";
    alertBox.textContent = message;
}

const cancelBtn = document.createElement("button");
cancelBtn.type = "button";
cancelBtn.className = "btn btn-outline-secondary w-100 mt-2 d-none";
cancelBtn.textContent = "Cancel Edit";
cancelBtn.addEventListener("click", clearForm);
submitBtn.after(cancelBtn);

const section = document.createElement("div");
section.className = "event-info text-start";
section.innerHTML = `
    <h2 class="h4">Registered Attendees (<span id="count">0</span>)</h2>
    <p class="text-muted small mb-2">Loaded live from MongoDB.</p>
    <div class="table-responsive">
        <table class="table table-striped align-middle">
            <thead><tr><th>Name</th><th>Age</th><th>Email</th><th>Address</th><th></th></tr></thead>
            <tbody id="attendees"></tbody>
        </table>
    </div>`;
form.closest(".event-info").after(section);

function render() {
    const tbody = document.getElementById("attendees");
    tbody.innerHTML = "";
    attendees.forEach((a) => {
        const row = document.createElement("tr");
        [a.name, a.age, a.email, a.address].forEach((val) => {
            const cell = document.createElement("td");
            cell.textContent = val; // textContent keeps user input from running as HTML
            row.appendChild(cell);
        });

        const actions = document.createElement("td");
        actions.className = "text-nowrap";

        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-sm btn-outline-primary me-1";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => startEdit(a));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-sm btn-outline-danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteAttendee(a));

        actions.append(editBtn, deleteBtn);
        row.appendChild(actions);
        tbody.appendChild(row);
    });
    document.getElementById("count").textContent = attendees.length;
}

// ---------- fetch() helper: sends JSON, returns parsed JSON or throws ----------
async function api(url, method = "GET", body) {
    const options = { method: method, headers: {} };
    if (body !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || "Request failed.");
        error.fieldErrors = data.errors || {};
        throw error;
    }
    return data;
}

// ---------- READ ----------
async function loadAttendees() {
    try {
        attendees = await api(API);                         // GET /api/attendees
        render();
    } catch (err) {
        showAlert("danger", "Couldn't load attendees. Is the server running (node server.js)?");
    }
}

// ---------- UPDATE (fill the form) ----------
function startEdit(attendee) {
    editingId = attendee._id;
    formFields.forEach(f => {
        document.getElementById(f).value = attendee[f];
        document.getElementById(f).classList.remove("is-valid", "is-invalid");
    });
    submitBtn.textContent = "Save Changes";
    cancelBtn.classList.remove("d-none");
    showAlert("info", "Editing " + attendee.name + ". Change the fields and click Save Changes.");
    form.scrollIntoView({ behavior: "smooth" });
}

// ---------- DELETE ----------
async function deleteAttendee(attendee) {
    if (!confirm("Delete " + attendee.name + "?")) return;
    try {
        await api(API + "/" + attendee._id, "DELETE");      // DELETE /api/attendees/:id
        if (editingId === attendee._id) clearForm();
        showAlert("success", attendee.name + " was deleted.");
        await loadAttendees();
    } catch (err) {
        showAlert("danger", err.message);
    }
}

// ---------- Events ----------
formFields.forEach((f) => {
    document.getElementById(f).addEventListener("blur", () => validate(f));
});

// ---------- CREATE / UPDATE (submit) ----------
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let isFormValid = true;
    for (let i = 0; i < formFields.length; i++) {
        if (!validate(formFields[i])) isFormValid = false;
    }
    if (!isFormValid) {
        showAlert("danger", "Please fix the highlighted fields and try again.");
        return;
    }

    const attendee = {
        name: document.getElementById("name").value.trim(),
        age: Number(document.getElementById("age").value.trim()),
        email: document.getElementById("email").value.trim().toLowerCase(),
        address: document.getElementById("address").value.trim()
    };

    submitBtn.disabled = true;
    try {
        if (editingId) {
            await api(API + "/" + editingId, "PUT", attendee);   // PUT /api/attendees/:id
            showAlert("success", "Changes saved for " + attendee.name + ".");
        } else {
            await api(API, "POST", attendee);                   // POST /api/attendees
            showAlert("success", "Thanks for registering, " + attendee.name.split(" ")[0] + "! You've been saved to the database.");
        }
        clearForm();
        await loadAttendees();
    } catch (err) {
        // Show server-side validation errors on the matching fields
        Object.keys(err.fieldErrors).forEach(f => {
            if (formFields.includes(f)) showFieldError(f, err.fieldErrors[f]);
        });
        showAlert("danger", err.message);
    } finally {
        submitBtn.disabled = false;
    }
});

loadAttendees();