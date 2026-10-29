const regForm = document.getElementById("registrationForm");
const nameInput = document.getElementById("fullName");
const emailInput = document.getElementById("regEmail");

// Mark a text input valid/invalid with Bootstrap classes
function checkInput(input, isValid) {
    input.classList.toggle("is-invalid", !isValid);
    input.classList.toggle("is-valid", isValid);
    return isValid;
}

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
    document.getElementById("confirmNumber").textContent = "CS26-" + Math.floor(100000 + Math.random() * 900000);
    document.getElementById("confirmName").textContent = name;
    document.getElementById("confirmEmail").textContent = email;
    document.getElementById("confirmType").textContent = participation.value;
    document.getElementById("confirmLocation").textContent =
        participation.value === "Virtual" ? "Online (stream link sent by email)" : "Philadelphia, PA";

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

    document.getElementById("registrationCard").classList.add("d-none");
    document.getElementById("confirmationCard").classList.remove("d-none");
    window.scrollTo(0, 0);
});

// Go back to the form with the previous answers kept
document.getElementById("editBtn").addEventListener("click", () => {
    document.getElementById("confirmationCard").classList.add("d-none");
    document.getElementById("registrationCard").classList.remove("d-none");
});