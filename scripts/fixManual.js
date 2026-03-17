const mongoose = require("mongoose");

const mongoURI = "mongodb+srv://michmuzo55_db_user:basquetian2021m@cluster0.6qdrrgb.mongodb.net/tattooStudio?retryWrites=true&w=majority";

const designSchema = new mongoose.Schema({
  imageUrl: String,
  price: String
});
const Design = mongoose.model("Design", designSchema);

async function fixData() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");
    
    // Fix specific designs
    await Design.findByIdAndUpdate("69b8d5cd24887f1d06c2a7b3", { imageUrl: "/tattoo/WhatsApp Image 2026-03-12 at 7.28.28 PM.jpeg" });
    await Design.findByIdAndUpdate("69b8d5da24887f1d06c2a7b6", { imageUrl: "/tattoo/WhatsApp Image 2026-03-12 at 7.28.29 PM.jpeg" });
    await Design.findByIdAndUpdate("69b8d5e824887f1d06c2a7b9", { imageUrl: "/tattoo/WhatsApp Image 2026-03-12 at 7.28.33 PM.jpeg" });
    
    console.log("Designs fixed manually.");
    
    await mongoose.disconnect();
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
}

fixData();
