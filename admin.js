document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const productModal = document.getElementById('productModal');
  const userModal = document.getElementById('userModal');
  const closeModals = document.querySelectorAll('.close');
  const productForm = document.getElementById('productForm');
  const userForm = document.getElementById('userForm');
  const productList = document.querySelector('.product-list');
  const usersTableBody = document.getElementById('usersTableBody');
  const addProductBtn = document.getElementById('addProductBtn');
  const addUserBtn = document.getElementById('addUserBtn');
  const logoutLink = document.getElementById('logoutLink');

  // Event Listeners
  addProductBtn.addEventListener('click', () => {
    productModal.style.display = 'block';
  });

  closeModal.addEventListener('click', () => {
    productModal.style.display = 'none';
  });

  // Modal event listeners
  closeModals.forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      productModal.style.display = 'none';
      userModal.style.display = 'none';
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target === productModal) {
      productModal.style.display = 'none';
    }
    if (e.target === userModal) {
      userModal.style.display = 'none';
    }
  });

  // Add user button
  addUserBtn.addEventListener('click', () => {
    userForm.reset();
    userModal.style.display = 'block';
  });

  // User form submission
  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userData = {
      name: userForm.name.value,
      email: userForm.email.value,
      role: userForm.role.value
    };

    // Only include password if it's a new user
    if (!userForm.dataset.userId && userForm.password.value) {
      userData.password = userForm.password.value;
    }

    try {
      const url = userForm.dataset.userId 
        ? `/api/users/${userForm.dataset.userId}`
        : '/api/users';
        
      const method = userForm.dataset.userId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) throw new Error('Error saving user');

      const savedUser = await response.json();
      
      if (userForm.dataset.userId) {
        // Update existing user in table
        const row = document.querySelector(`tr[data-user-id="${savedUser._id}"]`);
        if (row) {
          row.innerHTML = `
            <td>${savedUser.name}</td>
            <td>${savedUser.email}</td>
            <td>${savedUser.role}</td>
            <td>
              <button onclick="editUser('${savedUser._id}')">Editar</button>
              <button onclick="deleteUser('${savedUser._id}')">Eliminar</button>
            </td>
          `;
        }
      } else {
        // Add new user to table
        addUserToTable(savedUser);
      }

      userModal.style.display = 'none';
      userForm.reset();
      delete userForm.dataset.userId;
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving user');
    }
  });

  // Load initial users
  loadUsers();

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', productForm.name.value);
    formData.append('description', productForm.description.value);
    formData.append('price', productForm.price.value);
    formData.append('countInStock', productForm.countInStock.value);
    formData.append('image', productForm.image.files[0]);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Error creating product');

      const newProduct = await response.json();
      alert('Producto creado exitosamente');
      loadProducts(); // Refresh the product list
      productModal.style.display = 'none';
      productForm.reset();
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating product');
    }
  });

  logoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('userToken');
    window.location.href = 'index.html';
  });

  // Load initial products
  loadProducts();

  // Functions
  async function loadProducts() {
    try {
      const response = await fetch('/api/products');
      const products = await response.json();
      productList.innerHTML = '';
      products.forEach(product => addProductToDOM(product));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  function addProductToDOM(product) {
    const productItem = document.createElement('div');
    productItem.className = 'product-item';
    productItem.innerHTML = `
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <p>$${product.price.toFixed(2)}</p>
        <p>Stock: ${product.countInStock}</p>
        <div class="product-actions">
          <button onclick="editProduct('${product._id}')">Editar</button>
          <button onclick="deleteProduct('${product._id}')">Eliminar</button>
        </div>
      </div>
    `;
    productList.appendChild(productItem);
  }

  async function editProduct(id) {
    // TODO: Implement edit functionality
    alert('Edit product: ' + id);
  }

  async function deleteProduct(id) {
    if (confirm('¿Está seguro que desea eliminar este producto?')) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
          }
        });

        if (!response.ok) throw new Error('Error deleting product');
        
        loadProducts();
      } catch (error) {
        console.error('Error:', error);
        alert('Error deleting product');
      }
    }
  }

  // User management functions
  async function loadUsers() {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      });
      const users = await response.json();
      usersTableBody.innerHTML = '';
      users.forEach(user => addUserToTable(user));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  function addUserToTable(user) {
    const row = document.createElement('tr');
    row.dataset.userId = user._id;
    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>
        <button onclick="editUser('${user._id}')">Editar</button>
        <button onclick="deleteUser('${user._id}')">Eliminar</button>
      </td>
    `;
    usersTableBody.appendChild(row);
  }

  // Validate user role before form submission
  userForm.addEventListener('submit', (e) => {
    const role = userForm.role.value;
    if (!['admin', 'user'].includes(role)) {
      e.preventDefault();
      alert('Rol inválido. Seleccione "admin" o "user".');
      return false;
    }
  });

  async function editUser(id) {
    try {
      const response = await fetch(`/api/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      });
      const user = await response.json();
      
      userForm.name.value = user.name;
      userForm.email.value = user.email;
      userForm.role.value = user.role;
      userForm.dataset.userId = user._id;
      
      userModal.style.display = 'block';
    } catch (error) {
      console.error('Error:', error);
      alert('Error loading user data');
    }
  }

  async function deleteUser(id) {
    if (confirm('¿Está seguro que desea eliminar este usuario?')) {
      try {
        const response = await fetch(`/api/users/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
          }
        });

        if (!response.ok) throw new Error('Error deleting user');
        
        loadUsers();
      } catch (error) {
        console.error('Error:', error);
        alert('Error deleting user');
      }
    }
  }

  // Check admin role on page load
  async function checkAdminRole() {
    try {
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      });
      const user = await response.json();
      
      if (user.role !== 'admin') {
        window.location.href = 'index.html';
      }
    } catch (error) {
      console.error('Error:', error);
      window.location.href = 'index.html';
    }
  }

  checkAdminRole();
});
