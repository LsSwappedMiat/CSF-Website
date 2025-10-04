// User Authentication and Management System
class UserManager {
  constructor() {
    this.USERS_KEY = 'csf_users';
    this.CURRENT_USER_KEY = 'csf_current_user';
    this.initializeDefaultAdmin();
  }

  // Initialize default admin account if no users exist
  initializeDefaultAdmin() {
    const users = this.getAllUsers();
    if (Object.keys(users).length === 0) {
      // Create default admin account
      this.createUser('admin', 'admin@csfestival.com', 'admin123', ['admin', 'edit']);
      console.log('Default admin account created: admin@csfestival.com / admin123');
    }
  }

  // Get all users from localStorage
  getAllUsers() {
    const users = localStorage.getItem(this.USERS_KEY);
    return users ? JSON.parse(users) : {};
  }

  // Save users to localStorage
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  // Create new user account
  createUser(name, email, password, flags = []) {
    const users = this.getAllUsers();
    
    // Check if email already exists
    if (users[email]) {
      throw new Error('Account with this email already exists');
    }

    // Create user object
    const user = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: this.hashPassword(password), // Simple hash for demo
      flags: flags, // ['admin', 'edit', 'viewer', etc.]
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users[email] = user;
    this.saveUsers(users);
    return user;
  }

  // Simple password hashing (for demo - use proper hashing in production)
  hashPassword(password) {
    // Simple hash for demo purposes - in production use bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  // Authenticate user login
  login(email, password) {
    const users = this.getAllUsers();
    const user = users[email.toLowerCase().trim()];

    if (!user) {
      throw new Error('Account not found');
    }

    if (user.password !== this.hashPassword(password)) {
      throw new Error('Invalid password');
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    users[email] = user;
    this.saveUsers(users);

    // Set current user
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    
    // Set legacy admin flag for backward compatibility
    if (user.flags.includes('admin')) {
      localStorage.setItem('admin_auth', 'true');
    }

    return user;
  }

  // Logout current user
  logout() {
    localStorage.removeItem(this.CURRENT_USER_KEY);
    localStorage.removeItem('admin_auth'); // Remove legacy admin flag
  }

  // Get current logged-in user
  getCurrentUser() {
    const user = localStorage.getItem(this.CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  // Check if current user has specific flag
  hasFlag(flag) {
    const user = this.getCurrentUser();
    return user && user.flags.includes(flag);
  }

  // Check if user is admin
  isAdmin() {
    return this.hasFlag('admin');
  }

  // Check if user can edit
  canEdit() {
    return this.hasFlag('edit') || this.hasFlag('admin');
  }

  // Update user flags (admin only)
  updateUserFlags(email, newFlags) {
    if (!this.isAdmin()) {
      throw new Error('Only admins can update user flags');
    }

    const users = this.getAllUsers();
    const user = users[email.toLowerCase().trim()];

    if (!user) {
      throw new Error('User not found');
    }

    user.flags = newFlags;
    users[email] = user;
    this.saveUsers(users);

    // Update current user if it's the same user
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.email === email) {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    }

    return user;
  }

  // Delete user account (admin only)
  deleteUser(email) {
    if (!this.isAdmin()) {
      throw new Error('Only admins can delete users');
    }

    const users = this.getAllUsers();
    if (!users[email]) {
      throw new Error('User not found');
    }

    delete users[email];
    this.saveUsers(users);
  }

  // Get user list for admin panel
  getUserList() {
    if (!this.isAdmin()) {
      throw new Error('Only admins can view user list');
    }

    const users = this.getAllUsers();
    return Object.values(users).map(user => ({
      name: user.name,
      email: user.email,
      flags: user.flags,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }));
  }
}

// Global user manager instance
const userManager = new UserManager();

// Auth UI Functions
function showAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');

  if (mode === 'login') {
    title.textContent = 'Login';
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    switchToRegister.style.display = 'block';
    switchToLogin.style.display = 'none';
  } else {
    title.textContent = 'Create Account';
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    switchToRegister.style.display = 'none';
    switchToLogin.style.display = 'block';
  }

  modal.setAttribute('aria-hidden', 'false');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  modal.setAttribute('aria-hidden', 'true');
  
  // Clear forms
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();
  
  // Clear error messages
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
}

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  try {
    const user = userManager.login(email, password);
    closeAuthModal();
    updateUserUI();
    alert(`Welcome back, ${user.name}!`);
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const errorEl = document.getElementById('register-error');

  // Validation
  if (password !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    return;
  }

  try {
    const user = userManager.createUser(name, email, password, ['viewer']); // Default to viewer
    userManager.login(email, password); // Auto-login after registration
    closeAuthModal();
    updateUserUI();
    alert(`Account created successfully! Welcome, ${user.name}!`);
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

function handleLogout() {
  userManager.logout();
  updateUserUI();
  alert('Logged out successfully');
}

// Update UI based on current user
function updateUserUI() {
  const currentUser = userManager.getCurrentUser();
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  const userName = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');

  if (currentUser) {
    // User is logged in
    loginBtn.style.display = 'none';
    userInfo.style.display = 'flex';
    userName.textContent = currentUser.name;
    
    // Update admin UI
    if (typeof updateAdminUI === 'function') {
      updateAdminUI();
    }
  } else {
    // User is logged out
    loginBtn.style.display = 'block';
    userInfo.style.display = 'none';
    
    // Update admin UI
    if (typeof updateAdminUI === 'function') {
      updateAdminUI();
    }
  }
}

// Initialize auth UI when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  updateUserUI();
});