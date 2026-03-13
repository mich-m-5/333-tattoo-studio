const express = require("express")
const mongoose = require("mongoose")
const multer = require("multer")
const nodemailer = require("nodemailer")
const path = require("path")
const fs = require("fs")
const app = express()

// Asegurar que la carpeta 'uploads' exista en Render
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("Carpeta 'uploads' creada");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "333.tattoo.studio.ec@gmail.com",
    pass: "pprz cfaa nccm nnng"
  }
})

async function enviarCorreo(data, filename) {
  let imagePath = null;
  const logoPath = path.join(__dirname, "public", "tattoo", "WhatsApp Image 2026-03-10 at 10.06.21 PM.jpeg");
  
  if (filename) {
    imagePath = path.join(__dirname, "uploads", filename);
  } else if (data.chosenDesignUrl) {
    const cleanPath = data.chosenDesignUrl.replace(/\\/g, "/");
    imagePath = path.join(__dirname, "public", cleanPath);
  }

  const attachments = [];
  
  // Adjuntar Logo para el encabezado del correo
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'logo.jpg',
      path: logoPath,
      cid: 'studioLogo' // ID para usar en el HTML
    });
  }

  // Adjuntar imagen de referencia o diseño escogido
  if (imagePath && fs.existsSync(imagePath)) {
    attachments.push({ 
      filename: filename || path.basename(imagePath),
      path: imagePath 
    });
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="cid:studioLogo" alt="333 Tattoo Studio" style="max-width: 150px; height: auto;">
        <h2 style="color: #007bff; margin-top: 10px;">NUEVA COTIZACIÓN RECIBIDA</h2>
      </div>
      <hr style="border: 0; border-top: 1px solid #eee;">
      <div style="padding: 10px 0;">
        <p><strong>Nombre:</strong> ${data.name}</p>
        <p><strong>WhatsApp:</strong> ${data.whatsapp}</p>
        <p><strong>Edad:</strong> ${data.age || 'No proporcionada'}</p>
        <p><strong>Tamaño aproximado:</strong> ${data['tattoo-size'] || 'No especificado'}</p>
        <p><strong>Estilo:</strong> ${data.style || 'No seleccionado'}</p>
        <p><strong>Idea/Detalles:</strong> ${data.idea || 'No proporcionada'}</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #eee;">
      <p style="font-size: 0.9em; color: #555;">
        ${data.chosenDesignUrl ? `<strong>Diseño seleccionado del catálogo:</strong> ${data.chosenDesignUrl}` : '<strong>Referencia:</strong> El cliente subió su propia foto (adjunta en este correo).'}
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"333 Tattoo Studio" <333.tattoo.studio.ec@gmail.com>`,
      to: "333.tattoo.studio.ec@gmail.com",
      subject: `Nueva solicitud de tatuaje - ${data.name}`,
      text: `NUEVA COTIZACIÓN RECIBIDA: \n\nNombre: ${data.name}\nWhatsApp: ${data.whatsapp}\nEdad: ${data.age || 'No proporcionada'}\nTamaño: ${data['tattoo-size']}\nEstilo: ${data.style}\nIdea: ${data.idea}`,
      html: emailHtml,
      attachments: attachments
    });
    console.log("Correo enviado con éxito. ID:", info.messageId);
  } catch (error) {
    console.error("Error al enviar el correo:", error);
  }
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use("/uploads", express.static("uploads")) // Permitir ver las imágenes subidas

mongoose.connect("mongodb+srv://michmuzo55_db_user:basquetian2021m@cluster0.6qdrrgb.mongodb.net/tattooStudio?retryWrites=true&w=majority")
.then(() => console.log("Conectado a MongoDB Atlas"))
.catch(err => console.error("Error conectando:", err))

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
    console.log("Datos recibidos en el backend:", req.body);
    console.log("Archivo recibido:", req.file);

    const booking = new Booking({
      name: req.body.name,
      whatsapp: req.body.whatsapp,
      age: req.body.age,
      tattooSize: req.body['tattoo-size'],
      style: req.body.style,
      idea: req.body.idea,
      reference: req.file?.filename,
      chosenDesignUrl: req.body.chosenDesignUrl
    })

    await booking.save()
    console.log("Reserva guardada en la base de datos.");

    // Enviar correo con los datos de la reserva
    await enviarCorreo(req.body, req.file?.filename);

    res.status(200).send("ok")
  } catch (error) {
    console.error("ERROR CRÍTICO EN /BOOKING:", error);
    res.status(500).json({ 
      error: "Error interno en el servidor", 
      message: error.message 
    });
  }
})

app.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor corriendo en el puerto ${process.env.PORT || 3000}`)
})