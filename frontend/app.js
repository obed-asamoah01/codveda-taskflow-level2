/* =====================================================================
   TaskFlow — app.js
   Handles authentication state and all REST API calls.

   Flow:
     1. On page load, check localStorage for a saved JWT.
     2. If found, show the task manager and fetch tasks.
        If the server rejects the token (401), clear it and show auth.
     3. If no token, show the auth view (login form by default).
     4. After a successful login or register, save the token and switch
        to the task manager.
     5. Logout clears the token and switches back to the auth view.
===================================================================== */

// ── API base URLs ─────────────────────────────────────────────────────
const AUTH_URL  = 'http://localhost:5000/api/auth';
const TASKS_URL = 'http://localhost:5000/api/tasks';

// ── DOM references — auth views ───────────────────────────────────────
const authView       = document.querySelector('#auth-view');
const loginPanel     = document.querySelector('#login-panel');
const registerPanel  = document.querySelector('#register-panel');

const loginForm      = document.querySelector('#login-form');
const registerForm   = document.querySelector('#register-form');

const loginError     = document.querySelector('#login-error');
const registerError  = document.querySelector('#register-error');

const showRegisterBtn = document.querySelector('#show-register');
const showLoginBtn    = document.querySelector('#show-login');

// ── DOM references — task manager view ───────────────────────────────
const appView       = document.querySelector('#app-view');
const userGreeting  = document.querySelector('#user-greeting');
const logoutBtn     = document.querySelector('#logout-btn');
const taskForm      = document.querySelector('#task-form');
const titleInput    = document.querySelector('#task-title');
const taskList      = document.querySelector('#task-list');
const statusMessage = document.querySelector('#status-message');


// ════════════════════════════════════════════════════════════════════════
//  UTILITY HELPERS
// ════════════════════════════════════════════════════════════════════════

/** Read the saved JWT from localStorage, or null if absent. */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Build the Authorization header object for fetch calls.
 * Every request to /api/tasks must include this header so the
 * backend's `protect` middleware can verify the caller's identity.
 */
function authHeaders() {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

/** Display a non-blank message in the task-manager status bar. */
function showStatus(message = '') {
  statusMessage.textContent = message;
}

/**
 * Show an inline auth error message.
 * @param {HTMLElement} el  - The <p class="auth-error"> element.
 * @param {string}      msg - Human-readable error text.
 */
function showAuthError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

/** Hide and clear an auth error paragraph. */
function clearAuthError(el) {
  el.textContent = '';
  el.hidden = true;
}


// ════════════════════════════════════════════════════════════════════════
//  VIEW SWITCHING
// ════════════════════════════════════════════════════════════════════════

/**
 * Show the task-manager and greet the user by name.
 * The name is stored in localStorage under 'userName' after login/register.
 */
function showAppView() {
  // Fill in the personalised greeting from localStorage
  userGreeting.textContent = localStorage.getItem('userName') || 'there';
  authView.hidden = true;
  appView.hidden  = false;
}

/**
 * Show the auth card.
 * @param {boolean} [showLogin=true]  Which panel to open first.
 */
function showAuthView(showLogin = true) {
  appView.hidden  = true;
  authView.hidden = false;
  loginPanel.hidden    = !showLogin;
  registerPanel.hidden =  showLogin;
}

// Toggle between login and register panels inside the auth card
showRegisterBtn.addEventListener('click', () => {
  clearAuthError(loginError);
  loginPanel.hidden    = true;
  registerPanel.hidden = false;
});

showLoginBtn.addEventListener('click', () => {
  clearAuthError(registerError);
  registerPanel.hidden = true;
  loginPanel.hidden    = false;
});


// ════════════════════════════════════════════════════════════════════════
//  AUTHENTICATION — Register
// ════════════════════════════════════════════════════════════════════════

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAuthError(registerError);

  const name     = document.querySelector('#reg-name').value.trim();
  const email    = document.querySelector('#reg-email').value.trim();
  const password = document.querySelector('#reg-password').value;

  // Basic client-side guard — the server validates properly
  if (!name || !email || !password) {
    showAuthError(registerError, 'Please fill in all fields.');
    return;
  }

  try {
    const response = await fetch(`${AUTH_URL}/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      // Never log the password — it's included only in the encrypted request body
      body:    JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Show the most useful error: field-level message if available,
      // otherwise the top-level message from the API.
      const msg = (data.errors && Object.values(data.errors)[0]) || data.message || 'Registration failed.';
      showAuthError(registerError, msg);
      return;
    }

    // Store the JWT and the user's display name for subsequent requests
    localStorage.setItem('token',    data.token);
    localStorage.setItem('userName', data.user.name);

    registerForm.reset();
    showAppView();
    await loadTasks();
  } catch {
    showAuthError(registerError, 'Cannot reach the server. Is the backend running?');
  }
});


// ════════════════════════════════════════════════════════════════════════
//  AUTHENTICATION — Login
// ════════════════════════════════════════════════════════════════════════

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAuthError(loginError);

  const email    = document.querySelector('#login-email').value.trim();
  const password = document.querySelector('#login-password').value;

  if (!email || !password) {
    showAuthError(loginError, 'Please enter your email and password.');
    return;
  }

  try {
    const response = await fetch(`${AUTH_URL}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // 401 means wrong credentials; show the server's human-readable message
      showAuthError(loginError, data.message || 'Login failed. Check your email and password.');
      return;
    }

    // Persist the token and the user name so the app can stay logged in
    localStorage.setItem('token',    data.token);
    localStorage.setItem('userName', data.user.name);

    loginForm.reset();
    showAppView();
    await loadTasks();
  } catch {
    showAuthError(loginError, 'Cannot reach the server. Is the backend running?');
  }
});


// ════════════════════════════════════════════════════════════════════════
//  LOGOUT
// ════════════════════════════════════════════════════════════════════════

logoutBtn.addEventListener('click', () => {
  // Removing the token means the next fetch will be rejected by the server
  localStorage.removeItem('token');
  localStorage.removeItem('userName');

  // Reset the task list so stale data isn't visible on re-login
  taskList.innerHTML = '';
  showStatus('');

  showAuthView(true);   // Land on the login panel
});


// ════════════════════════════════════════════════════════════════════════
//  TASK MANAGER — Load & Render
// ════════════════════════════════════════════════════════════════════════

/**
 * Fetch all tasks for the logged-in user and repaint the list.
 * If the server returns 401 (expired/invalid token), log the user out
 * automatically and redirect them to the auth screen.
 */
async function loadTasks() {
  try {
    showStatus('Loading tasks…');

    const response = await fetch(TASKS_URL, {
      headers: authHeaders(),   // ← includes Bearer token
    });

    // 401 = token is missing, expired, or tampered — force re-login
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      showAuthView(true);
      return;
    }

    if (!response.ok) throw new Error('Unable to load tasks.');

    renderTasks(await response.json());
    showStatus('');
  } catch (error) {
    taskList.innerHTML = '';
    showStatus('Cannot reach the API. Start the backend and check its MongoDB connection.');
  }
}

/**
 * Build the task list from an array of task objects returned by the API.
 * Uses textContent (not innerHTML) to prevent XSS from untrusted task titles.
 */
function renderTasks(tasks) {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.className   = 'empty-state';
    emptyState.textContent = 'No tasks yet. Add your first one above.';
    taskList.append(emptyState);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement('li');
    item.className = `task-item${task.completed ? ' completed' : ''}`;

    // Task title — displayed as plain text, never as HTML
    const title = document.createElement('span');
    title.className   = 'task-title';
    title.textContent = task.title;

    // Toggle completed / not-completed
    const completeButton = document.createElement('button');
    completeButton.className   = 'complete-button';
    completeButton.textContent = task.completed ? 'Undo' : 'Complete';
    completeButton.addEventListener('click', () => toggleTask(task));

    // Delete this task
    const deleteButton = document.createElement('button');
    deleteButton.className   = 'delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteTask(task._id));

    item.append(title, completeButton, deleteButton);
    taskList.append(item);
  });
}


// ════════════════════════════════════════════════════════════════════════
//  TASK MANAGER — Create
// ════════════════════════════════════════════════════════════════════════

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  try {
    showStatus('Adding task…');

    const response = await fetch(TASKS_URL, {
      method:  'POST',
      headers: authHeaders(),   // ← Authorization + Content-Type
      body:    JSON.stringify({ title }),
      // The user field is set by the server from req.user.id — never send it from the client.
    });

    if (response.status === 401) {
      // Token expired mid-session; redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      showAuthView(true);
      return;
    }

    if (!response.ok) throw new Error('Unable to create task.');

    taskForm.reset();
    await loadTasks();      // Reload the authoritative list from the server
    titleInput.focus();
  } catch {
    showStatus('Could not add the task. Please try again.');
  }
});


// ════════════════════════════════════════════════════════════════════════
//  TASK MANAGER — Toggle (complete / undo)
// ════════════════════════════════════════════════════════════════════════

async function toggleTask(task) {
  try {
    const response = await fetch(`${TASKS_URL}/${task._id}`, {
      method:  'PUT',
      headers: authHeaders(),   // ← Authorization header required by protect middleware
      body:    JSON.stringify({ completed: !task.completed }),
    });

    if (!response.ok) throw new Error('Unable to update task.');
    await loadTasks();
  } catch {
    showStatus('Could not update the task. Please try again.');
  }
}


// ════════════════════════════════════════════════════════════════════════
//  TASK MANAGER — Delete
// ════════════════════════════════════════════════════════════════════════

async function deleteTask(taskId) {
  try {
    const response = await fetch(`${TASKS_URL}/${taskId}`, {
      method:  'DELETE',
      headers: authHeaders(),   // ← Authorization header required by protect middleware
    });

    if (!response.ok) throw new Error('Unable to delete task.');
    await loadTasks();
  } catch {
    showStatus('Could not delete the task. Please try again.');
  }
}


// ════════════════════════════════════════════════════════════════════════
//  BOOTSTRAP — decide which view to show on page load
// ════════════════════════════════════════════════════════════════════════

(async function init() {
  const token = getToken();

  if (token) {
    // A token exists — assume the session is still valid and go straight
    // to the task manager.  loadTasks() will handle a 401 if the token
    // has expired, clearing it and redirecting to the auth view.
    showAppView();
    await loadTasks();
  } else {
    // No token — show the login form immediately.
    showAuthView(true);
  }
})();

