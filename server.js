const express = require("express")
const mongoose = require("mongoose")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const app = express()

// Asegurar que la carpeta 'uploads' exista en Render
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("Carpeta 'uploads' creada");
}

// --- FUNCIÓN DE NOTIFICACIÓN POR DISCORD (CON IMAGEN) ---
async function enviarNotificacionDiscord(data, filename) {
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1482146605791711296/gvrOnZDJmtXLncsBJqpm6uYRxCS79h1AWDw8LTsASYLlbKLytr8xGShwJsFzT0KvM8wj";

  let imagePath = null;
  let finalFilename = "referencia.jpg";

  if (filename) {
    imagePath = path.join(__dirname, "uploads", filename);
    finalFilename = filename;
  } else if (data.chosenDesignUrl) {
    const cleanPath = data.chosenDesignUrl.replace(/\\/g, "/");
    imagePath = path.join(__dirname, "public", cleanPath);
    finalFilename = path.basename(cleanPath);
  }

  const embed = {
    title: "🔥 NUEVA COTIZACIÓN RECIBIDA",
    color: 3447003, // Color azul
    fields: [
      { name: "👤 Nombre", value: data.name || "No indicado", inline: true },
      { name: "📱 WhatsApp", value: data.whatsapp || "No indicado", inline: true },
      { name: "🎂 Edad", value: data.age || "No indicada", inline: true },
      { name: "📏 Tamaño", value: data['tattoo-size'] || "No especificado", inline: true },
      { name: "🎨 Estilo", value: data.style || "No seleccionado", inline: true },
      { name: "💡 Idea", value: data.idea || "Sin detalles" }
    ],
    footer: { text: "333 Tattoo Studio Web" },
    timestamp: new Date()
  };

  try {
    const formData = new FormData();
    
    if (imagePath && fs.existsSync(imagePath)) {
      embed.image = { url: `attachment://${finalFilename}` };
      const fileBuffer = fs.readFileSync(imagePath);
      const blob = new Blob([fileBuffer]);
      formData.append("file", blob, finalFilename);
    }

    formData.append("payload_json", JSON.stringify({ embeds: [embed] }));

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      console.log("✅ Notificación enviada a Discord con éxito");
    } else {
      console.log("❌ Error enviando a Discord:", await response.text());
    }
  } catch (error) {
    console.error("❌ Error de red Discord:", error.message);
  }
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use("/uploads", express.static("uploads")) // Permitir ver las imágenes subidas

const mongoURI = "mongodb+srv://michmuzo55_db_user:basquetian2021m@cluster0.6qdrrgb.mongodb.net/tattooStudio?retryWrites=true&w=majority";

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 5000, // Tiempo máximo para conectar antes de fallar
  socketTimeoutMS: 45000, // Tiempo de espera para operaciones
})
.then(() => console.log("✅ Conectado exitosamente a MongoDB Atlas"))
.catch(err => {
  console.error("❌ ERROR FATAL AL CONECTAR A MONGODB:", err.message);
  console.error("Detalle del error:", err);
});

// Monitorear cambios en la conexión
mongoose.connection.on('error', err => {
  console.error('⚠️ Error en la conexión de MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB desconectado. Intentando reconectar...');
});

const bookingSchema = new mongoose.Schema({
  name: String,
  whatsapp: String,
  age: String,
  tattooSize: String,
  style: String,
  idea: String,
  reference: String,
  chosenDesignUrl: String
})

const Booking = mongoose.model("Booking",bookingSchema)

// --- NUEVO ESQUEMA PARA DISEÑOS DISPONIBLES ---
const designSchema = new mongoose.Schema({
  imageUrl: String,
  price: String,
  createdAt: { type: Date, default: Date.now }
})
const Design = mongoose.model("Design", designSchema)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Si es un diseño de admin va a 'public/tattoo', si es referencia de cliente a 'uploads'
    const folder = req.path.includes("admin") ? "public/tattoo" : "uploads";
    cb(null, folder)
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname)
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes"));
    }
  }
})

// --- RUTAS DE ADMINISTRACIÓN ---
const ADMIN_PASSWORD = "333adminpassword"; // Cambia esto por la contraseña que quieras

// Obtener todos los diseños (Público)
app.get("/api/designs", async (req, res) => {
  try {
    const designs = await Design.find().sort({ createdAt: -1 });
    res.json(designs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar un diseño (Admin)
app.post("/api/admin/designs", upload.single("image"), async (req, res) => {
  const { password, price } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Debes subir una imagen" });
  }

  try {
    const newDesign = new Design({
      imageUrl: `tattoo/${req.file.filename}`,
      price: price || "Consultar"
    });
    await newDesign.save();
    res.status(201).json(newDesign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un diseño (Admin)
app.delete("/api/admin/designs/:id", async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  try {
    const design = await Design.findById(req.params.id);
    if (design) {
      // Eliminar el archivo físico
      const filePath = path.join(__dirname, "public", design.imageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      
      await Design.findByIdAndDelete(req.params.id);
      res.json({ message: "Diseño eliminado" });
    } else {
      res.status(404).json({ error: "Diseño no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/booking", upload.single("reference"), async (req, res) => {
  try {
    console.log("➡️ [1] Recibida petición POST en /booking");
    
    if (mongoose.connection.readyState !== 1) {
      console.error("❌ ERROR: MongoDB no conectado");
      return res.status(503).json({ error: "Base de datos desconectada" });
    }

    console.log("➡️ [2] Guardando en base de datos...");
    const booking = new Booking({
      name: req.body.name,
      whatsapp: req.body.whatsapp,
      age: req.body.age,
      tattooSize: req.body['tattoo-size'],
      style: req.body.style,
      idea: req.body.idea,
      reference: req.file?.filename,
      chosenDesignUrl: req.body.chosenDesignUrl
    });

    await booking.save();
    console.log("✅ [3] Reserva guardada con éxito");

    console.log("➡️ [4] Iniciando envío de notificación a Discord...");
    enviarNotificacionDiscord(req.body, req.file?.filename);

    console.log("➡️ [5] Enviando respuesta 'ok' al cliente");
    res.status(200).send("ok");

  } catch (error) {
    console.error("❌ ERROR CRÍTICO EN /BOOKING:", error);
    res.status(500).json({ 
      error: "Error interno", 
      message: error.message 
    });
  }
})

app.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor corriendo en el puerto ${process.env.PORT || 3000}`)
})