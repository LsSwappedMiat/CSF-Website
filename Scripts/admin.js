// Admin Panel JavaScript
class AdminPanel {
  constructor() {
    this.currentTab = 'users';
    this.init();
  }

  init() {
    // Check admin access on page load
    document.addEventListener('DOMContentLoaded', () => {
      this.checkAdminAccess();
      this.loadInitialData();
    });
  }

  checkAdminAccess() {
    const currentUser = userManager.getCurrentUser();
    const hasAdminFlag = currentUser && currentUser.flags && currentUser.flags.includes('admin');
    
    const accessDenied = document.getElementById('access-denied');
    const adminContent = document.getElementById('admin-content');

    if (!currentUser || !hasAdminFlag) {
      accessDenied.style.display = 'block';
      adminContent.style.display = 'none';
      
      // Log access attempt for security
      console.warn('Admin panel access denied:', {
        user: currentUser ? currentUser.email : 'not logged in',
        flags: currentUser ? currentUser.flags : 'none',
        timestamp: new Date().toISOString()
      });
    } else {
      accessDenied.style.display = 'none';
      adminContent.style.display = 'block';
      
      // Log successful admin access
      console.log('Admin panel access granted:', {
        user: currentUser.email,
        flags: currentUser.flags,
        timestamp: new Date().toISOString()
      });
    }
  }

  loadInitialData() {
    const currentUser = userManager.getCurrentUser();
    const hasAdminFlag = currentUser && currentUser.flags && currentUser.flags.includes('admin');
    
    if (hasAdminFlag) {
      this.loadUserList();
      this.loadBookingStats();
      this.loadSystemInfo();
    }
  }

  // Tab Management
  showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
    
    this.currentTab = tabName;
    
    // Load tab-specific data
    switch(tabName) {
      case 'users':
        this.loadUserList();
        break;
      case 'bookings':
        this.loadBookingStats();
        this.loadBookingsList();
        break;
      case 'booking-map':
        this.loadBookingMap();
        break;
      case 'system':
        this.loadSystemInfo();
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  }

  // User Management
  loadUserList() {
    try {
      const users = userManager.getUserList();
      const userListEl = document.getElementById('user-list');
      
      if (users.length === 0) {
        userListEl.innerHTML = '<div class="user-item"><p>No users found.</p></div>';
        return;
      }
      
      userListEl.innerHTML = users.map(user => `
        <div class="user-item">
          <div class="user-info">
            <div><strong>${user.name}</strong> (${user.email})</div>
            <div class="user-flags">
              ${user.flags.map(flag => `<span class="flag-badge ${flag}">${flag}</span>`).join('')}
            </div>
            <div class="user-meta">
              Created: ${new Date(user.createdAt).toLocaleDateString()}
              ${user.lastLogin ? ` | Last login: ${new Date(user.lastLogin).toLocaleDateString()}` : ' | Never logged in'}
            </div>
          </div>
          <div class="user-actions">
            <button class="btn" onclick="adminPanel.editUser('${user.email}')">Edit</button>
            <button class="btn danger" onclick="adminPanel.deleteUser('${user.email}')">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      document.getElementById('user-list').innerHTML = `<div class="user-item"><p>Error loading users: ${error.message}</p></div>`;
    }
  }

  showCreateUserForm() {
    document.getElementById('create-user-form').style.display = 'block';
  }

  hideCreateUserForm() {
    document.getElementById('create-user-form').style.display = 'none';
    document.getElementById('admin-create-user').reset();
  }

  editUser(email) {
    const users = userManager.getAllUsers();
    const user = users[email];
    
    if (!user) {
      alert('User not found');
      return;
    }
    
    const currentUser = userManager.getCurrentUser();
    if (currentUser && currentUser.email === email) {
      alert('You cannot edit your own account from this panel');
      return;
    }
    
    const newFlags = prompt(
      `Edit permissions for ${user.name} (${email})\nCurrent permissions: ${user.flags.join(', ')}\n\nEnter new permissions (comma-separated):\nAvailable: admin, edit, viewer`,
      user.flags.join(', ')
    );
    
    if (newFlags === null) return; // Cancelled
    
    const flagArray = newFlags.split(',').map(f => f.trim()).filter(f => f);
    
    if (flagArray.length === 0) {
      alert('User must have at least one permission');
      return;
    }
    
    try {
      userManager.updateUserFlags(email, flagArray);
      this.loadUserList();
      alert(`User permissions updated successfully!`);
    } catch (error) {
      alert(`Error updating user: ${error.message}`);
    }
  }

  deleteUser(email) {
    const users = userManager.getAllUsers();
    const user = users[email];
    
    if (!user) {
      alert('User not found');
      return;
    }
    
    const currentUser = userManager.getCurrentUser();
    if (currentUser && currentUser.email === email) {
      alert('You cannot delete your own account');
      return;
    }
    
    if (confirm(`Are you sure you want to delete user ${user.name} (${email})?\n\nThis action cannot be undone.`)) {
      try {
        userManager.deleteUser(email);
        this.loadUserList();
        alert('User deleted successfully!');
      } catch (error) {
        alert(`Error deleting user: ${error.message}`);
      }
    }
  }

  // Booking Management
  loadBookingStats() {
    try {
      const reservations = JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}');
      const spots = JSON.parse(localStorage.getItem('vendor_spots_v1') || '[]');
      
      const totalSpots = spots.length;
      const bookedSpots = Object.keys(reservations).length;
      const totalRevenue = Object.values(reservations).reduce((sum, reservation) => {
        const spot = spots.find(s => s.id === reservation.spotId);
        return sum + (spot ? spot.price : 0);
      }, 0);

      document.getElementById('total-spots').textContent = totalSpots;
      document.getElementById('booked-spots').textContent = bookedSpots;
      document.getElementById('revenue-total').textContent = `$${totalRevenue.toFixed(2)}`;
    } catch (error) {
      console.error('Error loading booking stats:', error);
    }
  }

  loadBookingsList() {
    try {
      const reservations = JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}');
      const bookingsTable = document.getElementById('bookings-table');
      
      if (Object.keys(reservations).length === 0) {
        bookingsTable.innerHTML = '<p>No bookings found.</p>';
        return;
      }

      const bookingsArray = Object.entries(reservations).map(([spotId, reservation]) => ({
        spotId,
        ...reservation
      })).sort((a, b) => new Date(b.time) - new Date(a.time));

      bookingsTable.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Spot ID</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${bookingsArray.map(booking => `
              <tr>
                <td><strong>${booking.spotId}</strong></td>
                <td>${booking.name}</td>
                <td>${booking.email}</td>
                <td>${booking.phone || 'N/A'}</td>
                <td>${new Date(booking.time).toLocaleDateString()}</td>
                <td>
                  <span class="flag-badge ${booking.paid ? 'success' : 'warning'}">
                    ${booking.paid ? 'Paid' : 'Pending'}
                  </span>
                </td>
                <td>
                  <button class="btn" onclick="adminPanel.viewBookingDetails('${booking.spotId}')">View</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (error) {
      document.getElementById('bookings-table').innerHTML = `<p>Error loading bookings: ${error.message}</p>`;
    }
  }

  viewBookingDetails(spotId) {
    const reservations = JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}');
    const booking = reservations[spotId];
    
    if (!booking) {
      alert('Booking not found');
      return;
    }

    const details = `
Booking Details for Spot ${spotId}:

Customer: ${booking.name}
Email: ${booking.email}
Phone: ${booking.phone || 'Not provided'}
Website: ${booking.website || 'Not provided'}
Booking Date: ${new Date(booking.time).toLocaleString()}
Payment Status: ${booking.paid ? 'Paid' : 'Pending'}
${booking.transactionId ? `Transaction ID: ${booking.transactionId}` : ''}
    `;
    
    alert(details);
  }

  exportBookings() {
    try {
      const reservations = JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}');
      const spots = JSON.parse(localStorage.getItem('vendor_spots_v1') || '[]');
      
      const exportData = Object.entries(reservations).map(([spotId, reservation]) => {
        const spot = spots.find(s => s.id === spotId);
        return {
          spotId,
          customerName: reservation.name,
          email: reservation.email,
          phone: reservation.phone || '',
          website: reservation.website || '',
          bookingDate: new Date(reservation.time).toISOString(),
          spotPrice: spot ? spot.price : 0,
          paymentStatus: reservation.paid ? 'Paid' : 'Pending',
          transactionId: reservation.transactionId || ''
        };
      });

      const csv = this.convertToCSV(exportData);
      this.downloadCSV(csv, `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      alert(`Error exporting bookings: ${error.message}`);
    }
  }

  refreshBookings() {
    this.loadBookingStats();
    this.loadBookingsList();
  }

  // System Information
  loadSystemInfo() {
    const users = userManager.getAllUsers();
    const reservations = JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}');
    const spots = JSON.parse(localStorage.getItem('vendor_spots_v1') || '[]');
    const currentUser = userManager.getCurrentUser();

    // App Info
    document.getElementById('app-info').innerHTML = `
      <div><strong>Application:</strong> Cuban Sandwich Festival Booking System</div>
      <div><strong>Version:</strong> 1.0.0</div>
      <div><strong>Current User:</strong> ${currentUser ? currentUser.name : 'None'}</div>
      <div><strong>User Role:</strong> ${currentUser ? currentUser.flags.join(', ') : 'None'}</div>
      <div><strong>Last Updated:</strong> ${new Date().toLocaleString()}</div>
    `;

    // Storage Info
    const usersSize = JSON.stringify(users).length;
    const reservationsSize = JSON.stringify(reservations).length;
    const spotsSize = JSON.stringify(spots).length;
    const totalSize = usersSize + reservationsSize + spotsSize;

    document.getElementById('storage-info').innerHTML = `
      <div><strong>Users Data:</strong> ${this.formatBytes(usersSize)}</div>
      <div><strong>Reservations Data:</strong> ${this.formatBytes(reservationsSize)}</div>
      <div><strong>Spots Data:</strong> ${this.formatBytes(spotsSize)}</div>
      <div><strong>Total Usage:</strong> ${this.formatBytes(totalSize)}</div>
      <div><strong>Available:</strong> ${this.formatBytes(5 * 1024 * 1024 - totalSize)} (estimated)</div>
    `;

    // Performance Info
    document.getElementById('performance-info').innerHTML = `
      <div><strong>Total Users:</strong> ${Object.keys(users).length}</div>
      <div><strong>Total Bookings:</strong> ${Object.keys(reservations).length}</div>
      <div><strong>Total Spots:</strong> ${spots.length}</div>
      <div><strong>Browser:</strong> ${navigator.userAgent.split(' ')[0]}</div>
      <div><strong>Platform:</strong> ${navigator.platform}</div>
    `;
  }

  refreshSystemInfo() {
    this.loadSystemInfo();
  }

  // Settings Management
  loadSettings() {
    const settings = JSON.parse(localStorage.getItem('csf_system_settings') || '{}');
    
    // Set default values
    document.getElementById('setting-booking-enabled').checked = settings.bookingEnabled !== false;
    document.getElementById('setting-payment-required').checked = settings.paymentRequired !== false;
    document.getElementById('setting-require-login').checked = settings.requireLogin !== false;
    document.getElementById('setting-session-timeout').value = settings.sessionTimeout || 60;
  }

  saveSettings() {
    const settings = {
      bookingEnabled: document.getElementById('setting-booking-enabled').checked,
      paymentRequired: document.getElementById('setting-payment-required').checked,
      requireLogin: document.getElementById('setting-require-login').checked,
      sessionTimeout: parseInt(document.getElementById('setting-session-timeout').value) || 60,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem('csf_system_settings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  }

  exportAllData() {
    if (!confirm('Export all system data? This will download a JSON file with all users, bookings, and settings.')) {
      return;
    }

    try {
      const exportData = {
        users: userManager.getAllUsers(),
        reservations: JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}'),
        spots: JSON.parse(localStorage.getItem('vendor_spots_v1') || '[]'),
        settings: JSON.parse(localStorage.getItem('csf_system_settings') || '{}'),
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const jsonData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `csf_system_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('System data exported successfully!');
    } catch (error) {
      alert(`Error exporting data: ${error.message}`);
    }
  }

  clearOldBookings() {
    const days = prompt('Clear bookings older than how many days?', '30');
    if (!days || isNaN(days)) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    try {
      const reservations = JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}');
      let removedCount = 0;

      Object.entries(reservations).forEach(([spotId, reservation]) => {
        if (new Date(reservation.time) < cutoffDate) {
          delete reservations[spotId];
          removedCount++;
        }
      });

      localStorage.setItem('vendor_map_reservations_v1', JSON.stringify(reservations));
      alert(`Cleared ${removedCount} old bookings.`);
      this.loadBookingStats();
      this.loadBookingsList();
    } catch (error) {
      alert(`Error clearing bookings: ${error.message}`);
    }
  }

  resetSystem() {
    const confirmation = prompt(
      'WARNING: This will delete ALL data including users, bookings, and settings.\n\nType "DELETE ALL DATA" to confirm:'
    );

    if (confirmation !== 'DELETE ALL DATA') {
      alert('Reset cancelled.');
      return;
    }

    if (!confirm('Are you absolutely sure? This action cannot be undone!')) {
      return;
    }

    try {
      // Clear all data
      localStorage.removeItem('csf_users');
      localStorage.removeItem('csf_current_user');
      localStorage.removeItem('vendor_map_reservations_v1');
      localStorage.removeItem('vendor_spots_v1');
      localStorage.removeItem('csf_system_settings');
      localStorage.removeItem('admin_auth');

      alert('All system data has been cleared. You will be redirected to the home page.');
      window.location.href = 'Home.html';
    } catch (error) {
      alert(`Error resetting system: ${error.message}`);
    }
  }

  // Utility Functions
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Booking Map Functions
  async loadBookingMap() {
    try {
      // Load spots data
      let spots = JSON.parse(localStorage.getItem('vendor_spots_v1') || '[]');
      
      // If no spots in localStorage, load from spots.json
      if (spots.length === 0) {
        const response = await fetch('spots.json');
        spots = await response.json();
      }

      // Load reservations
      const reservations = JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}');

      // Clear and setup the SVG
      const svg = document.getElementById('admin-booking-map');
      svg.innerHTML = '';

      // Create spots on the map
      spots.forEach(spot => {
        const reservation = reservations[spot.id];
        const isBooked = !!reservation;
        const isPending = isBooked && !reservation.paid;

        // Determine spot status and color
        let spotClass = 'available';
        if (isBooked) {
          spotClass = isPending ? 'pending' : 'booked';
        }

        // Create spot element
        const spotElement = document.createElementNS('http://www.w3.org/2000/svg', spot.type === 'circle' ? 'circle' : 'rect');
        spotElement.classList.add('spot', spotClass);
        spotElement.setAttribute('data-spot-id', spot.id);

        if (spot.type === 'circle') {
          spotElement.setAttribute('cx', spot.x + spot.r);
          spotElement.setAttribute('cy', spot.y + spot.r);
          spotElement.setAttribute('r', spot.r);
        } else {
          spotElement.setAttribute('x', spot.x);
          spotElement.setAttribute('y', spot.y);
          spotElement.setAttribute('width', spot.w);
          spotElement.setAttribute('height', spot.h);
        }

        // Add click handler
        spotElement.addEventListener('click', () => this.showBookingDetails(spot.id, spot, reservation));

        svg.appendChild(spotElement);

        // Add spot ID label
        const labelElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelElement.classList.add('spot-label');
        labelElement.textContent = spot.id;

        if (spot.type === 'circle') {
          labelElement.setAttribute('x', spot.x + spot.r);
          labelElement.setAttribute('y', spot.y + spot.r);
        } else {
          labelElement.setAttribute('x', spot.x + spot.w / 2);
          labelElement.setAttribute('y', spot.y + spot.h / 2 - 5);
        }

        svg.appendChild(labelElement);

        // Add company name if booked
        if (isBooked && reservation.company) {
          const companyElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          companyElement.classList.add('company-label');
          companyElement.textContent = reservation.company.length > 10 ? 
            reservation.company.substring(0, 10) + '...' : reservation.company;

          if (spot.type === 'circle') {
            companyElement.setAttribute('x', spot.x + spot.r);
            companyElement.setAttribute('y', spot.y + spot.r + 8);
          } else {
            companyElement.setAttribute('x', spot.x + spot.w / 2);
            companyElement.setAttribute('y', spot.y + spot.h / 2 + 8);
          }

          svg.appendChild(companyElement);
        }
      });

    } catch (error) {
      console.error('Error loading booking map:', error);
      document.getElementById('admin-booking-map').innerHTML = 
        `<text x="400" y="300" text-anchor="middle" fill="red">Error loading map: ${error.message}</text>`;
    }
  }

  showBookingDetails(spotId, spot, reservation) {
    const panel = document.getElementById('booking-details-panel');
    const content = document.getElementById('booking-details-content');

    let detailsHTML = `
      <div class="booking-detail-item">
        <span class="booking-detail-label">Spot ID:</span>
        <span class="booking-detail-value">${spotId}</span>
      </div>
      <div class="booking-detail-item">
        <span class="booking-detail-label">Price:</span>
        <span class="booking-detail-value">$${spot.price}</span>
      </div>
      <div class="booking-detail-item">
        <span class="booking-detail-label">Description:</span>
        <span class="booking-detail-value">${spot.description || 'No description available'}</span>
      </div>
    `;

    if (reservation) {
      detailsHTML += `
        <div class="booking-detail-item">
          <span class="booking-detail-label">Status:</span>
          <span class="booking-detail-value">
            <span class="flag-badge ${reservation.paid ? 'success' : 'warning'}">
              ${reservation.paid ? 'Paid' : 'Pending Payment'}
            </span>
          </span>
        </div>
        <div class="booking-detail-item">
          <span class="booking-detail-label">Customer:</span>
          <span class="booking-detail-value">${reservation.name}</span>
        </div>
        <div class="booking-detail-item">
          <span class="booking-detail-label">Company:</span>
          <span class="booking-detail-value">${reservation.company || 'N/A'}</span>
        </div>
        <div class="booking-detail-item">
          <span class="booking-detail-label">Email:</span>
          <span class="booking-detail-value">${reservation.email}</span>
        </div>
        <div class="booking-detail-item">
          <span class="booking-detail-label">Phone:</span>
          <span class="booking-detail-value">${reservation.phone || 'N/A'}</span>
        </div>
        <div class="booking-detail-item">
          <span class="booking-detail-label">Website:</span>
          <span class="booking-detail-value">${reservation.website || 'N/A'}</span>
        </div>
        <div class="booking-detail-item">
          <span class="booking-detail-label">Business Description:</span>
          <span class="booking-detail-value">${reservation.description || 'N/A'}</span>
        </div>
        <div class="booking-detail-item">
          <span class="booking-detail-label">Booking Date:</span>
          <span class="booking-detail-value">${new Date(reservation.time).toLocaleString()}</span>
        </div>
        <div class="booking-detail-item">
          <span class="booking-detail-label">Add-ons:</span>
          <span class="booking-detail-value">${reservation.addons && reservation.addons.length > 0 ? reservation.addons.join(', ') : 'None'}</span>
        </div>
        <div class="booking-detail-item">
          <span class="booking-detail-label">Total Amount:</span>
          <span class="booking-detail-value">$${reservation.totalAmount || spot.price}</span>
        </div>
      `;
    } else {
      detailsHTML += `
        <div class="booking-detail-item">
          <span class="booking-detail-label">Status:</span>
          <span class="booking-detail-value">
            <span class="flag-badge success">Available</span>
          </span>
        </div>
      `;
    }

    content.innerHTML = detailsHTML;
    panel.style.display = 'block';
  }

  closeBookingDetails() {
    document.getElementById('booking-details-panel').style.display = 'none';
  }

  refreshBookingMap() {
    this.loadBookingMap();
  }

  exportMapData() {
    try {
      const spots = JSON.parse(localStorage.getItem('vendor_spots_v1') || '[]');
      const reservations = JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}');
      
      const mapData = spots.map(spot => {
        const reservation = reservations[spot.id];
        return {
          spotId: spot.id,
          price: spot.price,
          description: spot.description || '',
          status: reservation ? (reservation.paid ? 'Booked (Paid)' : 'Booked (Pending)') : 'Available',
          customerName: reservation ? reservation.name : '',
          company: reservation ? reservation.company : '',
          email: reservation ? reservation.email : '',
          phone: reservation ? reservation.phone : '',
          website: reservation ? reservation.website : '',
          businessDescription: reservation ? reservation.description : '',
          bookingDate: reservation ? new Date(reservation.time).toISOString() : '',
          totalAmount: reservation ? reservation.totalAmount : spot.price
        };
      });

      const csv = this.convertToCSV(mapData);
      const filename = `booking-map-data-${new Date().toISOString().split('T')[0]}.csv`;
      this.downloadCSV(csv, filename);
    } catch (error) {
      alert(`Error exporting map data: ${error.message}`);
    }
  }
}

// Global admin panel instance
const adminPanel = new AdminPanel();

// Global functions for HTML onclick handlers
function showTab(tabName) {
  adminPanel.showTab(tabName);
}

function showCreateUserForm() {
  adminPanel.showCreateUserForm();
}

function hideCreateUserForm() {
  adminPanel.hideCreateUserForm();
}

function adminCreateUser(event) {
  event.preventDefault();
  
  const name = document.getElementById('admin-user-name').value;
  const email = document.getElementById('admin-user-email').value;
  const password = document.getElementById('admin-user-password').value;
  const isAdmin = document.getElementById('admin-flag-admin').checked;
  const isEdit = document.getElementById('admin-flag-edit').checked;
  const isViewer = document.getElementById('admin-flag-viewer').checked;
  
  const flags = [];
  if (isViewer) flags.push('viewer');
  if (isEdit) flags.push('edit');
  if (isAdmin) flags.push('admin');
  
  if (flags.length === 0) {
    alert('Please select at least one permission for the user.');
    return;
  }
  
  try {
    userManager.createUser(name, email, password, flags);
    adminPanel.hideCreateUserForm();
    adminPanel.loadUserList();
    alert(`User ${name} created successfully!`);
  } catch (error) {
    alert(`Error creating user: ${error.message}`);
  }
}

function saveSettings() {
  adminPanel.saveSettings();
}

function exportBookings() {
  adminPanel.exportBookings();
}

function refreshBookings() {
  adminPanel.refreshBookings();
}

function refreshSystemInfo() {
  adminPanel.refreshSystemInfo();
}

function exportAllData() {
  adminPanel.exportAllData();
}

function clearOldBookings() {
  adminPanel.clearOldBookings();
}

function resetSystem() {
  adminPanel.resetSystem();
}

function refreshBookingMap() {
  adminPanel.refreshBookingMap();
}

function exportMapData() {
  adminPanel.exportMapData();
}

function closeBookingDetails() {
  adminPanel.closeBookingDetails();
}