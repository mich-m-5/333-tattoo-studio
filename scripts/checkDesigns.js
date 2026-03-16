const mongoose = require('mongoose');

const mongoURI = "mongodb+srv://michmuzo55_db_user:basquetian2021m@cluster0.6qdrrgb.mongodb.net/tattooStudio?retryWrites=true&w=majority";

const designSchema = new mongoose.Schema({ imageUrl: String, price: String, createdAt: Date });
const Design = mongoose.model('Design', designSchema);

(async () => {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    const designs = await Design.find().sort({ createdAt: -1 }).limit(10).lean();
    console.log('Found', designs.length, 'designs');
    designs.forEach(d => {
      console.log('-', d._id, 'price:', JSON.stringify(d.price), 'imageUrl:', d.imageUrl);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error('ERROR', err);
  }
})();
