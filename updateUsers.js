const mongoose = require('mongoose');
const User = require('./models/User');

async function updateUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/carrito-compras');
    
    // Update all users to have a name field
    await User.updateMany({}, { $set: { name: 'Arturo' } });
    
    // Verify the updates
    const users = await User.find({});
    console.log(users);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

updateUsers();
