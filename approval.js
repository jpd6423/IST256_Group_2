/*
 * approval.js - Session Proposal Review / Approval (client side)
 *
 * Reads the same data as proposal.js (localStorage "sessionProposals",
 * falling back to proposals.json), lists proposals, and lets a reviewer
 * Approve, Reject, or Request Revisions with integrity checks.
 *
 * Element IDs expected in approval.html:
 *   List:      #approvalTableBody (the <tbody> of the proposals table)
 *   Filters:   #statusFilter (select), #searchInput (text) - both optional
 *   Counts:    #countPending, #countApproved, #countRejected, #countRevisions (optional)
 *   Review:    #reviewPanel (container, hidden with Bootstrap "d-none" until a row is picked)
 *              #reviewDetails (where the selected proposal is shown)
 *              #reviewerName, #reviewComments (textarea)
 *              #approveBtn, #rejectBtn, #reviseBtn, #cancelReviewBtn
 *   Messages:  #approvalStatus (alert area)
 *   Tools:     #exportBtn (download JSON), #resetDataBtn (reload proposals.json) - optional
 *
 * Open with Live Server (fetch does not work from file://).
 */

const STORAGE_KEY = "sessionProposals";
const DATA_FILE = "proposals.json";

// Statuses a reviewer is allowed to act on. Approved / Rejected are final.
const REVIEWABLE = ["Pending", "Revisions Requested"];

// Max approved sessions allowed per type (types not listed have no limit)
const APPROVAL_LIMITS = { "Keynote": 1 };

let proposalData = { event: {}, options: {}, proposals: [] };
let selectedId = null;

// ---------- Data loading / saving ----------

function loadFromFile() {
    return fetch(DATA_FILE)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        });
}

function loadProposalData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
        try {
            const data = JSON.parse(saved);
            if (Array.isArray(data.proposals)) {
                return Promise.resolve(data);
            }
        } catch (error) {
            console.error("Invalid saved proposal JSON, reloading file:", error);
        }
    }
    return loadFromFile();
}

function setData(data) {
    proposalData = {
        event: data.event || {},
        options: data.options || {},
        proposals: Array.isArray(data.proposals) ? data.proposals : []
    };
    saveProposalData();
}

function saveProposalData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proposalData));
}

// ---------- Helpers ----------

function $id(id) {
    return document.getElementById(id);
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function fieldValue(id) {
    const el = $id(id);
    return el ? el.value.trim() : "";
}

function formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function findProposal(id) {
    return proposalData.proposals.find(function (p) { return p.proposalId === id; });
}

function showStatus(message, type) {
    const box = $id("approvalStatus");
    if (!box) {
        alert(message.replace(/<[^>]+>/g, ""));
        return;
    }
    box.className = "alert alert-" + type + " mt-3";
    box.innerHTML = message;
}

const statusBadge = {
    "Pending": "bg-warning text-dark",
    "Approved": "bg-success",
    "Rejected": "bg-danger",
    "Revisions Requested": "bg-info text-dark"
};

function badge(status) {
    return '<span class="badge ' + (statusBadge[status] || "bg-secondary") + '">' + escapeHtml(status) + "</span>";
}

function setFieldError(id, error) {
    const input = $id(id);
    if (!input) return;

    input.classList.toggle("is-invalid", error !== "");
    input.classList.toggle("is-valid", error === "");

    let feedback = $id(id + "Error");
    if (feedback === null) {
        feedback = document.createElement("div");
        feedback.id = id + "Error";
        feedback.className = "invalid-feedback";
        input.insertAdjacentElement("afterend", feedback);
    }
    feedback.textContent = error;
}

function clearFieldState(id) {
    const input = $id(id);
    if (input) input.classList.remove("is-valid", "is-invalid");
}

// ---------- Table / counts ----------

function renderCounts() {
    const count = function (status) {
        return proposalData.proposals.filter(function (p) { return p.status === status; }).length;
    };
    const map = {
        countPending: "Pending",
        countApproved: "Approved",
        countRejected: "Rejected",
        countRevisions: "Revisions Requested"
    };
    Object.keys(map).forEach(function (id) {
        const el = $id(id);
        if (el) el.textContent = count(map[id]);
    });
}

function filteredProposals() {
    const status = fieldValue("statusFilter");
    const search = fieldValue("searchInput").toLowerCase();

    return proposalData.proposals.filter(function (p) {
        if (status !== "" && status !== "All" && p.status !== status) return false;
        if (search === "") return true;

        const haystack = [p.proposalId, p.title, p.speaker.name, p.speaker.email, p.track, p.sessionType]
            .concat(p.keywords || [])
            .join(" ")
            .toLowerCase();
        return haystack.includes(search);
    });
}

function renderTable() {
    const body = $id("approvalTableBody");
    if (!body) return;

    const rows = filteredProposals();
    if (rows.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="text-center">No proposals match.</td></tr>';
        renderCounts();
        return;
    }

    body.innerHTML = rows.map(function (p) {
        const canReview = REVIEWABLE.includes(p.status);
        return "<tr" + (p.proposalId === selectedId ? ' class="table-active"' : "") + ">" +
            "<td>" + escapeHtml(p.proposalId) + "</td>" +
            "<td>" + escapeHtml(p.title) + "</td>" +
            "<td>" + escapeHtml(p.speaker.name) + "</td>" +
            "<td>" + escapeHtml(p.sessionType) + " (" + escapeHtml(p.durationMinutes) + " min)</td>" +
            "<td>" + escapeHtml(p.track) + "</td>" +
            "<td>" + badge(p.status) + "</td>" +
            '<td><button type="button" class="btn btn-sm ' + (canReview ? "btn-primary" : "btn-outline-secondary") +
            '" data-id="' + escapeHtml(p.proposalId) + '">' + (canReview ? "Review" : "View") + "</button></td>" +
            "</tr>";
    }).join("");

    renderCounts();
}

// ---------- Review panel ----------

function renderDetails(p) {
    const details = $id("reviewDetails");
    if (!details) return;

    const history = (p.history || []).map(function (h) {
        return "<li>" + badge(h.status) + " " + escapeHtml(formatDate(h.at)) + " by " +
            escapeHtml(h.by) + (h.note ? " - " + escapeHtml(h.note) : "") + "</li>";
    }).join("");

    details.innerHTML =
        "<h3 class=\"h5\">" + escapeHtml(p.proposalId) + ": " + escapeHtml(p.title) + " " + badge(p.status) + "</h3>" +
        "<p><strong>Speaker:</strong> " + escapeHtml(p.speaker.name) + " (" + escapeHtml(p.speaker.email) + ")" +
        (p.speaker.organization ? ", " + escapeHtml(p.speaker.organization) : "") + "</p>" +
        "<p><strong>Bio:</strong> " + escapeHtml(p.speaker.bio) + "</p>" +
        "<p><strong>Session:</strong> " + escapeHtml(p.sessionType) + ", " + escapeHtml(p.durationMinutes) + " min, " +
        escapeHtml(p.format) + ", " + escapeHtml(p.audienceLevel) + " - " + escapeHtml(p.track) + " track</p>" +
        "<p><strong>Abstract:</strong> " + escapeHtml(p.abstract) + "</p>" +
        "<p><strong>Keywords:</strong> " + escapeHtml((p.keywords || []).join(", ") || "-") + "</p>" +
        "<p><strong>A/V needs:</strong> " + escapeHtml((p.avNeeds || []).join(", ") || "None") + "</p>" +
        "<p><strong>Submitted:</strong> " + escapeHtml(formatDate(p.submittedAt)) + "</p>" +
        (history ? "<p class=\"mb-1\"><strong>History:</strong></p><ul class=\"small\">" + history + "</ul>" : "");
}

function openReview(id) {
    const p = findProposal(id);
    if (!p) return;

    selectedId = id;
    renderDetails(p);

    const canReview = REVIEWABLE.includes(p.status);
    ["reviewerName", "reviewComments", "approveBtn", "rejectBtn", "reviseBtn"].forEach(function (elId) {
        const el = $id(elId);
        if (el) el.disabled = !canReview;
    });

    const comments = $id("reviewComments");
    if (comments) comments.value = "";
    clearFieldState("reviewerName");
    clearFieldState("reviewComments");

    if (!canReview) {
        showStatus("This proposal is <strong>" + escapeHtml(p.status) + "</strong>. Final decisions cannot be changed.", "secondary");
    } else {
        const box = $id("approvalStatus");
        if (box) { box.className = "d-none"; box.innerHTML = ""; }
    }

    const panel = $id("reviewPanel");
    if (panel) {
        panel.classList.remove("d-none");
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    renderTable();
}

function closeReview() {
    selectedId = null;
    const panel = $id("reviewPanel");
    if (panel) panel.classList.add("d-none");
    renderTable();
}

// ---------- Decision integrity checks ----------

function validateDecision(p, decision) {
    let ok = true;
    const reviewer = fieldValue("reviewerName");
    const comments = fieldValue("reviewComments");

    // Reviewer name
    let reviewerError = "";
    if (reviewer === "") {
        reviewerError = "Reviewer name is required.";
    } else if (!/^[A-Za-z][A-Za-z\s.'-]{1,59}$/.test(reviewer)) {
        reviewerError = "Use 2-60 letters for the reviewer name.";
    } else if (reviewer.toLowerCase() === p.speaker.name.toLowerCase()) {
        reviewerError = "Speakers cannot review their own proposal.";
    }
    setFieldError("reviewerName", reviewerError);
    if (reviewerError) ok = false;

    // Comments are required when rejecting or asking for changes
    let commentError = "";
    if (decision !== "Approved" && comments.length < 10) {
        commentError = "Please give the speaker at least 10 characters of feedback.";
    } else if (comments.length > 1000) {
        commentError = "Comments must be 1000 characters or less.";
    }
    setFieldError("reviewComments", commentError);
    if (commentError) ok = false;

    if (!ok) return "Please fix the highlighted review fields.";

    // Status rules
    if (!REVIEWABLE.includes(p.status)) {
        return "This proposal is already " + p.status + ".";
    }
    if (decision === p.status) {
        return "This proposal is already marked " + p.status + ".";
    }

    // Capacity rules (e.g. only one approved Keynote)
    if (decision === "Approved" && APPROVAL_LIMITS[p.sessionType] !== undefined) {
        const approvedOfType = proposalData.proposals.filter(function (other) {
            return other.status === "Approved" && other.sessionType === p.sessionType;
        }).length;
        if (approvedOfType >= APPROVAL_LIMITS[p.sessionType]) {
            return "The limit of " + APPROVAL_LIMITS[p.sessionType] + " approved " + p.sessionType +
                " session(s) has been reached.";
        }
    }

    return "";
}

function decide(decision) {
    const p = findProposal(selectedId);
    if (!p) {
        showStatus("Select a proposal to review first.", "warning");
        return;
    }

    const error = validateDecision(p, decision);
    if (error) {
        showStatus(escapeHtml(error), "danger");
        return;
    }

    if ((decision === "Approved" || decision === "Rejected") &&
        !confirm(decision + " \"" + p.title + "\"? This decision is final.")) {
        return;
    }

    const now = new Date().toISOString();
    const reviewer = fieldValue("reviewerName");
    const comments = fieldValue("reviewComments");

    p.status = decision;
    p.review = { reviewer: reviewer, reviewedAt: now, comments: comments };
    p.history = p.history || [];
    p.history.push({ status: decision, by: reviewer, at: now, note: comments });

    saveProposalData();
    openReview(p.proposalId);
    showStatus("<strong>" + escapeHtml(p.proposalId) + "</strong> marked " + badge(decision) + ".", "success");
}

// ---------- Tools ----------

function exportJson() {
    const blob = new Blob([JSON.stringify(proposalData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "proposals.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
}

function resetData() {
    if (!confirm("Discard all saved changes and reload proposals.json?")) return;
    localStorage.removeItem(STORAGE_KEY);
    loadFromFile()
        .then(function (data) {
            setData(data);
            closeReview();
            showStatus("Data reloaded from " + DATA_FILE + ".", "info");
        })
        .catch(function (error) {
            console.error(error);
            showStatus("Could not load " + DATA_FILE + ". Open the page with Live Server.", "danger");
        });
}

// ---------- Start ----------

function setupFilters() {
    const statusFilter = $id("statusFilter");
    if (statusFilter && statusFilter.options.length <= 1) {
        statusFilter.innerHTML = '<option value="">All statuses</option>' +
            (proposalData.options.statuses || Object.keys(statusBadge)).map(function (s) {
                return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + "</option>";
            }).join("");
    }
    if (statusFilter) statusFilter.addEventListener("change", renderTable);

    const search = $id("searchInput");
    if (search) search.addEventListener("input", renderTable);
}

document.addEventListener("DOMContentLoaded", function () {
    if (!$id("approvalTableBody")) {
        console.error("approval.js: #approvalTableBody not found in the page.");
        return;
    }

    // One click handler for every Review / View button in the table
    $id("approvalTableBody").addEventListener("click", function (event) {
        const button = event.target.closest("button[data-id]");
        if (button) openReview(button.dataset.id);
    });

    const actions = {
        approveBtn: function () { decide("Approved"); },
        rejectBtn: function () { decide("Rejected"); },
        reviseBtn: function () { decide("Revisions Requested"); },
        cancelReviewBtn: closeReview,
        exportBtn: exportJson,
        resetDataBtn: resetData
    };
    Object.keys(actions).forEach(function (id) {
        const el = $id(id);
        if (el) el.addEventListener("click", actions[id]);
    });

    // Keep this page in sync if a proposal is submitted in another tab
    window.addEventListener("storage", function (event) {
        if (event.key !== STORAGE_KEY || event.newValue === null) return;
        try {
            const data = JSON.parse(event.newValue);
            proposalData = data;
            renderTable();
        } catch (error) {
            console.error(error);
        }
    });

    loadProposalData()
        .then(function (data) {
            setData(data);
            setupFilters();
            renderTable();
        })
        .catch(function (error) {
            console.error(error);
            showStatus("Could not load " + DATA_FILE + ". Open the page with Live Server.", "danger");
        });
});
