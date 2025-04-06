import "dotenv/config";
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { initializeApp } from "firebase/app";
import cors from "cors";
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

const app = express();
app.use(express.json()); // Middleware to parse JSON
app.use(
  cors({
    origin: ["http://localhost:3000", "http://10.254.201.27:3000"],
  })
);

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDhRQU2nUjnv-FGkuMU2l6tMMz73gdTqg",
  authDomain: "sportsynce-97d17.firebaseapp.com",
  projectId: "sportsynce-97d17",
  storageBucket: "sportsynce-97d17.appspot.com",
  messagingSenderId: "884189714176",
  appId: "1:884189714176:web:fa9bef6af69b1f98dd85e5",
  measurementId: "G-Y3DXF9834K",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads",
    format: async () => "png",
    public_id: (req, file) =>
      `${file.originalname.split(".")[0]}-${Date.now()}`,
  },
});

const upload = multer({ storage });

// Upload Image and Add Product to Firebase
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    console.log(req.body, "hello");
    const imageUrl = req.file.path; // Get Cloudinary URL from uploaded image
    const productData = req.body; // Get product details from request body

    // Store in Firestore
    const docRef = await addDoc(collection(db, "products"), {
      name: productData.name,
      price: parseFloat(productData.price),
      category: productData.category,
      stock: parseInt(productData.stock),
      imageUrl: imageUrl,
      description: productData.description,
      sizes: productData.sizes
        ? productData.sizes.split(",").map((s) => s.trim())
        : [],
      createdAt: Timestamp.now(),
      addedBy: productData.addedBy,
    });

    res.json({
      success: true,
      message: "Product added!",
      productId: docRef.id,
      imageUrl,
    });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to upload product." });
  }
});

// Update Product with Image Upload
app.put("/update/:productId", upload.single("image"), async (req, res) => {
  try {
    const { productId } = req.params;
    const productData = req.body;
    const updateData = {};

    // Check if product exists
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Handle image if provided
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    // Add other fields if they exist in the request
    if (productData.name) updateData.name = productData.name;
    if (productData.price) updateData.price = parseFloat(productData.price);
    if (productData.category) updateData.category = productData.category;
    if (productData.stock) updateData.stock = parseInt(productData.stock);
    if (productData.description)
      updateData.description = productData.description;
    if (productData.sizes) {
      updateData.sizes = productData.sizes.split(",").map((s) => s.trim());
    }

    // Add updatedAt timestamp
    updateData.updatedAt = Timestamp.now();

    // Update the document
    await updateDoc(productRef, updateData);

    res.json({
      success: true,
      message: "Product updated successfully!",
      productId,
      imageUrl: updateData.imageUrl || productSnap.data().imageUrl,
      updatedFields: Object.keys(updateData),
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update product.",
    });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
