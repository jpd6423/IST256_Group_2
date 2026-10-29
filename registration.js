const regForm = document.getElementById("registrationForm");
const nameInput = document.getElementById("fullName");
const emailInput = document.getElementById("regEmail");
 
// Leave as "" until the real RESTful API exists (same idea as cart.js)
const API_URL = "";
 
let registrations = [];
 
// Mark a text input valid/invalid with Bootstrap classes
function checkInput(input, isValid) {
    input.classList.toggle("is-invalid", !isValid);
    input.classList.toggle("is-valid", isValid);
    return isValid;
}
 
// ==========================================================
// JSON + jQuery: load registration.json and show the table
// ==========================================================
 
// Use localStorage if it has data, otherwise load registration.json
function loadRegistrations() {
    let saved = localStorage.getItem("localRegistrations");
 
    if (saved !== null) {
        registrations = JSON.parse(saved).registrations;
        showRegistrations();
        return;
    }
 
    $.getJSON("registration.json", function (data) {
        registrations = data.registrations;
        showRegistrations();
    }).fail(function () {
        console.log("Couldn't load registration.json. Open the page with Live Server.");
    });
}
 
function saveRegistrations() {
    localStorage.setItem("localRegistrations", JSON.stringify({ registrations: registrations }));
}
 
// Build the attendee table with jQuery
function showRegistrations() {
    $("#regTableBody").html("");
 
    for (let i = 0; i < registrations.length; i++) {
        let r = registrations[i];
 
        let sessionNames = [];
        for (let j = 0; j < r.sessions.length; j++) {
            sessionNames.push(r.sessions[j].name);
        }
 
        let row = $("<tr></tr>");
        row.append($("<td></td>").text(r.confirmationNumber));
        row.append($("<td></td>").text(r.name));
        row.append($("<td></td>").text(r.participation));
        row.append($("<td></td>").text(sessionNames.join(", ")));
        $("#regTableBody").append(row);
    }
 
    $("#regCount").text(registrations.length);
}
 
// ==========================================================
// Form submit (original code + JSON object + AJAX call)
// ==========================================================
 
regForm.addEventListener("submit", (e) => {
    e.preventDefault();
 
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const sessions = Array.from(document.querySelectorAll("input[name='session']:checked"));
    const participation = document.querySelector("input[name='participation']:checked");
 
    let isFormValid = true;
 
    if (!checkInput(nameInput, /^[A-Za-z][A-Za-z\s'-]{1,49}$/.test(name))) isFormValid = false;
    if (!checkInput(emailInput, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) isFormValid = false;
 
    document.getElementById("sessionError").classList.toggle("d-none", sessions.length > 0);
    document.getElementById("participationError").classList.toggle("d-none", participation !== null);
 
    if (sessions.length === 0 || participation === null) isFormValid = false;
 
    if (!isFormValid) {
        return;
    }
 
    // Fill in confirmation details
    const confirmNumber = "CS26-" + Math.floor(100000 + Math.random() * 900000);
    const location = participation.value === "Virtual" ? "Online (stream link sent by email)" : "Philadelphia, PA";
 
    document.getElementById("confirmNumber").textContent = confirmNumber;
    document.getElementById("confirmName").textContent = name;
    document.getElementById("confirmEmail").textContent = email;
    document.getElementById("confirmType").textContent = participation.value;
    document.getElementById("confirmLocation").textContent = location;
 
    const list = document.getElementById("confirmSessions");
    list.innerHTML = "";
 
    sessions.forEach((s) => {
        const item = document.createElement("li");
        item.className = "list-group-item d-flex justify-content-between";
        item.textContent = s.value;
 
        const time = document.createElement("span");
        time.className = "text-muted";
        time.textContent = s.dataset.time;
 
        item.appendChild(time);
        list.appendChild(item);
    });
 
    // ----- Create the JSON object with the user's choices -----
    let sessionList = [];
    sessions.forEach((s) => {
        sessionList.push({ name: s.value, time: s.dataset.time });
    });
 
    let registrationData = {
        confirmationNumber: confirmNumber,
        name: name,
        email: email,
        participation: participation.value,
        location: location,
        date: "November 15, 2026",
        sessions: sessionList
    };
 
    registrations.push(registrationData);
    saveRegistrations();
    showRegistrations();
 
    // Show the JSON on the page and in the console
    let jsonText = JSON.stringify(registrationData, null, 2);
    $("#jsonOutput").text(jsonText);
    console.log("Registration JSON:");
    console.log(jsonText);
 
    document.getElementById("registrationCard").classList.add("d-none");
    document.getElementById("confirmationCard").classList.remove("d-none");
    window.scrollTo(0, 0);
 
    sendRegistration(registrationData);
});
 
// Go back to the form with the previous answers kept
document.getElementById("editBtn").addEventListener("click", () => {
    document.getElementById("confirmationCard").classList.add("d-none");
    document.getElementById("registrationCard").classList.remove("d-none");
});
 
// ==========================================================
// AJAX PLACEHOLDER
// TODO (AJAX): send the registration JSON to the RESTful API.
//
// $.ajax({
//     url: API_URL,
//     type: "POST",
//     contentType: "application/json",
//     data: JSON.stringify(registrationData),
//     success: function () { /* show success message */ },
//     error: function () { /* show error message */ }
// });
// ==========================================================
function sendRegistration(registrationData) {
    if (API_URL === "") {
        console.log("AJAX placeholder: API not connected yet. Data that would be sent:");
        console.log(registrationData);
        return;
    }
 
    // TODO (AJAX): put the $.ajax() call from above here
}
 
// ==========================================================
// REACT PLACEHOLDER
// TODO (React): build the registration form/state with React inside
// <div id="react-root"> in registration.html. Keep the form fields in
// state (useState) and call the REST service (fetch/axios) to submit
// registrationData.
// ==========================================================
 
loadRegistrations();
 