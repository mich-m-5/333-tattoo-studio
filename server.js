const express = require("express")
const mongoose = require("mongoose")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const cloudinary = require("cloudinary").v2;

const app = express()

// Configuración de Cloudinary (Opcional pero RECOMENDADA para Render)
// Para que las imágenes no se borren, el usuario debe configurar estas variables en Render
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
//new
// Asegurar que las carpetas necesarias existan
const folders = ["uploads", "public/tattoo"];
folders.forEach(folder => {
  const dir = path.join(__dirname, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Carpeta '${folder}' creada`);
  }
});

// --- FUNCIÓN DE NOTIFICACIÓN POR DISCORD (CON IMAGEN) ---
async function enviarNotificacionDiscord(data, filename) {
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1482146605791711296/gvrOnZDJmtXLncsBJqpm6uYRxCS79h1AWDw8LTsASYLlbKLytr8xGShwJsFzT0KvM8wj";

  let imagePath = null;
  let finalFilename = "referencia.jpg";

  if (filename) {
    imagePath = path.join(__dirname, "uploads", filename);
    finalFilename = filename;
  } else if (data.chosenDesignUrl) {
    // Si la URL es de Cloudinary, no buscamos en el disco local
    if (data.chosenDesignUrl.includes("cloudinary.com")) {
      embed.image = { url: data.chosenDesignUrl };
      imagePath = null; // No enviar como adjunto si ya es una URL pública
    } else {
      let relativePath = decodeURIComponent(data.chosenDesignUrl).replace(/\\/g, "/");
      if (relativePath.startsWith("http")) {
        try {
          const url = new URL(relativePath);
          relativePath = url.pathname;
        } catch (e) {}
      }
      const cleanRelativePath = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
      imagePath = path.join(__dirname, "public", cleanRelativePath);
      finalFilename = path.basename(cleanRelativePath);
    }
  }

  const embed = {
    title: "🔥 NUEVA COTIZACIÓN RECIBIDA",
    color: 3447003,
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
    // 1. Intentar enviar primero solo el JSON (es lo que menos bloquea Cloudflare)
    console.log("🚀 Enviando datos a Discord...");
    const jsonResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!jsonResponse.ok) {
      const errorText = await jsonResponse.text();
      console.error("❌ Error en Discord (JSON):", errorText.substring(0, 100));
    } else {
      console.log("✅ Datos enviados a Discord");
    }

    // 2. Intentar enviar la imagen por SEPARADO solo si existe localmente
    if (imagePath && fs.existsSync(imagePath)) {
      console.log("📎 Enviando imagen adjunta...");
      const imgFormData = new FormData();
      const fileBuffer = fs.readFileSync(imagePath);
      const blob = new Blob([fileBuffer]);
      imgFormData.append("file", blob, finalFilename);
      
      // Actualizar el embed con el attachment si se envía como FormData
      embed.image = { url: `attachment://${finalFilename}` };
      // Enviar de nuevo con la imagen adjunta
      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        },
        body: imgFormData
      });
    }
  } catch (error) {
    console.error("❌ Excepción en Discord:", error.message);
  }
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, "public")))
app.use("/uploads", express.static(path.join(__dirname, "uploads"))) // Permitir ver las imágenes subidas

const mongoURI = "mongodb+srv://michmuzo55_db_user:basquetian2021m@cluster0.6qdrrgb.mongodb.net/tattooStudio?retryWrites=true&w=majority";

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4
})
.then(async () => {
  console.log("✅ Conectado exitosamente a MongoDB Atlas");
})
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

// --- NUEVO ESQUEMA PARA EL PORTAFOLIO ---
const portfolioSchema = new mongoose.Schema({
  imageUrl: String,
  mediaType: { type: String, default: "image" }, // "image" o "video"
  createdAt: { type: Date, default: Date.now }
})
const Portfolio = mongoose.model("Portfolio", portfolioSchema)

// --- NUEVO ESQUEMA PARA RESEÑAS ---
const reviewSchema = new mongoose.Schema({
  name: String,
  rating: Number,
  comment: String,
  tattooImageUrl: String,
  tattooMediaType: { type: String, default: "image" }, // "image" o "video"
  createdAt: { type: Date, default: Date.now }
})
const Review = mongoose.model("Review", reviewSchema)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Si es un diseño de admin va a 'public/tattoo', si es referencia de cliente a 'uploads'
    const isTattoo = req.path.includes("admin") || req.path.includes("designs") || req.path.includes("portfolio");
    const folder = isTattoo ? "public/tattoo" : "uploads";
    cb(null, path.join(__dirname, folder))
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, '_'))
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes o videos"));
    }
  }
})

// --- CONFIGURACIÓN DE CONTRASEÑAS ---
const ADMIN_PASSWORD = "333tattoo333"; 
const REVIEW_PASSWORD = "333"; // Contraseña para dejar reseñas

// Ruta para verificar la contraseña admin
app.post("/api/admin/verify", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Contraseña incorrecta" });
  }
});

// Middleware de verificación de contraseña
const verifyAdmin = (req, res, next) => {
  const password = req.headers["x-admin-password"] || req.body.password;
  if (password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "No autorizado" });
  }
};

// Obtener todos los diseños (Público)
app.get("/api/designs", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json([]);
    }

    const designs = await Design.find().sort({ createdAt: -1 });
    const normalized = designs.map(d => {
      let imageUrl = d.imageUrl;
      // Si la URL no es de Cloudinary y no empieza con /, añadirle /
      if (!imageUrl?.startsWith("http") && !imageUrl?.startsWith("/")) {
        imageUrl = `/${imageUrl}`;
      }
      return {
        ...d.toObject(),
        imageUrl: imageUrl,
        price: d.price || ""
      };
    });
    res.json(normalized);
  } catch (error) {
    console.error("Error /api/designs:", error);
    res.status(500).json([]);
  }
});

// Agregar un diseño (Admin)
app.post("/api/admin/designs", verifyAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Debes subir una imagen" });
  }

  const { price } = req.body;

  try {
    let imageUrl = `/tattoo/${req.file.filename}`;

    // Si Cloudinary está configurado, subir allí para persistencia
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "tattoo_studio/designs"
        });
        imageUrl = result.secure_url;
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (uploadErr) {
        console.error("Error subiendo a Cloudinary:", uploadErr.message);
        // Si falla Cloudinary, seguimos con la URL local para que no de error 500
      }
    }

    const newDesign = new Design({
      imageUrl,
      price: (price ?? "").toString().trim()
    });
    await newDesign.save();
    res.status(201).json(newDesign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un diseño (Admin)
app.delete("/api/admin/designs/:id", verifyAdmin, async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (design) {
      // Eliminar de Cloudinary si es una URL de Cloudinary
      if (design.imageUrl.includes("cloudinary.com")) {
        try {
          // Extraer el public_id de la URL
          const publicId = design.imageUrl.split("/").slice(-2).join("/").split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (e) {
          console.error("Error al eliminar de Cloudinary:", e.message);
        }
      } else {
        // Eliminar el archivo físico local
        const filePath = path.join(__dirname, "public", design.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      
      await Design.findByIdAndDelete(req.params.id);
      res.json({ message: "Diseño eliminado" });
    } else {
      res.status(404).json({ error: "Diseño no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- RUTAS DE ADMINISTRACIÓN (PORTAFOLIO) ---

// Obtener todo el portafolio (Público)
app.get("/api/portfolio", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json([]);
    }
    const portfolio = await Portfolio.find().sort({ createdAt: -1 });
    const normalized = portfolio.map(p => {
      let imageUrl = p.imageUrl;
      if (!imageUrl?.startsWith("http") && !imageUrl?.startsWith("/")) {
        imageUrl = `/${imageUrl}`;
      }
      return {
        ...p.toObject(),
        imageUrl: imageUrl,
        mediaType: p.mediaType || "image"
      };
    });
    res.json(normalized);
  } catch (error) {
    console.error("Error /api/portfolio:", error);
    res.status(500).json([]);
  }
});

// Agregar al portafolio (Admin)
app.post("/api/admin/portfolio", verifyAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Debes subir un archivo" });
  }

  try {
    let imageUrl = `/tattoo/${req.file.filename}`;
    const isVideo = req.file.mimetype.startsWith("video/");
    const mediaType = isVideo ? "video" : "image";

    // Si Cloudinary está configurado, subir allí para persistencia
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "tattoo_studio/portfolio",
          resource_type: isVideo ? "video" : "image"
        });
        imageUrl = result.secure_url;
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (uploadErr) {
        console.error("Error subiendo a Cloudinary (portfolio):", uploadErr.message);
      }
    }

    const newPortfolio = new Portfolio({
      imageUrl,
      mediaType
    });
    await newPortfolio.save();
    res.status(201).json(newPortfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// update

// Eliminar del portafolio (Admin)
app.delete("/api/admin/portfolio/:id", verifyAdmin, async (req, res) => {
  try {
    const item = await Portfolio.findById(req.params.id);
    if (item) {
      // Eliminar de Cloudinary si es una URL de Cloudinary
      if (item.imageUrl.includes("cloudinary.com")) {
        try {
          // Extraer el public_id de la URL
          const publicId = item.imageUrl.split("/").slice(-2).join("/").split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (e) {
          console.error("Error al eliminar de Cloudinary:", e.message);
        }
      } else {
        // Eliminar el archivo físico local
        const filePath = path.join(__dirname, "public", item.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      
      await Portfolio.findByIdAndDelete(req.params.id);
      res.json({ message: "Imagen de portafolio eliminada" });
    } else {
      res.status(404).json({ error: "Imagen no encontrada" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- RUTAS DE RESEÑAS ---

// Obtener todas las reseñas (Público)
app.get("/api/reviews", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar una reseña (Público con contraseña)
app.post("/api/reviews", async (req, res) => {
  const { name, rating, comment, password, tattooImageUrl, tattooMediaType } = req.body;
  if (!name || !rating || !comment || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  if (password !== REVIEW_PASSWORD) {
    return res.status(401).json({ error: "Contraseña de reseña incorrecta" });
  }

  try {
    const newReview = new Review({ 
      name, 
      rating, 
      comment, 
      tattooImageUrl, 
      tattooMediaType: tattooMediaType || "image" 
    });
    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar reseña (Admin)
app.delete("/api/admin/reviews/:id", verifyAdmin, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Reseña eliminada" });
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
    await enviarNotificacionDiscord(req.body, req.file?.filename);

    console.log("➡️ [5] Enviando respuesta al cliente");
    res.status(200).json({ 
      status: "ok", 
      referenceUrl: req.file ? `/uploads/${req.file.filename}` : null 
    });

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