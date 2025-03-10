let db;
const request = indexedDB.open("TeacherLoginDB", 1);
request.onupgradeneeded = (event) => {
  db = event.target.result;
  const objectStore = db.createObjectStore("teachers", {
    keyPath: "id",
    autoIncrement: true,
  });
  objectStore.createIndex("email", "email", { unique: true });
  objectStore.createIndex("password", "password", { unique: false });
};

request.onsuccess = (event) => {
  db = event.target.result;
};

request.onerror = (event) => {
  console.error("Database error: " + event.target.errorCode);
};

let signup = document.querySelector("#signup");
let login = document.querySelector("#login");
let title = document.querySelector("#title");
let nameField = document.querySelector("#name");
let emailField = document.querySelector(".input-field input[type='email']");
let passwordField = document.querySelector(
  ".input-field input[type='password']"
);

login.onclick = () => {
  nameField.style.maxHeight = "0";
  title.innerHTML = "Login";
  signup.classList.add("disable");
  login.classList.remove("disable");
};

signup.onclick = () => {
  nameField.style.maxHeight = "65px";
  title.innerHTML = "Sign Up";
  signup.classList.remove("disable");
  login.classList.add("disable");
};

signup.addEventListener("click", () => {
  const username = nameField.querySelector("input").value.trim();
  const email = emailField.value.trim();
  const password = passwordField.value.trim();

  console.log(
    "Sign Up - Username:",
    username,
    ", Email:",
    email,
    ", Password:",
    password
  );

  if (username && email && password) {
    const transaction = db.transaction(["teachers"], "readwrite");
    const objectStore = transaction.objectStore("teachers");

    const newTeacher = {
      username: username,
      email: email,
      password: password,
    };

    const request = objectStore.add(newTeacher);

    request.onsuccess = () => {
      nameField.querySelector("input").value = "";
      emailField.value = "";
      passwordField.value = "";

      alert("Sign up successful! You can now log in.");
    };

    request.onerror = (event) => {
      alert("Error adding teacher: " + event.target.error);
    };
  }
});

login.addEventListener("click", () => {
  const enteredEmail = emailField.value.trim();
  const enteredPassword = passwordField.value.trim();

  console.log("Login - Email:", enteredEmail, ", Password:", enteredPassword);

  if (enteredEmail && enteredPassword) {
    const transaction = db.transaction(["teachers"], "readonly");
    const objectStore = transaction.objectStore("teachers");

    const request = objectStore.index("email").get(enteredEmail);

    request.onsuccess = (event) => {
      const teacher = event.target.result;
      if (teacher && enteredPassword === teacher.password) {
        alert("Login successful!");
        window.location.href = "teachersDashboard.html";
      } else {
        alert("Invalid credentials. Please try again.");
      }
    };

    request.onerror = (event) => {
      alert("Error retrieving teacher: " + event.target.error);
    };
  }
});
