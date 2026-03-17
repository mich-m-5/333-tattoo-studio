const mongoose = require("mongoose");

const mongoURI = "mongodb+srv://michmuzo55_db_user:basquetian2021m@cluster0.6qdrrgb.mongodb.net/tattooStudio?retryWrites=true&w=majority";

const designSchema = new mongoose.Schema({
  imageUrl: String,
  price: String,
  createdAt: { type: Date, default: Date.now }
});
const Design = mongoose.model("Design", designSchema);

const portfolioSchema = new mongoose.Schema({
  imageUrl: String,
  createdAt: { type: Date, default: Date.now }
});
const Portfolio = mongoose.model("Portfolio", portfolioSchema);

async function checkData() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");
    
    const designs = await Design.find();
    console.log("\n--- DESIGNS ---");
    designs.forEach(d => console.log(`ID: ${d._id}, URL: ${d.imageUrl}, Price: ${d.price}`));
    
    const portfolio = await Portfolio.find();
    console.log("\n--- PORTFOLIO ---");
    portfolio.forEach(p => console.log(`ID: ${p._id}, URL: ${p.imageUrl}`));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkData();
