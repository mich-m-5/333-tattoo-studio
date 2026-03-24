const mongoose = require("mongoose");

// Cambia esta URL por la de tu MongoDB Atlas si es distinta
const mongoURI = "mongodb+srv://michmuzo55_db_user:basquetian2021m@cluster0.6qdrrgb.mongodb.net/tattooStudio?retryWrites=true&w=majority";

const portfolioSchema = new mongoose.Schema({
  imageUrl: String,
  mediaType: { type: String, default: "image" },
  createdAt: { type: Date, default: Date.now }
});
const Portfolio = mongoose.model("Portfolio", portfolioSchema);

async function addMedia() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Conectado a MongoDB");

    // --- AGREGA AQUÍ TUS LINKS ---
    const itemsParaAgregar = [
      {
        url: "../public/tattoo/", // Ejemplo: "https://res.cloudinary.com/.../imagen.jpg"
        type: "image" // Pon "video" si es un video
      },
      // Puedes agregar más objetos aquí separados por coma
    ];

    for (const item of itemsParaAgregar) {
      if (item.url !== "LINK_DE_TU_FOTO_O_VIDEO_AQUI") {
        const nuevo = new Portfolio({
          imageUrl: item.url,
          mediaType: item.type
        });
        await nuevo.save();
        console.log(`✅ Agregado: ${item.url}`);
      }
    }

    await mongoose.disconnect();
    console.log("Terminado. Los cambios son permanentes.");
  } catch (err) {
    console.error("Error:", err);
  }
}

addMedia();
