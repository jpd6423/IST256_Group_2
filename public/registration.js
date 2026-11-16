const { useState, useEffect } = React;

// Conference sessions offered at Connect Summit 2026
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

// Our Express + MongoDB REST API (served by server.js)
const API_URL = "/api/registrations";

// ==========================================
// fetch() helper: sends/receives JSON, throws on errors
// ==========================================
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
    const [saving, setSaving] = useState(false);

    // ==========================================
    // READ - load registrations from MongoDB
    // ==========================================
    async function loadRegistrations() {
        try {
            const data = await api(API_URL);                // GET /api/registrations
            setRegistrations(data);
        } catch (error) {
            setStatus("Could not load registrations. Is the server running (node server.js)?");
        }
    }

    useEffect(() => {
        loadRegistrations();
    }, []);

    function handleSessionChange(session) {
        if (selectedSessions.includes(session.name)) {
            setSelectedSessions(selectedSessions.filter(name => name !== session.name));
        } else {
            setSelectedSessions([...selectedSessions, session.name]);
        }
    }

    function validateForm() {
        let newErrors = {};

        if (!/^[A-Za-z][A-Za-z\s'-]{1,49}$/.test(fullName.trim())) {
            newErrors.fullName = "Enter your full name (letters only).";
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            newErrors.email = "Enter a valid email address.";
        }
        if (selectedSessions.length === 0) {
            newErrors.sessions = "Select at least one conference session.";
        }
        if (participation === "") {
            newErrors.participation = "Choose a participation type.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function resetForm() {
        setFullName("");
        setEmail("");
        setSelectedSessions([]);
        setParticipation("");
        setEditingId("");
        setErrors({});
    }

    // ==========================================
    // CREATE / UPDATE - send registration to the REST API
    // ==========================================
    async function handleSubmit(event) {
        event.preventDefault();

        if (!validateForm()) {
            setStatus("Please correct the form errors.");
            return;
        }

        // Sessions in conference order, with their times
        let sessionList = conferenceSessions
            .filter(session => selectedSessions.includes(session.name))
            .map(session => ({ name: session.name, time: session.time }));

        let registrationData = {
            name: fullName.trim(),
            email: email.trim(),
            participation: participation,
            sessions: sessionList
        };

        setSaving(true);
        setStatus(editingId ? "Saving changes..." : "Sending registration to the server...");

        try {
            let saved;
            if (editingId) {
                // PUT /api/registrations/:confirmationNumber
                saved = await api(API_URL + "/" + editingId, "PUT", registrationData);
                setStatus("Registration " + saved.confirmationNumber + " was updated in the database.");
            } else {
                // POST /api/registrations (server creates the confirmation number)
                saved = await api(API_URL, "POST", registrationData);
                setStatus("Registration " + saved.confirmationNumber + " was saved to the database.");
            }

            setConfirmation(saved);
            resetForm();
            await loadRegistrations();
            window.scrollTo(0, 0);
        } catch (error) {
            // Map server validation errors onto the form
            let serverErrors = {};
            if (error.fieldErrors.name) serverErrors.fullName = error.fieldErrors.name;
            if (error.fieldErrors.email) serverErrors.email = error.fieldErrors.email;
            if (error.fieldErrors.sessions) serverErrors.sessions = error.fieldErrors.sessions;
            if (error.fieldErrors.participation) serverErrors.participation = error.fieldErrors.participation;
            setErrors(serverErrors);
            setStatus(error.message);
        } finally {
            setSaving(false);
        }
    }

    // ==========================================
    // UPDATE - load a registration into the form
    // ==========================================
    function editRegistration(registration) {
        if (!registration) return;

        setFullName(registration.name);
        setEmail(registration.email);
        setParticipation(registration.participation);
        setSelectedSessions(registration.sessions.map(session => session.name));
        setEditingId(registration.confirmationNumber);

        setConfirmation(null);
        setErrors({});
        setStatus("Editing " + registration.confirmationNumber + ".");

        window.scrollTo(0, 0);
    }

    // ==========================================
    // DELETE - remove a registration from MongoDB
    // ==========================================
    async function deleteRegistration(registration) {
        if (!confirm("Delete registration " + registration.confirmationNumber + "?")) return;

        try {
            // DELETE /api/registrations/:confirmationNumber
            await api(API_URL + "/" + registration.confirmationNumber, "DELETE");
            setStatus("Registration " + registration.confirmationNumber + " was deleted.");

            if (editingId === registration.confirmationNumber) resetForm();
            if (confirmation && confirmation.confirmationNumber === registration.confirmationNumber) {
                setConfirmation(null);
            }
            await loadRegistrations();
        } catch (error) {
            setStatus(error.message);
        }
    }

    // Only show the fields that matter in the JSON preview
    function displayJSON(r) {
        return {
            confirmationNumber: r.confirmationNumber,
            name: r.name,
            email: r.email,
            participation: r.participation,
            location: r.location,
            date: r.date,
            sessions: r.sessions
        };
    }

    return (
        <div>

            {!confirmation ? (

                <div className="event-info text-start">

                    <h1 className="text-center mb-2">
                        {editingId ? "Edit Registration" : "Conference Registration"}
                    </h1>

                    <p className="text-center mb-4">
                        {editingId
                            ? "Updating " + editingId
                            : "Register for Connect Summit 2026"}
                    </p>

                    <form onSubmit={handleSubmit} noValidate>

                        {/* Attendee Information */}
                        <h2 className="h5 mb-3">1. Your Information</h2>

                        <div className="row g-3 mb-4">

                            <div className="col-md-6">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className={"form-control " + (errors.fullName ? "is-invalid" : "")}
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                />
                                {errors.fullName && (
                                    <div className="invalid-feedback">{errors.fullName}</div>
                                )}
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    className={"form-control " + (errors.email ? "is-invalid" : "")}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                                {errors.email && (
                                    <div className="invalid-feedback">{errors.email}</div>
                                )}
                            </div>

                        </div>

                        {/* Session Selection */}
                        <h2 className="h5 mb-3">2. Session Registration</h2>

                        <div className="list-group mb-3">
                            {conferenceSessions.map(session => (
                                <label className="list-group-item" key={session.name}>
                                    <input
                                        type="checkbox"
                                        className="form-check-input me-2"
                                        checked={selectedSessions.includes(session.name)}
                                        onChange={() => handleSessionChange(session)}
                                    />
                                    <strong>{session.name}</strong>
                                    <span className="badge bg-primary float-end">{session.time}</span>
                                    <small className="d-block text-muted ms-4">{session.description}</small>
                                </label>
                            ))}
                        </div>

                        {errors.sessions && (
                            <p className="text-danger">{errors.sessions}</p>
                        )}

                        {/* Participation Type */}
                        <h2 className="h5 mt-4 mb-3">3. Participation Type</h2>

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
                                            onChange={e => setParticipation(e.target.value)}
                                        />
                                        <strong>{type}</strong>
                                    </label>
                                </div>
                            ))}
                        </div>

                        {errors.participation && (
                            <p className="text-danger">{errors.participation}</p>
                        )}

                        <button
                            type="submit"
                            className="register-btn border-0 w-100 mt-3"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : editingId ? "Update Registration" : "Confirm Registration"}
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary w-100 mt-2"
                                onClick={() => { resetForm(); setStatus(""); }}
                            >
                                Cancel Edit
                            </button>
                        )}

                    </form>

                </div>

            ) : (

                /* Confirmation Page */
                <div className="event-info text-start">

                    <h1 className="text-center mb-3">Registration Saved!</h1>

                    <p><strong>Confirmation Number:</strong> {confirmation.confirmationNumber}</p>
                    <p><strong>Name:</strong> {confirmation.name}</p>
                    <p><strong>Email:</strong> {confirmation.email}</p>
                    <p><strong>Participation:</strong> {confirmation.participation}</p>
                    <p><strong>Location:</strong> {confirmation.location}</p>
                    <p><strong>Date:</strong> {confirmation.date}</p>

                    <h3 className="h5 mt-3">Selected Sessions</h3>

                    <ul className="list-group mb-4">
                        {confirmation.sessions.map(session => (
                            <li className="list-group-item" key={session.name}>
                                {session.name} — {session.time}
                            </li>
                        ))}
                    </ul>

                    <h3 className="h5">Registration JSON (from MongoDB)</h3>

                    <pre className="bg-light border rounded p-3 small"
                        style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                        {JSON.stringify(displayJSON(confirmation), null, 2)}
                    </pre>

                    <button
                        type="button"
                        className="register-btn border-0 me-2"
                        onClick={() => editRegistration(confirmation)}
                    >
                        Edit Registration
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => { setConfirmation(null); setStatus(""); }}
                    >
                        New Registration
                    </button>

                </div>

            )}

            {/* API Status Message */}
            {status && (
                <div className="alert alert-info mt-3">{status}</div>
            )}

            {/* Registered Attendees Table */}
            <div className="event-info text-start mt-4">

                <h2 className="h4">Registered Attendees ({registrations.length})</h2>
                <p className="text-muted small mb-2">Loaded live from MongoDB.</p>

                <div className="table-responsive">
                    <table className="table table-striped align-middle">
                        <thead>
                            <tr>
                                <th>Confirmation #</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Sessions</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.map(r => (
                                <tr key={r.confirmationNumber}>
                                    <td>{r.confirmationNumber}</td>
                                    <td>{r.name}</td>
                                    <td>{r.participation}</td>
                                    <td>{r.sessions.map(s => s.name).join(", ")}</td>
                                    <td className="text-nowrap">
                                        <button
                                            className="btn btn-sm btn-outline-primary me-1"
                                            onClick={() => editRegistration(r)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => deleteRegistration(r)}
                                        >
                                            Delete
                                        </button>
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
const root = ReactDOM.createRoot(document.getElementById("react-root"));

root.render(<Registration />);