const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const corsOptions = {
  origin: ['http://localhost:3001','http://localhost:3000', 'https://vercelaura.vercel.app','https://aura.vercel.app','https://auraweb.vercel.app'], // Agrega aquí los dominios permitidos
  optionsSuccessStatus: 200
};

app.use(bodyParser.json());
app.use(cors(corsOptions));

const uri = process.env.MONGODB_URI || "mongodb+srv://oswaldobru01:Ob010796@aura.atgra.mongodb.net/?retryWrites=true&w=majority&appName=Aura";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar a MongoDB Atlas:', err.message));

// Schema and Model
const { Schema } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const ItemSchema = new Schema({
  idTipoArticulo: {
    type: Number,
    unique: true
  },
  nombreArticulo: {
    type: String,
    required: true
  },
  tipoArticulo: {
    type: Number,
    required: true
  },
  items: [{
    material: {
      type: String,
      required: true
    },
    cantidad: {
      type: Number,
      required: true
    },
    unidad: {
      type: String,
      required: true
    },
    costo: {
      type: Number,
      required: true
    }
  }],
  costoTotal: {
    type: Number
  }
}, {
  versionKey: false 
});

ItemSchema.plugin(AutoIncrement, { inc_field: 'idTipoArticulo' });

ItemSchema.pre('save', function(next) {
  this.costoTotal = this.items.reduce((sum, item) => sum + item.costo, 0);
  next();
});

ItemSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  if (update.$set && update.$set['items.$.costo']) {
    const docToUpdate = await this.model.findOne(this.getQuery());
    docToUpdate.costoTotal = docToUpdate.items.reduce((sum, item) => sum + item.costo, 0);
    await docToUpdate.save();
  }
  next();
});

const Item = mongoose.model('Item', ItemSchema);

app.get('/aura', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los items' });
  }
});

app.post('/aura', async (req, res) => {
  try {
    const existingItemCount = await Item.countDocuments({ nombreArticulo: req.body.nombreArticulo });
    if (existingItemCount > 0) {
      return res.status(400).json({ message: `No se puede duplicar el item con nombreArticulo: ${req.body.nombreArticulo}` });
    }

    const newItem = new Item(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar el item' });
  }
});

app.delete('/aura/eliminarArticulo/:tipoArticulo/:nombreArticulo', async (req, res) => {
  try {
    const { tipoArticulo, nombreArticulo } = req.params;
    const item = await Item.findOneAndDelete({ tipoArticulo, nombreArticulo });

    if (!item) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    res.status(200).json({ message: 'Artículo eliminado', item });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el artículo', error: error.message });
  }
});

app.delete('/aura/eliminarItem/:tipoArticulo/:nombreArticulo/:material', async (req, res) => {
  try {
    const { tipoArticulo, nombreArticulo, material } = req.params;
    const item = await Item.findOne({ tipoArticulo, nombreArticulo });

    if (!item) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    const updatedItems = item.items.filter(i => i.material !== material);

    if (updatedItems.length === item.items.length) {
      return res.status(404).json({ message: 'Material no encontrado en el artículo' });
    }

    item.items = updatedItems;
    await item.save();

    res.status(200).json({ message: 'Material eliminado', item });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el material', error: error.message });
  }
});

app.put('/aura/:tipoArticulo/:nombreArticulo', async (req, res) => {
  try {
    const { tipoArticulo, nombreArticulo } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Debes proporcionar un array de items con al menos un item.' });
    }

    let item = await Item.findOne({ tipoArticulo, nombreArticulo });

    if (!item) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    for (let newItem of items) {
      await Item.updateOne(
        { tipoArticulo, nombreArticulo },
        { $pull: { items: { material: newItem.material } } }
      );

      item.items.push(newItem);
    }

    item.costoTotal = item.items.reduce((sum, item) => sum + item.costo, 0);


    await item.save();

    res.status(200).json({ message: 'Items actualizados correctamente', item });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar los items', error: error.message });
  }
});


app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}/`);
});
