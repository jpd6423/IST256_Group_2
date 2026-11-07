/*
 * proposal.js - Session Proposal Submission (client side)
 *
 * Loads existing proposals (localStorage first, then proposals.json),
 * validates every field before submission, and saves new proposals
 * with status "Pending" so they show up on the approval page.
 *
 * Element IDs expected in proposal.html:
 *   Form:        #proposalForm
 *   Speaker:     #speakerName, #speakerEmail, #organization (optional), #speakerBio
 *   Session:     #sessionTitle, #sessionType (select), #track (select),
 *                #duration (select), #format (select), #audienceLevel (select)
 *   Content:     #abstract (textarea), #keywords (comma separated text)
 *   A/V needs:   checkboxes with name="avNeeds" (optional to check any)
 *   Agreement:   #agreeTerms (checkbox)
 *   Counters:    #bioCount, #abstractCount (optional, live character counts)
 *   Messages:    #proposalStatus (alert area for success / error)
 *   Status lookup (optional): #lookupEmail, #lookupBtn, #lookupResults
 *
 * Selects can be left empty in the HTML - this file fills them from proposals.json.
 * Open with Live Server (fetch does not work from file://).
 */

const STORAGE_KEY = "sessionProposals";
const DATA_FILE = "proposals.json";
const MAX_PENDING_PER_SPEAKER = 3;

let proposalData = { event: {}, options: {}, proposals: [] };

// ---------- Data loading / saving ----------

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

    return fetch(DATA_FILE)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        });
}

function saveProposalData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proposalData));
}

function nextProposalId() {
    let highest = 0;
    proposalData.proposals.forEach(function (p) {
        const num = parseInt(String(p.proposalId).replace("SP26-", ""), 10);
        if (!isNaN(num) && num > highest) {
            highest = num;
        }
    });
    return "SP26-" + String(highest + 1).padStart(4, "0");
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

function wordCount(text) {
    return text.split(/\s+/).filter(Boolean).length;
}

function parseKeywords(text) {
    return text.split(",").map(function (k) { return k.trim(); }).filter(Boolean);
}

function getSessionTypeRule(type) {
    const types = proposalData.options.sessionTypes || [];
    return types.find(function (t) { return t.value === type; });
}

function getCheckedAvNeeds() {
    return Array.from(document.querySelectorAll('input[name="avNeeds"]:checked'))
        .map(function (box) { return box.value; });
}

function showStatus(message, type) {
    const box = $id("proposalStatus");
    if (!box) {
        alert(message);
        return;
    }
    box.className = "alert alert-" + type + " mt-3";
    box.innerHTML = message;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---------- Field integrity rules ----------
// Each rule returns "" when valid, or an error message.

const rules = {
    speakerName: function (v) {
        if (v === "") return "Speaker name is required.";
        return /^[A-Za-z][A-Za-z\s.'-]{1,59}$/.test(v)
            ? "" : "Use 2-60 letters (spaces, apostrophes, periods and hyphens allowed).";
    },

    speakerEmail: function (v) {
        if (v === "") return "Email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v)) return "Enter a valid email address.";

        const pending = proposalData.proposals.filter(function (p) {
            return p.speaker.email.toLowerCase() === v.toLowerCase() && p.status === "Pending";
        }).length;
        return pending >= MAX_PENDING_PER_SPEAKER
            ? "This email already has " + MAX_PENDING_PER_SPEAKER + " pending proposals." : "";
    },

    organization: function (v) {
        return v.length <= 100 ? "" : "Organization must be 100 characters or less.";
    },

    speakerBio: function (v) {
        if (v.length < 50) return "Bio must be at least 50 characters (" + v.length + "/50).";
        return v.length <= 500 ? "" : "Bio must be 500 characters or less.";
    },

    sessionTitle: function (v) {
        if (v.length < 10) return "Title must be at least 10 characters.";
        if (v.length > 100) return "Title must be 100 characters or less.";
        if (/<|>/.test(v)) return "Title cannot contain < or >.";

        const duplicate = proposalData.proposals.some(function (p) {
            return p.title.toLowerCase() === v.toLowerCase() && p.status !== "Rejected";
        });
        return duplicate ? "A session with this title has already been submitted." : "";
    },

    sessionType: function (v) {
        return getSessionTypeRule(v) ? "" : "Select a session type.";
    },

    track: function (v) {
        return (proposalData.options.tracks || []).includes(v) ? "" : "Select a track.";
    },

    duration: function (v) {
        if (v === "") return "Select a duration.";
        const rule = getSessionTypeRule(fieldValue("sessionType"));
        if (rule && !rule.allowedDurations.includes(parseInt(v, 10))) {
            return rule.value + " sessions must be " + rule.allowedDurations.join(" or ") + " minutes.";
        }
        return "";
    },

    format: function (v) {
        return (proposalData.options.formats || []).includes(v) ? "" : "Select a format.";
    },

    audienceLevel: function (v) {
        return (proposalData.options.audienceLevels || []).includes(v) ? "" : "Select an audience level.";
    },

    abstract: function (v) {
        if (v.length < 150) return "Abstract must be at least 150 characters (" + v.length + "/150).";
        if (v.length > 2000) return "Abstract must be 2000 characters or less.";
        return wordCount(v) >= 30 ? "" : "Abstract must be at least 30 words.";
    },

    keywords: function (v) {
        const list = parseKeywords(v);
        if (list.length === 0) return "Enter at least one keyword.";
        if (list.length > 5) return "Enter no more than 5 keywords.";

        const bad = list.find(function (k) { return k.length < 2 || k.length > 30; });
        if (bad !== undefined) return "Each keyword must be 2-30 characters.";

        const lower = list.map(function (k) { return k.toLowerCase(); });
        return new Set(lower).size === lower.length ? "" : "Keywords cannot repeat.";
    },

    agreeTerms: function () {
        const box = $id("agreeTerms");
        return box && box.checked ? "" : "You must agree to the speaker terms.";
    }
};

// Shows Bootstrap valid / invalid styling and the error message under the field
function validateField(id) {
    const input = $id(id);
    if (!input) return true;

    const error = rules[id](fieldValue(id));
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
    return error === "";
}

function validateAll() {
    let firstBad = null;
    Object.keys(rules).forEach(function (id) {
        if (!validateField(id) && firstBad === null) {
            firstBad = $id(id);
        }
    });
    if (firstBad) firstBad.focus();
    return firstBad === null;
}

// ---------- Form setup ----------

function fillSelect(id, values, placeholder) {
    const select = $id(id);
    if (!select || select.options.length > 1) return; // keep options written in the HTML

    select.innerHTML = '<option value="">' + placeholder + "</option>";
    values.forEach(function (v) {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
    });
}

// Only show durations that are allowed for the chosen session type
function updateDurationOptions() {
    const select = $id("duration");
    if (!select) return;

    const rule = getSessionTypeRule(fieldValue("sessionType"));
    const current = select.value;
    const durations = rule ? rule.allowedDurations : [15, 30, 45, 60, 90];

    select.innerHTML = '<option value="">Choose duration...</option>';
    durations.forEach(function (d) {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d + " minutes";
        select.appendChild(opt);
    });

    if (durations.includes(parseInt(current, 10))) {
        select.value = current;
    } else if (durations.length === 1) {
        select.value = durations[0];
    }
}

function updateCounter(inputId, counterId, max) {
    const counter = $id(counterId);
    if (!counter) return;
    const length = fieldValue(inputId).length;
    counter.textContent = length + " / " + max;
    counter.classList.toggle("text-danger", length > max);
}

function setupForm() {
    const opts = proposalData.options;
    fillSelect("sessionType", (opts.sessionTypes || []).map(function (t) { return t.value; }), "Choose session type...");
    fillSelect("track", opts.tracks || [], "Choose track...");
    fillSelect("format", opts.formats || [], "Choose format...");
    fillSelect("audienceLevel", opts.audienceLevels || [], "Choose audience level...");
    updateDurationOptions();

    // Validate on blur, then live once the field has been touched
    Object.keys(rules).forEach(function (id) {
        const input = $id(id);
        if (!input) return;

        const eventName = input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "blur";
        input.addEventListener(eventName, function () { validateField(id); });
        input.addEventListener("input", function () {
            if (input.classList.contains("is-invalid") || input.classList.contains("is-valid")) {
                validateField(id);
            }
        });
    });

    const typeSelect = $id("sessionType");
    if (typeSelect) {
        typeSelect.addEventListener("change", function () {
            updateDurationOptions();
            if (fieldValue("duration") !== "") validateField("duration");
        });
    }

    const bio = $id("speakerBio");
    if (bio) bio.addEventListener("input", function () { updateCounter("speakerBio", "bioCount", 500); });

    const abs = $id("abstract");
    if (abs) abs.addEventListener("input", function () { updateCounter("abstract", "abstractCount", 2000); });

    updateCounter("speakerBio", "bioCount", 500);
    updateCounter("abstract", "abstractCount", 2000);
}

// ---------- Submission ----------

function buildProposal() {
    const now = new Date().toISOString();
    const name = fieldValue("speakerName");

    return {
        proposalId: nextProposalId(),
        title: fieldValue("sessionTitle"),
        speaker: {
            name: name,
            email: fieldValue("speakerEmail").toLowerCase(),
            organization: fieldValue("organization"),
            bio: fieldValue("speakerBio")
        },
        sessionType: fieldValue("sessionType"),
        track: fieldValue("track"),
        durationMinutes: parseInt(fieldValue("duration"), 10),
        format: fieldValue("format"),
        audienceLevel: fieldValue("audienceLevel"),
        abstract: fieldValue("abstract"),
        keywords: parseKeywords(fieldValue("keywords")),
        avNeeds: getCheckedAvNeeds(),
        submittedAt: now,
        status: "Pending",
        review: null,
        history: [
            { status: "Pending", by: name, at: now, note: "Submitted" }
        ]
    };
}

// Clears validation styling; runs after the form's native reset
function clearValidation(form) {
    form.querySelectorAll(".is-valid, .is-invalid").forEach(function (el) {
        el.classList.remove("is-valid", "is-invalid");
    });
    updateDurationOptions();
    updateCounter("speakerBio", "bioCount", 500);
    updateCounter("abstract", "abstractCount", 2000);
}

function handleSubmit(event) {
    event.preventDefault();

    if (!validateAll()) {
        showStatus("Please fix the highlighted fields before submitting.", "danger");
        return;
    }

    const proposal = buildProposal();
    proposalData.proposals.push(proposal);
    saveProposalData();

    showStatus(
        "<strong>Proposal submitted!</strong> Your proposal ID is <strong>" +
        escapeHtml(proposal.proposalId) + "</strong>. Status: Pending review.",
        "success"
    );
    event.target.reset();
    renderLookup(proposal.speaker.email);
}

// ---------- Status lookup ----------

const statusBadge = {
    "Pending": "bg-warning text-dark",
    "Approved": "bg-success",
    "Rejected": "bg-danger",
    "Revisions Requested": "bg-info text-dark"
};

function renderLookup(email) {
    const results = $id("lookupResults");
    if (!results) return;

    const lookupInput = $id("lookupEmail");
    if (lookupInput) lookupInput.value = email;

    if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
        results.innerHTML = '<p class="text-danger">Enter a valid email address.</p>';
        return;
    }

    const mine = proposalData.proposals.filter(function (p) {
        return p.speaker.email.toLowerCase() === email.toLowerCase();
    });

    if (mine.length === 0) {
        results.innerHTML = "<p>No proposals found for " + escapeHtml(email) + ".</p>";
        return;
    }

    results.innerHTML = '<ul class="list-group">' + mine.map(function (p) {
        const comments = p.review && p.review.comments
            ? '<div class="small text-muted mt-1">Reviewer: ' + escapeHtml(p.review.comments) + "</div>" : "";
        return '<li class="list-group-item">' +
            '<div class="d-flex justify-content-between">' +
            "<span><strong>" + escapeHtml(p.proposalId) + "</strong> - " + escapeHtml(p.title) + "</span>" +
            '<span class="badge ' + (statusBadge[p.status] || "bg-secondary") + '">' + escapeHtml(p.status) + "</span>" +
            "</div>" + comments + "</li>";
    }).join("") + "</ul>";
}

// ---------- Start ----------

document.addEventListener("DOMContentLoaded", function () {
    const form = $id("proposalForm");
    if (!form) {
        console.error("proposal.js: #proposalForm not found in the page.");
        return;
    }

    form.setAttribute("novalidate", "");
    form.addEventListener("submit", handleSubmit);
    form.addEventListener("reset", function () {
        setTimeout(function () { clearValidation(form); }, 0);
    });

    const lookupBtn = $id("lookupBtn");
    if (lookupBtn) {
        lookupBtn.addEventListener("click", function () { renderLookup(fieldValue("lookupEmail")); });
    }

    loadProposalData()
        .then(function (data) {
            proposalData = {
                event: data.event || {},
                options: data.options || {},
                proposals: data.proposals || []
            };
            saveProposalData();
            setupForm();
        })
        .catch(function (error) {
            console.error(error);
            showStatus("Could not load " + DATA_FILE + ". Open the page with Live Server.", "danger");
        });
});
