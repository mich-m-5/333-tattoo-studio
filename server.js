const express = require("express")
const mongoose = require("mongoose")
const multer = require("multer")
const nodemailer = require("nodemailer")
const path = require("path")
const fs = require("fs")
const dns = require("dns")
dns.setDefaultResultOrder("ipv4first") // FORZAR IPv4 para evitar el error ENETUNREACH en Render
const app = express()

// Asegurar que la carpeta 'uploads' exista en Render
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("Carpeta 'uploads' creada");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: "333.tattoo.studio.ec@gmail.com",
    pass: "ztkm mmfo zncj vppo"
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2"
  },
  pool: true, // Mantener conexión abierta
  maxConnections: 1,
  rateDelta: 20000, // Esperar 20s entre intentos si falla
  rateLimit: 1,
  family: 4 // FORZAR IPv4
});

// Verificar conexión SMTP al iniciar con un pequeño retraso
setTimeout(() => {
  console.log("🔍 [SISTEMA] Verificando conexión de correo (MODO POOL)...");
  transporter.verify((error, success) => {
    if (error) {
      console.log("⚠️ [AVISO] El correo podría tardar o fallar por restricciones de Render:", error.message);
    } else {
      console.log("✅ SISTEMA DE CORREO LISTO (MODO POOL)");
    }
  });
}, 8000); // 8 segundos para dar tiempo a la red de Render

async function enviarCorreo(data, filename) {
  console.log("📬 [PASO 1] INICIANDO PROCESO DE CORREO...");
  
  let imagePath = null;
  const logoPath = path.resolve(__dirname, "public", "tattoo", "WhatsApp Image 2026-03-10 at 10.06.21 PM.jpeg");
  
  if (filename) {
    imagePath = path.resolve(__dirname, "uploads", filename);
    console.log("📎 [PASO 2] Adjuntando archivo subido por usuario:", filename);
  } else if (data.chosenDesignUrl) {
    const cleanPath = data.chosenDesignUrl.replace(/\\/g, "/");
    imagePath = path.resolve(__dirname, "public", cleanPath);
    console.log("📎 [PASO 2] Adjuntando diseño del catálogo:", cleanPath);
  }

  const attachments = [];
  
  if (fs.existsSync(logoPath)) {
    attachments.push({ filename: 'logo.jpg', path: logoPath, cid: 'studioLogo' });
    console.log("✅ [PASO 3] Logo encontrado");
  } else {
    console.log("⚠️ [PASO 3] Logo NO encontrado");
  }

  if (imagePath && fs.existsSync(imagePath)) {
    attachments.push({ filename: filename || path.basename(imagePath), path: imagePath });
    console.log("✅ [PASO 4] Imagen de referencia encontrada");
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        ${fs.existsSync(logoPath) ? '<img src="cid:studioLogo" alt="333 Tattoo Studio" style="max-width: 150px; height: auto;">' : '<h1 style="color: #007bff;">333 Tattoo Studio</h1>'}
        <h2 style="color: #007bff; margin-top: 10px;">NUEVA COTIZACIÓN RECIBIDA</h2>
      </div>
      <hr style="border: 0; border-top: 1px solid #eee;">
      <div style="padding: 10px 0;">
        <p><strong>Nombre:</strong> ${data.name}</p>
        <p><strong>WhatsApp:</strong> ${data.whatsapp}</p>
        <p><strong>Edad:</strong> ${data.age || 'No proporcionada'}</p>
        <p><strong>Tamaño:</strong> ${data['tattoo-size'] || 'No especificado'}</p>
        <p><strong>Estilo:</strong> ${data.style || 'No seleccionado'}</p>
        <p><strong>Idea:</strong> ${data.idea || 'No proporcionada'}</p>
      </div>
    </div>
  `;

  try {
    console.log("🚀 [PASO 5] Disparando correo hacia Gmail (IPv4)...");
    const info = await transporter.sendMail({
      from: `"333 Tattoo Studio" <333.tattoo.studio.ec@gmail.com>`,
      to: "333.tattoo.studio.ec@gmail.com",
      subject: `Nueva solicitud - ${data.name}`,
      html: emailHtml,
      attachments: attachments
    });
    console.log("✨ [PASO 6] ¡CORREO ENVIADO CON ÉXITO! ID:", info.messageId);
    return true; // Para que el .then() funcione bien
  } catch (error) {
    console.log("❌ [PASO 6] ERROR AL ENVIAR CORREO:", error.message);
    throw error; // Lanzamos el error para que el .catch() lo atrape en la ruta
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

const storage = multer.diskStorage({

destination:(req,file,cb)=>{

cb(null,"uploads")

},

filename:(req,file,cb)=>{

cb(null,Date.now()+"-"+file.originalname)

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

    console.log("➡️ [4] Iniciando envío de correo...");
    // No esperamos (await) el correo para responder rápido al cliente, 
    // pero capturamos errores internos.
    enviarCorreo(req.body, req.file?.filename)
      .then(() => console.log("✅ [5] Correo enviado en segundo plano"))
      .catch(err => console.error("❌ [5] Error enviando correo:", err));

    console.log("➡️ [6] Enviando respuesta 'ok' al cliente");
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