const { useState, useEffect } = React;

// Conference sessions from your registration.html
const conferenceSessions = [
    {
        name: "Opening Keynote",
        time: "9:00 AM - 10:00 AM",
        description: "Welcome and the year ahead for the community."
    },
    {
        name: "Networking Workshop",
        time: "10:30 AM - 12:00 PM",
        description: "Hands-on activities to meet other attendees."
    },
    {
        name: "Panel Discussion",
        time: "1:00 PM - 2:30 PM",
        description: "Guest speakers answer audience questions."
    },
    {
        name: "Closing Social",
        time: "3:30 PM - 5:00 PM",
        description: "Wrap up the day with food and conversation."
    }
];

// Replace with a real API address when available
const API_URL = "https://jsonplaceholder.typicode.com/posts";

function Registration() {



    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [selectedSessions, setSelectedSessions] = useState([]);
    const [participation, setParticipation] = useState("");

    const [registrations, setRegistrations] = useState([]);
    const [confirmation, setConfirmation] = useState(null);

    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState("");
    const [editingId, setEditingId] = useState("");



    useEffect(() => {

        let saved = localStorage.getItem("localRegistrations");

        if (saved !== null) {
            try {
                let data = JSON.parse(saved);

                if (Array.isArray(data.registrations)) {
                    setRegistrations(data.registrations);
                    return;
                }
            } catch (error) {
                console.error("Invalid saved JSON:", error);
            }
        }

        $.getJSON("registration.json", function (data) {

            if (Array.isArray(data.registrations)) {
                setRegistrations(data.registrations);
            }

        }).fail(function () {
            setStatus(
                "Could not load registration.json. Use Live Server."
            );
        });

    }, []);

 

    function handleSessionChange(session) {

        if (selectedSessions.includes(session.name)) {

            setSelectedSessions(
                selectedSessions.filter(
                    name => name !== session.name
                )
            );

        } else {

            setSelectedSessions([
                ...selectedSessions,
                session.name
            ]);

        }
    }

   

    function validateForm() {

        let newErrors = {};

        if (!/^[A-Za-z][A-Za-z\s'-]{1,49}$/.test(fullName.trim())) {
            newErrors.fullName =
                "Enter your full name (letters only).";
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            newErrors.email =
                "Enter a valid email address.";
        }

        if (selectedSessions.length === 0) {
            newErrors.sessions =
                "Select at least one conference session.";
        }

        if (participation === "") {
            newErrors.participation =
                "Choose a participation type.";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    }

   

    function saveRegistrationData(updatedRegistrations) {

        let data = {
            registrations: updatedRegistrations
        };

        localStorage.setItem(
            "localRegistrations",
            JSON.stringify(data)
        );

        setRegistrations(updatedRegistrations);
    }

    // ==========================================
    // 6. AJAX REQUEST TO RESTFUL API
    // ==========================================

    function sendRegistration(registrationData) {

        if (API_URL === "") {
            console.log("JSON prepared for REST API:");
            console.log(JSON.stringify(registrationData, null, 2));
            setStatus("Registration saved locally. REST API is not connected yet.");
            return;
        }

        setStatus("Sending registration to API...");

        $.ajax({
            url: API_URL,
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(registrationData),

            success: function (response) {
                console.log("API response:", response);
                setStatus(
                    "Registration " + response.confirmationNumber +
                    " was sent to the API! Server response ID: " + response.id
                );
            },

            error: function (xhr, textStatus, error) {
                console.log("AJAX error: " + textStatus + " " + error);
                setStatus("Registration saved locally, but the API request failed.");
            }
        });
    }

 

    function handleSubmit(event) {

        event.preventDefault();

        if (!validateForm()) {
            setStatus("Please correct the form errors.");
            return;
        }

        // Reuse confirmation number when editing
        let confirmNumber = editingId;

        if (!confirmNumber) {
            do {
                confirmNumber =
                    "CS26-" +
                    Math.floor(100000 + Math.random() * 900000);
            } while (
                registrations.some(
                    r => r.confirmationNumber === confirmNumber
                )
            );
        }

        let location =
            participation === "Virtual"
                ? "Online (stream link sent by email)"
                : "Philadelphia, PA";

        let sessionList = conferenceSessions
            .filter(session =>
                selectedSessions.includes(session.name)
            )
            .map(session => ({
                name: session.name,
                time: session.time
            }));

        // Create JSON object matching registration.json
        let registrationData = {

            confirmationNumber: confirmNumber,

            name: fullName.trim(),

            email: email.trim(),

            participation: participation,

            location: location,

            date: "November 15, 2026",

            sessions: sessionList

        };

        let updatedRegistrations;

        if (editingId) {

            updatedRegistrations = registrations.map(r =>
                r.confirmationNumber === editingId
                    ? registrationData
                    : r
            );

        } else {

            updatedRegistrations = [
                ...registrations,
                registrationData
            ];

        }

        saveRegistrationData(updatedRegistrations);

        setConfirmation(registrationData);
        setErrors({});

        // Prepare/send JSON with AJAX
        sendRegistration(registrationData);

        window.scrollTo(0, 0);
    }

    function editRegistration() {

        if (!confirmation) return;

        setFullName(confirmation.name);
        setEmail(confirmation.email);

        setParticipation(confirmation.participation);

        setSelectedSessions(
            confirmation.sessions.map(session => session.name)
        );

        setEditingId(confirmation.confirmationNumber);

        setConfirmation(null);
        setErrors({});
        setStatus("");

        window.scrollTo(0, 0);
    }


    return (
        <div>

            {!confirmation ? (

                <div className="event-info text-start">

                    <h1 className="text-center mb-2">
                        Conference Registration
                    </h1>

                    <p className="text-center mb-4">
                        Register for Connect Summit 2026
                    </p>

                    <form onSubmit={handleSubmit} noValidate>

                        {/* Attendee Information */}
                        <h2 className="h5 mb-3">
                            1. Your Information
                        </h2>

                        <div className="row g-3 mb-4">

                            <div className="col-md-6">

                                <label className="form-label">
                                    Full Name
                                </label>

                                <input
                                    type="text"
                                    className={
                                        "form-control " +
                                        (errors.fullName
                                            ? "is-invalid"
                                            : "")
                                    }
                                    value={fullName}
                                    onChange={e =>
                                        setFullName(e.target.value)
                                    }
                                />

                                {errors.fullName && (
                                    <div className="invalid-feedback">
                                        {errors.fullName}
                                    </div>
                                )}

                            </div>

                            <div className="col-md-6">

                                <label className="form-label">
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    className={
                                        "form-control " +
                                        (errors.email
                                            ? "is-invalid"
                                            : "")
                                    }
                                    value={email}
                                    onChange={e =>
                                        setEmail(e.target.value)
                                    }
                                />

                                {errors.email && (
                                    <div className="invalid-feedback">
                                        {errors.email}
                                    </div>
                                )}

                            </div>

                        </div>

                        {/* Session Selection */}
                        <h2 className="h5 mb-3">
                            2. Session Registration
                        </h2>

                        <div className="list-group mb-3">

                            {conferenceSessions.map(session => (

                                <label
                                    className="list-group-item"
                                    key={session.name}
                                >

                                    <input
                                        type="checkbox"
                                        className="form-check-input me-2"
                                        checked={
                                            selectedSessions.includes(
                                                session.name
                                            )
                                        }
                                        onChange={() =>
                                            handleSessionChange(session)
                                        }
                                    />

                                    <strong>{session.name}</strong>

                                    <span className="badge bg-primary float-end">
                                        {session.time}
                                    </span>

                                    <small className="d-block text-muted ms-4">
                                        {session.description}
                                    </small>

                                </label>

                            ))}

                        </div>

                        {errors.sessions && (
                            <p className="text-danger">
                                {errors.sessions}
                            </p>
                        )}

                        {/* Participation Type */}
                        <h2 className="h5 mt-4 mb-3">
                            3. Participation Type
                        </h2>

                        <div className="row g-3 mb-3">

                            {["In-Person", "Virtual", "VIP"].map(type => (

                                <div className="col-md-4" key={type}>

                                    <label className="border rounded p-3 w-100">

                                        <input
                                            type="radio"
                                            className="form-check-input me-2"
                                            name="participation"
                                            value={type}
                                            checked={participation === type}
                                            onChange={e =>
                                                setParticipation(e.target.value)
                                            }
                                        />

                                        <strong>{type}</strong>

                                    </label>

                                </div>

                            ))}

                        </div>

                        {errors.participation && (
                            <p className="text-danger">
                                {errors.participation}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="register-btn border-0 w-100 mt-3"
                        >
                            {editingId
                                ? "Update Registration"
                                : "Confirm Registration"}
                        </button>

                    </form>

                </div>

            ) : (

                /* Confirmation Page */
                <div className="event-info text-start">

                    <h1 className="text-center mb-3">
                        Registration Saved!
                    </h1>

                    <p>
                        <strong>Confirmation Number:</strong>{" "}
                        {confirmation.confirmationNumber}
                    </p>

                    <p>
                        <strong>Name:</strong>{" "}
                        {confirmation.name}
                    </p>

                    <p>
                        <strong>Email:</strong>{" "}
                        {confirmation.email}
                    </p>

                    <p>
                        <strong>Participation:</strong>{" "}
                        {confirmation.participation}
                    </p>

                    <p>
                        <strong>Location:</strong>{" "}
                        {confirmation.location}
                    </p>

                    <p>
                        <strong>Date:</strong>{" "}
                        {confirmation.date}
                    </p>

                    <h3 className="h5 mt-3">
                        Selected Sessions
                    </h3>

                    <ul className="list-group mb-4">

                        {confirmation.sessions.map(session => (

                            <li
                                className="list-group-item"
                                key={session.name}
                            >
                                {session.name} — {session.time}
                            </li>

                        ))}

                    </ul>

                    <h3 className="h5">
                        Registration JSON
                    </h3>

                    <pre className="bg-light border rounded p-3 small"
                        style={{whiteSpace: "pre-wrap", overflowWrap: "anywhere"}}>
                        {JSON.stringify(confirmation, null, 2)}
                    </pre>

                    <button
                        type="button"
                        className="register-btn border-0"
                        onClick={editRegistration}
                    >
                        Edit Registration
                    </button>

                </div>

            )}

            {/* API Status Message */}
            {status && (
                <div className="alert alert-info mt-3">
                    {status}
                </div>
            )}

            {/* Registered Attendees Table */}
            <div className="event-info text-start mt-4">

                <h2 className="h4">
                    Registered Attendees ({registrations.length})
                </h2>

                <div className="table-responsive">

                    <table className="table table-striped">

                        <thead>
                            <tr>
                                <th>Confirmation #</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Sessions</th>
                            </tr>
                        </thead>

                        <tbody>

                            {registrations.map(r => (

                                <tr key={r.confirmationNumber}>

                                    <td>{r.confirmationNumber}</td>
                                    <td>{r.name}</td>
                                    <td>{r.participation}</td>

                                    <td>
                                        {r.sessions.map(s => s.name)
                                            .join(", ")}
                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}

// Render React inside registration.html
const root = ReactDOM.createRoot(
    document.getElementById("react-root")
);

root.render(<Registration />);