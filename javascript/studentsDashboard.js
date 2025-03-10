let dbStudent;
let dbSubmission;

const requestStudent = indexedDB.open("AssignmentsDB", 1);
const requestSubmission = indexedDB.open("SubmissionDB", 1);

requestStudent.onsuccess = (event) => {
  dbStudent = event.target.result;
  console.log("Student Database opened successfully");
};

requestSubmission.onupgradeneeded = (event) => {
  dbSubmission = event.target.result;
  const objectStore = dbSubmission.createObjectStore("submissions", {
    keyPath: "id",
    autoIncrement: true,
  });

  objectStore.createIndex("rollno", "rollno", { unique: false });
  objectStore.createIndex("section", "section", { unique: false });
  objectStore.createIndex("course", "course", { unique: false });
  objectStore.createIndex("title", "title", { unique: false });
  console.log("Submission Database and object store created");
};

requestSubmission.onsuccess = (event) => {
  dbSubmission = event.target.result;
  console.log("Submission Database opened successfully");
};

requestSubmission.onerror = (event) => {
  console.error("Submission Database error:", event.target.errorCode);
};

requestStudent.onerror = (event) => {
  console.error("Student Database error:", event.target.errorCode);
};

function fetchAssignmentsFromIndexedDB(section, course, title = "") {
  return new Promise((resolve, reject) => {
    const transaction = dbStudent.transaction("assignments", "readonly");
    const objectStore = transaction.objectStore("assignments");
    const requestGetAll = objectStore.getAll();

    requestGetAll.onsuccess = (event) => {
      const assignments = event.target.result;

      const filteredAssignments = assignments.filter((assignment) => {
        const sectionMatch = assignment.section === section;
        const courseMatch = course ? assignment.course === course : true;
        const titleMatch = title ? assignment.title === title : true;
        return sectionMatch && courseMatch && titleMatch;
      });
      resolve(filteredAssignments);
    };

    requestGetAll.onerror = (event) => {
      console.error("Error fetching assignments:", event.target.error);
      reject(event.target.error);
    };
  });
}

function displayAssignments(assignments) {
  const assignmentsTable = document.querySelector("#assignmentTable tbody");
  assignmentsTable.innerHTML = "";

  const rollNo = document.getElementById("Rollno").value.trim();

  if (assignments.length === 0) {
    const noDataRow = document.createElement("tr");
    noDataRow.innerHTML =
      "<td colspan='7'>No assignments found for this selection.</td>";
    assignmentsTable.appendChild(noDataRow);
  } else {
    assignments.forEach((assignment) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${rollNo}</td>
        <td>${assignment.section}</td>
        <td>${assignment.course}</td>
        <td>${assignment.title}</td>
        <td>${assignment.description}</td>
        <td>${assignment.dueDate}</td>
        <td>
          ${
            assignment.submissions && assignment.submissions[rollNo]
              ? `<button onclick="viewSubmission(${assignment.id}, '${assignment.section}', '${assignment.course}', '${assignment.title}', '${rollNo}')">View</button>
                 <button onclick="deleteSubmission(${assignment.id}, '${assignment.section}', '${assignment.course}', '${assignment.title}', '${rollNo}')">Delete</button>`
              : `<button onclick="submitAssignment(${assignment.id}, '${assignment.section}', '${assignment.course}', '${assignment.title}', '${rollNo}')">Submit</button>`
          }
        </td>
      `;
      assignmentsTable.appendChild(row);
    });
  }
}

function submitAssignment(id, section, course, title, rollNo) {
  fetchAssignmentsFromIndexedDB(section, course, title).then((assignments) => {
    const assignment = assignments.find((a) => a.id === id);
    if (!assignment) {
      alert("Assignment not found.");
      return;
    }

    if (assignment.submissions && assignment.submissions[rollNo]) {
      alert("You have already submitted this assignment.");
      return;
    }

    const fileInput = document.getElementById("fileInput");
    fileInput.click();

    fileInput.onchange = function (event) {
      const files = event.target.files;

      if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
          if (!assignment.submissions) {
            assignment.submissions = {};
          }

          assignment.submissions[rollNo] = {
            section: assignment.section,
            course: assignment.course,
            title: assignment.title,
            fileData: e.target.result,
          };

          const transaction = dbSubmission.transaction(
            "submissions",
            "readwrite"
          );
          const objectStore = transaction.objectStore("submissions");

          const submissionData = {
            rollno: rollNo,
            section: assignment.section,
            course: assignment.course,
            title: assignment.title,
            description: assignment.description,
            submittedFile: e.target.result,
          };

          objectStore.add(submissionData).onsuccess = () => {
            console.log("Submission stored in SubmissionDB:", submissionData);
          };

          const transactionAssignment = dbStudent.transaction(
            "assignments",
            "readwrite"
          );
          const objectStoreAssignment =
            transactionAssignment.objectStore("assignments");

          objectStoreAssignment.put(assignment).onsuccess = () => {
            console.log("Assignment submitted successfully:", assignment);
            filterAndDisplayAssignments();
          };
        };

        reader.readAsDataURL(file);
      }
    };
  });
}

function viewSubmission(id, section, course, title, rollNo) {
  fetchAssignmentsFromIndexedDB(section, course, title).then((assignments) => {
    const assignment = assignments.find((a) => a.id === id);
    const submission = assignment.submissions[rollNo];
    if (submission && submission.fileData) {
      const base64Data = submission.fileData.split(",")[1];
      const mimeString = submission.fileData
        .split(",")[0]
        .split(":")[1]
        .split(";")[0];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeString });
      const fileURL = URL.createObjectURL(blob);

      const win = window.open(fileURL, "_blank");
      if (win) {
        win.focus();
      } else {
        alert("Popup blocked! Please allow popups for this website.");
      }
    } else {
      alert(`No submission found for assignment: ${assignment.title}`);
    }
  });
}

function deleteSubmission(id, section, course, title, rollNo) {
  fetchAssignmentsFromIndexedDB(section, course, title).then((assignments) => {
    const assignment = assignments.find((a) => a.id === id);

    if (
      confirm(
        `Are you sure you want to delete the submission for assignment: ${assignment.title}?`
      )
    ) {
      const transaction = dbSubmission.transaction("submissions", "readwrite");
      const objectStore = transaction.objectStore("submissions");

      const deleteRequest = objectStore
        .index("rollno")
        .openCursor(IDBKeyRange.only(rollNo));
      deleteRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const submissionKey = cursor.value.id;
          objectStore.delete(submissionKey).onsuccess = () => {
            console.log("Submission deleted successfully from SubmissionDB");
          };
          cursor.continue();
        }
      };

      delete assignment.submissions[rollNo];

      const transactionAssignment = dbStudent.transaction(
        "assignments",
        "readwrite"
      );
      const objectStoreAssignment =
        transactionAssignment.objectStore("assignments");

      objectStoreAssignment.put(assignment).onsuccess = () => {
        console.log(
          "Submission removed successfully from assignment:",
          assignment
        );
        filterAndDisplayAssignments();
      };
    }
  });
}

function filterAndDisplayAssignments() {
  const section = document.getElementById("selections").value;
  const course = document.getElementById("courseInput").value.trim();
  const title = document.getElementById("titleInput")?.value.trim() || "";
  fetchAssignmentsFromIndexedDB(section, course, title).then((assignments) => {
    displayAssignments(assignments);
  });
}

document
  .getElementById("sectionCourseForm")
  .addEventListener("submit", (event) => {
    event.preventDefault();
    filterAndDisplayAssignments();
  });

document.addEventListener("DOMContentLoaded", () => {
  const filterButton = document.getElementById("filterButton");
  if (filterButton) {
    filterButton.addEventListener("click", filterAndDisplayAssignments);
  } else {
    console.log("Filter button not found");
  }
});
