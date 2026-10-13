const form = document.getElementById("signupForm");
const formFields = ["name", "age", "email", "address"];
let registrations = [];

// Validation rules
const rules = {
    name: (n) => /^[A-Za-z][A-Za-z\s'-]{1,49}$/.test(n) ? "" : "Enter your full name (letters only).",
    age: (a) => {
        
        if (!/^\d+$/.test(a)) {
            return "Age must be a whole number.";
        }
        const age = parseInt(a);
        return age >= 13 ? "" : "Age must be older than 13.";
    },
    email: (e) => {
    
        for (let i = 0; i < registrations.length; i++) {
            if (registrations[i].email === e) {
                return "This email is already in use.";
            }
        }
        return "";
    },
    address: (a) => a.length >= 5 ? "" : "Enter your address (at least 5 characters)."
};

// Bootstrap errors
function validate(field) {
    const input = document.getElementById(field);
    const error = rules[field](input.value.trim());

    if (error !== "") {
        input.classList.add("is-invalid");
        input.classList.remove("is-valid");
    } else {
        input.classList.add("is-valid");
        input.classList.remove("is-invalid");
    }

    
    let feedback = document.getElementById(field + "Error");
    if (feedback === null) {
        feedback = document.createElement("div");
        feedback.id = field + "Error";
        feedback.className = "invalid-feedback";
        input.parentNode.appendChild(feedback);
    }
    feedback.textContent = error;
    return error === "";
}

// JSON table section
const section = document.createElement("div");
section.className = "event-info text-start";
section.innerHTML = `
    <h2 class="h4">Registered Attendees (<span id="count">0</span>)</h2>
    <table class="table table-striped">
        <thead><tr><th>Name</th><th>Age</th><th>Email</th><th>Address</th></tr></thead>
        <tbody id="attendees"></tbody>
    </table>`;
    
const card = form.parentNode;
card.parentNode.appendChild(section);

function render() {
    const tbody = document.getElementById("attendees");
    tbody.innerHTML = "";
    registrations.forEach((r) => {
        const row = document.createElement("tr");
        const values = [r.name, r.age, r.email, r.address];
        values.forEach((val) => {
            const cell = document.createElement("td");
            cell.textContent = val; 
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
    document.getElementById("count").textContent = registrations.length;
    
}

// Load data from data.json
function loadData() {
    return fetch("data.json")
        .then((response) => response.json())
        .then((data) => {
            registrations = data.registrations;
        })
        .catch((error) => {
            alert("Couldn't load data.json. Open the page with Live Server.");
        });
}

// Events
formFields.forEach((f) => {
    document.getElementById(f).addEventListener("blur", () => validate(f));
});

form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Validate fields
    let isFormValid = true;
for (let i = 0; i < formFields.length; i++) {
    if (!validate(formFields[i])) {
        isFormValid = false;
    }
}
if (!isFormValid) {
    return;
}
    alert("Thanks for registering!");

    for (let i = 0; i < formFields.length; i++) {
    const input = document.getElementById(formFields[i]);
    input.value = "";
    input.classList.remove("is-valid");
}
});
loadData().then(render);
