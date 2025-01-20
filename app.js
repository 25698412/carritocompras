// Login function
// Helper function to make authenticated requests
async function makeRequest(url, options = {}) {
  let token = localStorage.getItem('userToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Validate token format before using it
  if (token) {
    if (typeof token !== 'string' || token.split('.').length !== 3) {
      // Clear all auth data and redirect
      localStorage.removeItem('userToken');
      localStorage.removeItem('isAdmin');
      sessionStorage.removeItem('userToken');
      sessionStorage.removeItem('isAdmin');
      window.location.href = 'login.html';
      return;
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add credentials to include cookies
  options.credentials = 'include';

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle token expiration/invalid tokens
    if (response.status === 401) {
      localStorage.removeItem('userToken');
      localStorage.removeItem('isAdmin');
      window.location.href = 'login.html';
      return;
    }

    return response;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

async function login(event) {
  event.preventDefault();
  
  const usernameOrEmail = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;
  const errorMessage = document.getElementById('error-message');

  // Clear previous errors
  errorMessage.textContent = '';
  errorMessage.classList.remove('visible');

  // Basic validation
  if (!usernameOrEmail || !password) {
    errorMessage.textContent = 'Por favor completa todos los campos';
    errorMessage.classList.add('visible');
    return;
  }

  try {
    const response = await makeRequest('http://localhost:5005/api/users/login', {
      method: 'POST',
      body: JSON.stringify({
        email: usernameOrEmail,
        password
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Validate token format before storing
      if (typeof data.token === 'string' && data.token.split('.').length === 3) {
        if (rememberMe) {
          // Store token in localStorage for persistent login
          localStorage.setItem('userToken', data.token);
          localStorage.setItem('isAdmin', data.isAdmin);
        } else {
          // Store token in sessionStorage for session-only login
          sessionStorage.setItem('userToken', data.token);
          sessionStorage.setItem('isAdmin', data.isAdmin);
        }
        window.location.href = 'index.html';
      } else {
        throw new Error('Invalid token format received from server');
      }
    } else {
      errorMessage.textContent = data.message || 'Error al iniciar sesión';
      errorMessage.classList.add('visible');
    }
  } catch (error) {
    console.error('Error:', error);
    errorMessage.textContent = 'Error al conectar con el servidor';
    errorMessage.classList.add('visible');
  }
}

// Function to refresh access token using refresh token
async function refreshAccessToken() {
  try {
    const response = await fetch('http://localhost:5005/api/users/refresh-token', {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem('userToken', data.accessToken);
        return data.accessToken;
      }
    }
    throw new Error('Failed to refresh token');
  } catch (error) {
    console.error('Token refresh failed:', error);
    logout();
    return null;
  }
}

// Enhanced makeRequest with token refresh
async function makeRequest(url, options = {}) {
  let token = localStorage.getItem('userToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Validate token format before using it
  if (token) {
    if (typeof token !== 'string' || token.split('.').length !== 3) {
      localStorage.removeItem('userToken');
      localStorage.removeItem('isAdmin');
      window.location.href = 'login.html';
      return;
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add credentials to include cookies
  options.credentials = 'include';

  try {
    let response = await fetch(url, {
      ...options,
      headers
    });

    // If token expired, try to refresh it
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers
        });
      }
    }

    return response;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

// Enhanced logout function
function logout() {
  // Clear client-side tokens
  localStorage.removeItem('userToken');
  localStorage.removeItem('isAdmin');
  sessionStorage.removeItem('userToken');
  sessionStorage.removeItem('isAdmin');

  // Clear server-side refresh token
  fetch('http://localhost:5005/api/users/logout', {
    method: 'POST',
    credentials: 'include'
  });

  window.location.href = 'login.html';
}

// Función para verificar autenticación y actualizar navbar
function updateNavbar() {
  const token = localStorage.getItem('userToken');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const loginLink = document.getElementById('loginLink');
  const profileLink = document.getElementById('profileLink');
  const adminLink = document.getElementById('adminLink');

  if (token) {
    if (loginLink) loginLink.style.display = 'none';
    if (profileLink) profileLink.style.display = 'block';
    if (adminLink) adminLink.style.display = isAdmin ? 'block' : 'none';
  } else {
    if (loginLink) loginLink.style.display = 'block';
    if (profileLink) profileLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
  }
}

// Actualizar navbar al cargar la página
document.addEventListener('DOMContentLoaded', updateNavbar);

// Manejar logout
document.getElementById('logoutLink')?.addEventListener('click', function(e) {
  e.preventDefault();
  localStorage.removeItem('userToken');
  localStorage.removeItem('isAdmin');
  window.location.href = 'index.html';
});

// Handle admin panel navigation
document.getElementById('adminLink')?.addEventListener('click', function(e) {
  e.preventDefault();
  const token = localStorage.getItem('userToken');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  
  if (token && isAdmin) {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'login.html';
  }
});

// Función para manejar el registro
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
      const response = await makeRequest('http://localhost:5005/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Registro exitoso! Por favor inicia sesión');
      window.location.href = 'login.html';
    } else {
      alert(data.message || 'Error en el registro');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al conectar con el servidor');
  }
});

// Profile functionality
function toggleEditForm() {
  const form = document.getElementById('editForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function togglePasswordForm() {
  const form = document.getElementById('passwordForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

// Handle profile picture upload
document.getElementById('pictureInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('profilePicture', file);

  try {
      const response = await fetch('http://localhost:5005/api/users/profile-picture', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      },
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      document.getElementById('profilePicture').src = data.profilePictureUrl;
      alert('Foto de perfil actualizada correctamente');
    } else {
      throw new Error('Error al actualizar la foto de perfil');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al actualizar la foto de perfil');
  }
});

// Handle profile information update
document.getElementById('profileEditForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('editName').value;
  const email = document.getElementById('editEmail').value;

  try {
      const response = await fetch('http://localhost:5005/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      },
      body: JSON.stringify({ name, email })
    });

    if (response.ok) {
      const data = await response.json();
      document.getElementById('profileName').textContent = data.name;
      document.getElementById('profileEmail').textContent = data.email;
      toggleEditForm();
      alert('Perfil actualizado correctamente');
    } else {
      throw new Error('Error al actualizar el perfil');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al actualizar el perfil');
  }
});

// Enhanced Cart State with Local Storage Persistence
let cart = {
  items: [],
  total: 0,
  taxRate: 0.16, // IVA 16%
  shippingCost: 50 // Default shipping cost
};

// Save cart to localStorage
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Load cart from localStorage
function loadCart() {
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartDisplay();
  }
}

// Calculate subtotal
function calculateSubtotal() {
  return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Calculate taxes
function calculateTaxes() {
  return calculateSubtotal() * cart.taxRate;
}

// Calculate total with taxes and shipping
function calculateTotal() {
  return calculateSubtotal() + calculateTaxes() + cart.shippingCost;
}

// Update cart display with enhanced details
function updateCartDisplay() {
  const cartItems = document.querySelector('.cart-items');
  const subtotalElement = document.getElementById('subtotal');
  const taxesElement = document.getElementById('taxes');
  const shippingElement = document.getElementById('shipping');
  const totalElement = document.getElementById('total');
  
  // Clear existing items
  cartItems.innerHTML = '';
  
  // Add current items with quantity controls
  cart.items.forEach((item, index) => {
    const itemElement = document.createElement('div');
    itemElement.className = 'cart-item';
    itemElement.innerHTML = `
      <div class="item-info">
        <span>${item.name}</span>
        <span>$${item.price.toFixed(2)}</span>
      </div>
      <div class="quantity-controls">
        <button class="quantity-btn" data-index="${index}" data-action="decrease">-</button>
        <span class="quantity">${item.quantity}</span>
        <button class="quantity-btn" data-index="${index}" data-action="increase">+</button>
        <button class="remove-btn" data-index="${index}">×</button>
      </div>
      <div class="item-total">
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `;
    cartItems.appendChild(itemElement);
  });

  // Update totals
  const subtotal = calculateSubtotal();
  const taxes = calculateTaxes();
  const total = calculateTotal();
  
  subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
  taxesElement.textContent = `$${taxes.toFixed(2)}`;
  shippingElement.textContent = `$${cart.shippingCost.toFixed(2)}`;
  totalElement.textContent = `$${total.toFixed(2)}`;

  // Update cart count in navbar
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = cartCount;
    el.style.display = cartCount > 0 ? 'inline-block' : 'none';
  });

  saveCart();
}

// Add to cart functionality with quantity validation
document.querySelectorAll('.add-to-cart-btn').forEach(button => {
  button.addEventListener('click', async (e) => {
    const productCard = e.target.closest('.product-card');
    const product = {
      id: productCard.dataset.productId,
      name: productCard.querySelector('.product-name').textContent,
      price: parseFloat(productCard.querySelector('.product-price').textContent.replace('$', '')),
      quantity: 1,
      stock: parseInt(productCard.dataset.productStock),
      image: productCard.querySelector('.product-image').src
    };

    // Check stock availability
    if (product.stock < 1) {
      alert('Producto agotado');
      return;
    }

    // Check if item already exists in cart
    const existingItem = cart.items.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert('No hay suficiente stock disponible');
        return;
      }
      existingItem.quantity += 1;
    } else {
      cart.items.push(product);
    }
    
    // Update display and save
    updateCartDisplay();
  });
});

// Handle quantity changes and item removal
document.querySelector('.cart-items')?.addEventListener('click', (e) => {
  const index = e.target.dataset.index;
  if (index === undefined) return;

  const item = cart.items[index];
  
  if (e.target.classList.contains('quantity-btn')) {
    const action = e.target.dataset.action;
    if (action === 'increase') {
      if (item.quantity >= item.stock) {
        alert('No hay suficiente stock disponible');
        return;
      }
      item.quantity += 1;
    } else if (action === 'decrease') {
      item.quantity -= 1;
      if (item.quantity < 1) {
        cart.items.splice(index, 1);
      }
    }
  } else if (e.target.classList.contains('remove-btn')) {
    cart.items.splice(index, 1);
  }

  updateCartDisplay();
});

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  updateCartDisplay();
});

// Enhanced Checkout Process
document.getElementById('checkout-btn')?.addEventListener('click', async () => {
  // Validate cart
  if (cart.items.length === 0) {
    alert('Tu carrito está vacío');
    return;
  }

  // Show checkout modal
  const modal = document.getElementById('checkout-modal');
  modal.style.display = 'block';

  // Handle modal close
  document.querySelector('.close-modal')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Handle form submission
  document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const shippingAddress = {
      street: formData.get('street'),
      city: formData.get('city'),
      state: formData.get('state'),
      zip: formData.get('zip'),
      country: formData.get('country')
    };
    
    const paymentMethod = formData.get('payment-method');
    const orderNotes = formData.get('order-notes');

    // Validate required fields
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.zip) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      // Create order payload
      const order = {
        items: cart.items,
        subtotal: calculateSubtotal(),
        taxes: calculateTaxes(),
        shipping: cart.shippingCost,
        total: calculateTotal(),
        shippingAddress,
        paymentMethod,
        orderNotes
      };

      const response = await makeRequest('http://localhost:5005/api/orders', {
        method: 'POST',
        body: JSON.stringify(order)
      });

      if (response.ok) {
        const data = await response.json();
        modal.style.display = 'none';
        
        // Clear cart and show confirmation
        cart = { items: [], total: 0, taxRate: 0.16, shippingCost: 50 };
        updateCartDisplay();
        
        // Show order confirmation
        document.getElementById('order-confirmation').style.display = 'block';
        document.getElementById('order-number').textContent = data.orderNumber;
        document.getElementById('order-total').textContent = `$${order.total.toFixed(2)}`;
        
        // Reset form
        e.target.reset();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al procesar la compra');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  });
});

// Handle order confirmation close
document.getElementById('close-confirmation')?.addEventListener('click', () => {
  document.getElementById('order-confirmation').style.display = 'none';
});

// Handle password change
document.getElementById('passwordChangeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    alert('Las contraseñas no coinciden');
    return;
  }

  try {
    const response = await fetch('http://localhost:5005/api/users/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (response.ok) {
      togglePasswordForm();
      alert('Contraseña cambiada correctamente');
    } else {
      const data = await response.json();
      throw new Error(data.message || 'Error al cambiar la contraseña');
    }
  } catch (error) {
    console.error('Error:', error);
    alert(error.message);
  }
});

// Load profile data when page loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('http://localhost:5005/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      document.getElementById('profileName').textContent = data.name;
      document.getElementById('profileEmail').textContent = data.email;
      if (data.profilePictureUrl) {
        document.getElementById('profilePicture').src = data.profilePictureUrl;
      }
    }
  } catch (error) {
    console.error('Error cargando datos del perfil:', error);
  }
});
