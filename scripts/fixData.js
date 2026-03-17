const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const mongoURI = "mongodb+srv://michmuzo55_db_user:basquetian2021m@cluster0.6qdrrgb.mongodb.net/tattooStudio?retryWrites=true&w=majority";

const designSchema = new mongoose.Schema({
  imageUrl: String,
  price: String,
  createdAt: { type: Date, default: Date.now }
});
const Design = mongoose.model("Design", designSchema);

async function fixData() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");
    
    const designs = await Design.find();
    const tattooDir = path.join(__dirname, "..", "public", "tattoo");
    const files = fs.readdirSync(tattooDir);
    
    console.log("\n--- FIXING DESIGNS ---");
    for (const d of designs) {
      const dbFilename = path.basename(d.imageUrl);
      if (!files.includes(dbFilename)) {
        // Find exact match based on time string if present
        let match = null;
        if (dbFilename.includes("7.28.28")) match = files.find(f => f.includes("7.28.28"));
        else if (dbFilename.includes("7.28.29")) match = files.find(f => f.includes("7.28.29"));
        else if (dbFilename.includes("7.28.33")) match = files.find(f => f.includes("7.28.33"));
        
        if (match) {
          console.log(`Updating ${dbFilename} to ${match}`);
          d.imageUrl = `/tattoo/${match}`;
          await d.save();
        } else {
          // General matching for others
          const cleanName = dbFilename.replace(/^\d+-/, "").replace(/_/g, " ");
          const fallback = files.find(f => f.includes(cleanName.split(".")[0]));
          if (fallback) {
            console.log(`Fallback matching ${dbFilename} to ${fallback}`);
            d.imageUrl = `/tattoo/${fallback}`;
            await d.save();
          }
        }
      }
    }
    
    await mongoose.disconnect();
    console.log("\nDone!");
  } catch (err) {
    console.error(err);
  }
}

fixData();
