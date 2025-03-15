require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// ✅ Enable CORS for frontend connection
const corsOptions = {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("✅ Connected to MongoDB");
}).catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
});

// ✅ Define GPS Location Schema
const gpsSchema = new mongoose.Schema({
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});
const GpsLocation = mongoose.model("GpsLocation", gpsSchema);

// ✅ Test API
app.get("/", (req, res) => {
    res.json({ message: "🟢 GPS Tracker Backend (MongoDB) is Running!" });
});

// ✅ Save GPS Location (ESP32)
app.get("/update_location", async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: "❌ Missing latitude or longitude" });
    }

    try {
        const newLocation = new GpsLocation({ lat, lon });
        await newLocation.save();
        console.log(`📡 Location Saved: Lat=${lat}, Lon=${lon}`);
        res.json({ success: true, lat, lon });
    } catch (error) {
        console.error("❌ MongoDB Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Get Latest GPS Location
app.get("/get_location", async (req, res) => {
    try {
        const lastLocation = await GpsLocation.findOne().sort({ timestamp: -1 }).lean();
        res.json(lastLocation || { lat: 0, lon: 0 });
    } catch (error) {
        console.error("❌ MongoDB Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Get All GPS Locations (Route History)
app.get("/get_all_locations", async (req, res) => {
    try {
        const allLocations = await GpsLocation.find().sort({ timestamp: -1 }).lean();
        res.json(allLocations);
    } catch (error) {
        console.error("❌ MongoDB Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Delete Old GPS Data (Keep Last 100 Entries)
app.delete("/cleanup", async (req, res) => {
    try {
        const totalDocs = await GpsLocation.countDocuments();
        if (totalDocs > 100) {
            const toDelete = totalDocs - 100;
            await GpsLocation.deleteMany().sort({ timestamp: 1 }).limit(toDelete);
            console.log(`🗑️ Deleted ${toDelete} old records`);
        }
        res.json({ message: "✅ Cleanup done if necessary" });
    } catch (error) {
        console.error("❌ MongoDB Cleanup Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Start the Server
const PORT = process.env.PORT || 2000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});