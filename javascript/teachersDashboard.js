let db;
const request = indexedDB.open("AssignmentsDB", 1);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  const objectStore = db.createObjectStore("assignments", {
    keyPath: "id",
    autoIncrement: true,
  });
  objectStore.createIndex("section", "section", { unique: false });
  objectStore.createIndex("course", "course", { unique: false });
  objectStore.createIndex("title", "title", { unique: false });
  objectStore.createIndex("description", "description", { unique: false });
  objectStore.createIndex("dueDate", "dueDate", { unique: false });
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log("Assignments Database opened successfully");
  loadAssignments();
};

request.onerror = (event) => {
  console.error("Assignments Database error:", event.target.errorCode);
};

const createAssignment = (event) => {
  event.preventDefault();

  if (!db) {
    console.error("Database is not initialized");
    return;
  }

  const transaction = db.transaction("assignments", "readwrite");
  const objectStore = transaction.objectStore("assignments");

  const assignment = {
    section: document.getElementById("sectionSelections").value,
    course: document.getElementById("sub").value,
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    dueDate: document.getElementById("duedate").value,
  };

  const requestAdd = objectStore.add(assignment);

  requestAdd.onsuccess = () => {
    console.log("Assignment added to the database");
    loadAssignments();
    document.querySelector(".assignment-form").reset();
  };

  requestAdd.onerror = (event) => {
    console.error("Error adding assignment:", event.target.error);
  };
};

const loadAssignments = () => {
  if (!db) {
    console.error("Database is not initialized");
    return;
  }

  const transaction = db.transaction("assignments", "readonly");
  const objectStore = transaction.objectStore("assignments");
  const requestGetAll = objectStore.getAll();

  requestGetAll.onsuccess = (event) => {
    const assignments = event.target.result;
    const tableBody = document.querySelector("#createdTable tbody");
    tableBody.innerHTML = "";

    assignments.forEach((assignment) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${assignment.section}</td>
        <td>${assignment.course}</td>
        <td>${assignment.title}</td>
        <td>${assignment.description}</td>
        <td>${assignment.dueDate}</td>
        <td>
          <div class="dropdown">
            <button class="dropdown-toggle" onclick="toggleMenu(event)">&#8230;</button>
            <div class="dropdownMenu">
              <button onclick="editAssignment(${assignment.id}, 'title')">Edit Title</button>
              <button onclick="editAssignment(${assignment.id}, 'course')">Edit Course</button>
              <button onclick="editAssignment(${assignment.id}, 'section')">Edit Section</button>
              <button onclick="editAssignment(${assignment.id}, 'description')">Edit Description</button>
              <button onclick="editAssignment(${assignment.id}, 'dueDate')">Edit Due Date</button>
              <button onclick="deleteAssignment(${assignment.id})">Delete</button>
            </div>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  };

  requestGetAll.onerror = (event) => {
    console.error("Error fetching assignments:", event.target.error);
  };
};

// Toggle Dropdown Menu
function toggleMenu(event) {
  event.stopPropagation();
  const dropdown = event.target.nextElementSibling;
  dropdown.classList.toggle("show");
  document.addEventListener("click", closeDropdown);
}

// Close dropdown when clicking outside
function closeDropdown(event) {
  const dropdowns = document.querySelectorAll(".dropdownMenu");
  dropdowns.forEach((dropdown) => {
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove("show");
    }
  });
  document.removeEventListener("click", closeDropdown);
}

// Edit Assignment Function
function editAssignment(id, field) {
  const newValue = prompt(`Enter new value for ${field}:`);
  if (!newValue) return;

  const transaction = db.transaction("assignments", "readwrite");
  const objectStore = transaction.objectStore("assignments");
  const requestGet = objectStore.get(id);

  requestGet.onsuccess = (event) => {
    const assignment = event.target.result;
    assignment[field] = newValue;

    const requestUpdate = objectStore.put(assignment);
    requestUpdate.onsuccess = () => {
      console.log("Assignment updated successfully");
      loadAssignments();
    };
    requestUpdate.onerror = (event) => {
      console.error("Error updating assignment:", event.target.error);
    };
  };
}

function deleteAssignment(id) {
  if (confirm("Are you sure you want to delete this assignment?")) {
    const transaction = db.transaction("assignments", "readwrite");
    const objectStore = transaction.objectStore("assignments");
    const requestDelete = objectStore.delete(id);

    requestDelete.onsuccess = () => {
      console.log("Assignment deleted successfully");
      loadAssignments(); // Refresh the assignments table
    };
    requestDelete.onerror = (event) => {
      console.error("Error deleting assignment:", event.target.error);
    };
  }
}

let dbSubmission;
const requestSubmission = indexedDB.open("SubmissionDB", 1);

requestSubmission.onupgradeneeded = (event) => {
  dbSubmission = event.target.result;
  const objectStore = dbSubmission.createObjectStore("submissions", {
    keyPath: "id",
    autoIncrement: true,
  });
  objectStore.createIndex("section", "section", { unique: false });
  objectStore.createIndex("course", "course", { unique: false });
  objectStore.createIndex("title", "title", { unique: false });
  objectStore.createIndex("rollno", "rollno", { unique: false });
  objectStore.createIndex("submittedFile", "submittedFile", { unique: false });
  console.log("Submission Database opened successfully");
};

requestSubmission.onsuccess = (event) => {
  dbSubmission = event.target.result;
  console.log("Submission Database opened successfully");
};

requestSubmission.onerror = (event) => {
  console.error("Submission Database error:", event.target.errorCode);
};

function fetchSubmissionsFromIndexedDB(section, course, title) {
  return new Promise((resolve, reject) => {
    const transaction = dbSubmission.transaction("submissions", "readonly");
    const objectStore = transaction.objectStore("submissions");
    const requestGetAll = objectStore.getAll();

    requestGetAll.onsuccess = (event) => {
      const submissions = event.target.result;

      const filteredSubmissions = submissions.filter((submission) => {
        return (
          submission.section === section &&
          submission.course === course &&
          submission.title.includes(title)
        );
      });
      resolve(filteredSubmissions);
    };

    requestGetAll.onerror = (event) => {
      console.error("Error fetching submissions:", event.target.error);
      reject(event.target.error);
    };
  });
}

function displaySubmissions(submissions) {
  const submissionsTable = document.querySelector("#submissionTable tbody");
  submissionsTable.innerHTML = "";

  if (submissions.length === 0) {
    const noDataRow = document.createElement("tr");
    noDataRow.innerHTML =
      "<td colspan='6'>No submissions found for this section, course, and title.</td>";
    submissionsTable.appendChild(noDataRow);
  } else {
    submissions.forEach((submission) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${submission.rollno}</td>
        <td>${submission.section}</td>
        <td>${submission.course}</td>
        <td>${submission.title}</td>
        <td>
          <button onclick="downloadFile('${submission.submittedFile}')">Download</button>
          <button onclick="deleteSubmission(${submission.id})">Delete</button>
        </td>
      `;
      submissionsTable.appendChild(row);
    });
  }
}

function downloadFile(fileData) {
  const link = document.createElement("a");
  link.href = fileData;
  link.download = "submission";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function deleteSubmission(id) {
  const transaction = dbSubmission.transaction("submissions", "readwrite");
  const objectStore = transaction.objectStore("submissions");

  objectStore.delete(id).onsuccess = () => {
    console.log("Submission deleted successfully from SubmissionDB");
    filterAndDisplaySubmissions();
  };
}

function filterAndDisplaySubmissions() {
  const section = document.getElementById("submissionSelections").value;
  const course = document.getElementById("courseInput").value;
  const title = document.getElementById("titleInput").value;

  fetchSubmissionsFromIndexedDB(section, course, title)
    .then(displaySubmissions)
    .catch((error) => console.error("Error displaying submissions:", error));
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelector(".assignment-form")
    .addEventListener("submit", createAssignment);

  document
    .getElementById("submissionSelections")
    .addEventListener("change", filterAndDisplaySubmissions);
  document
    .getElementById("courseInput")
    .addEventListener("change", filterAndDisplaySubmissions);
  document
    .getElementById("titleInput")
    .addEventListener("input", filterAndDisplaySubmissions);

  document
    .getElementById("filter-button")
    .addEventListener("click", (event) => {
      event.preventDefault();
      filterAndDisplaySubmissions();
    });
});

const feedback = document.querySelector(".give-pop");
const clearinfo = document.querySelectorAll(".clearinfo");
feedback.addEventListener("click", function () {
  alert("feedback submitted");
  clearinfo.forEach(function (input) {
    input.value = "";
  });
});
