const mongoose = require('mongoose');

// Reemplaza los valores en la cadena de conexión con los datos de tu usuario y base de datos
const uri = "mongodb+srv://oswaldobru01:Ob010796@aura.atgra.mongodb.net/?retryWrites=true&w=majority&appName=Aura";

const connectDB = async () => {
  try {
    await mongoose.connect(uri); // No se necesitan opciones adicionales
    console.log('Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('Error al conectar a MongoDB Atlas:', error.message);
    process.exit(1); // Detiene el proceso en caso de error
  }
};

module.exports = connectDB;