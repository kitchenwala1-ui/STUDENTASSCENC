import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection (Use your Render MongoDB URL in .env)
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studentnest';
mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    pass: String,
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    img: String,
    category: String,
    desc: String,
    sellerEmail: String,
    date: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

// API Routes
app.get('/api/health', (req, res) => res.send('Server is running...'));

// Login API
app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    try {
        const user = await User.findOne({ email, pass });
        if (user) {
            res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Signup API
app.post('/api/signup', async (req, res) => {
    const { name, email, pass } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });
        
        const newUser = new User({ name, email, pass });
        await newUser.save();
        res.json({ success: true, message: 'Account created' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Products API
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ date: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

// Serve Frontend (Vite production build)
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
