// Navigation auth handler - manages visibility of admin controls and auth links
document.addEventListener('DOMContentLoaded', function() {
    // Check if UserManager is available (from auth.js)
    if (typeof UserManager !== 'undefined') {
        const userManager = new UserManager();
        const currentUser = userManager.getCurrentUser();
        
        // Find admin-only elements
        const adminElements = document.querySelectorAll('.admin-only');
        // Find auth-only elements (login/signup links)
        const authElements = document.querySelectorAll('.auth-only');
        // Find signed-in-only elements (sign out button)
        const signedInElements = document.querySelectorAll('.signed-in-only');
        
        if (currentUser) {
            // User is logged in
            
            // Check if user is admin
            if (currentUser.flags && currentUser.flags.admin) {
                // User is admin, show admin elements
                adminElements.forEach(element => {
                    element.style.display = '';
                });
            } else {
                // User is not admin, hide admin elements
                adminElements.forEach(element => {
                    element.style.display = 'none';
                });
            }
            
            // Hide login/signup links when user is logged in
            authElements.forEach(element => {
                element.style.display = 'none';
            });
            
            // Show signed-in-only elements when user is logged in
            signedInElements.forEach(element => {
                element.style.display = '';
            });
            
        } else {
            // User is not logged in
            
            // Hide admin elements
            adminElements.forEach(element => {
                element.style.display = 'none';
            });
            
            // Show login/signup links when user is not logged in
            authElements.forEach(element => {
                element.style.display = '';
            });
            
            // Hide signed-in-only elements when user is not logged in
            signedInElements.forEach(element => {
                element.style.display = 'none';
            });
        }
        
        // Update user auth display in navigation if it exists
        const userAuthDiv = document.querySelector('.user-auth');
        if (userAuthDiv) {
            if (currentUser) {
                userAuthDiv.innerHTML = `
                    <span>Welcome, ${currentUser.fullName || currentUser.name}</span>
                    <button onclick="logout()" class="btn btn-outline">Logout</button>
                `;
            } else {
                userAuthDiv.innerHTML = `
                    <a href="login.html" class="btn">Login</a>
                    <a href="signup.html" class="btn btn-outline">Sign Up</a>
                `;
            }
        }
    }
});

// Global logout function
function logout() {
    if (typeof UserManager !== 'undefined') {
        const userManager = new UserManager();
        userManager.logout();
        // Refresh the page to update navigation
        window.location.reload();
    }
}

// Global signOut function (alias for logout)
function signOut() {
    logout();
}