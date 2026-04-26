import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localDataDir = path.join(__dirname, '.dev-data');
const localWaterOrdersFile = path.join(localDataDir, 'water-orders.json');

function readLocalWaterOrders() {
    try {
        return JSON.parse(fs.readFileSync(localWaterOrdersFile, 'utf8'));
    } catch {
        return [];
    }
}

function writeLocalWaterOrders(orders) {
    fs.mkdirSync(localDataDir, { recursive: true });
    fs.writeFileSync(localWaterOrdersFile, JSON.stringify(orders, null, 2));
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection (Use your Render MongoDB URL in .env)
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studentnest';

console.log('🔄 Attempting MongoDB connection...');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔗 URI prefix:', mongoURI.substring(0, 30) + '...');

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
})
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('💡 Fix: Check Atlas IP Whitelist → Allow 0.0.0.0/0');
        console.error('💡 Fix: Check Render Environment Variables → MONGODB_URI is set?');
    });

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
    sub: String,
    sellerEmail: String,
    views: { type: Number, default: 0 },
    lat: Number,
    lng: Number,
    locationName: String,
    date: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

const supportSchema = new mongoose.Schema({
    type: String,
    user: String,
    detail: String,
    status: { type: String, default: 'Pending' },
    messages: [{
        sender: String,
        text: String,
        time: { type: Date, default: Date.now }
    }],
    time: { type: Date, default: Date.now }
});
const Support = mongoose.model('Support', supportSchema);

const orderSchema = new mongoose.Schema({
    productId: String,
    productName: String,
    price: Number,
    buyerEmail: String,
    sellerEmail: String,
    location: String,
    status: { type: String, default: 'Success' },
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Water Order Schema
const waterOrderSchema = new mongoose.Schema({
    localId: String,
    userEmail: String,
    userName: String,
    userPhone: String,
    roomDetails: String,
    quantity: Number,
    totalPrice: Number,
    plan: { type: String, default: 'Instant' },
    paymentStatus: { type: String, default: 'Pending' },
    billingCycle: String,
    billingNote: String,
    nextBillingDate: Date,
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
});
const WaterOrder = mongoose.model('WaterOrder', waterOrderSchema);

// API Routes
app.get('/api/health', (req, res) => res.send('Server is running...'));

// Auth API
app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    try {
        const isWaterSeller = (email || '').trim().toLowerCase() === 'gangawater@gmail.com';
        const isWaterPass = String(pass || '').trim() === 'water @123' || String(pass || '').replace(/\s+/g, '') === 'water@123';
        if (isWaterSeller && isWaterPass) {
            return res.json({ success: true, user: { name: 'Ganga Water', email: 'gangawater@gmail.com', role: 'water_supplier' } });
        }
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database not connected' });
        }
        const user = await User.findOne({ email, pass });
        if (user) {
            res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.post('/api/signup', async (req, res) => {
    const { name, email, pass } = req.body;
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database not connected' });
        }
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'Email exists' });
        const newUser = new User({ name, email, pass });
        await newUser.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Change Password API
app.put('/api/change-password', async (req, res) => {
    const { email, oldPass, newPass } = req.body;
    try {
        const user = await User.findOne({ email, pass: oldPass });
        if (!user) return res.status(401).json({ success: false, message: 'Old password is incorrect' });
        user.pass = newPass;
        await user.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Requirements/Requests API
const requirementSchema = new mongoose.Schema({
    title: String,
    category: String,
    budget: String,
    desc: String,
    userEmail: String,
    userName: String,
    status: { type: String, default: 'Open' },
    date: { type: Date, default: Date.now }
});
const Requirement = mongoose.model('Requirement', requirementSchema);

app.post('/api/requirements', async (req, res) => {
    try {
        const req2 = new Requirement(req.body);
        await req2.save();
        res.json({ success: true, id: req2._id });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/requirements', async (req, res) => {
    try {
        const reqs = await Requirement.find().sort({ date: -1 });
        res.json(reqs);
    } catch (err) { res.status(500).json([]); }
});

// Products API
app.get('/api/products', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json([]); // MongoDB not connected, return empty - frontend uses local
        }
        const products = await Product.find().sort({ date: -1 });
        res.json(products);
    } catch (err) { res.json([]); }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.json(product);
    } catch (err) { res.status(404).json(null); }
});

app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.json({ success: true, product: newProduct });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.put('/api/products/:id/view', async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Support API
app.post('/api/support', async (req, res) => {
    try {
        const ticket = new Support({ ...req.body, messages: [{ sender: 'System', text: 'Connecting you to an agent...' }] });
        await ticket.save();
        res.json({ success: true, ticketId: ticket._id });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.put('/api/support/:id', async (req, res) => {
    try {
        const { sender, text } = req.body;
        await Support.findByIdAndUpdate(req.params.id, {
            $push: { messages: { sender, text } }
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/support', async (req, res) => {
    try {
        const tickets = await Support.find().sort({ time: -1 });
        res.json(tickets);
    } catch (err) { res.status(500).json([]); }
});

// Orders API
app.post('/api/orders', async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) { res.status(500).json([]); }
});

// Water Orders API
app.post('/api/water-orders', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            const localOrders = readLocalWaterOrders();
            const order = {
                ...req.body,
                _id: req.body._id || `local-water-${Date.now()}`,
                localId: req.body.localId || `water-${Date.now()}`,
                status: req.body.status || 'Pending',
                date: req.body.date || new Date().toISOString()
            };
            writeLocalWaterOrders([order, ...localOrders.filter(o => o.localId !== order.localId && o._id !== order._id)]);
            return res.json({ success: true, order });
        }
        const wo = new WaterOrder(req.body);
        await wo.save();
        res.json({ success: true, order: wo });
    } catch (err) {
        const localOrders = readLocalWaterOrders();
        const order = {
            ...req.body,
            _id: req.body._id || `local-water-${Date.now()}`,
            localId: req.body.localId || `water-${Date.now()}`,
            status: req.body.status || 'Pending',
            date: req.body.date || new Date().toISOString()
        };
        writeLocalWaterOrders([order, ...localOrders.filter(o => o.localId !== order.localId && o._id !== order._id)]);
        res.json({ success: true, order, localFallback: true });
    }
});

app.get('/api/water-orders', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json(readLocalWaterOrders().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
        }
        const wo = await WaterOrder.find().sort({ date: -1 });
        res.json(wo);
    } catch (err) { res.json(readLocalWaterOrders().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))); }
});

app.put('/api/water-orders/:id/deliver', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            const localOrders = readLocalWaterOrders().map(o => (
                o._id === req.params.id || o.localId === req.params.id ? { ...o, status: 'Delivered' } : o
            ));
            writeLocalWaterOrders(localOrders);
            return res.json({ success: true });
        }
        await WaterOrder.findByIdAndUpdate(req.params.id, { status: 'Delivered' });
        res.json({ success: true });
    } catch (err) {
        const localOrders = readLocalWaterOrders().map(o => (
            o._id === req.params.id || o.localId === req.params.id ? { ...o, status: 'Delivered' } : o
        ));
        writeLocalWaterOrders(localOrders);
        res.json({ success: true, localFallback: true });
    }
});

app.put('/api/water-orders/:id/cancel', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            const localOrders = readLocalWaterOrders().map(o => (
                o._id === req.params.id || o.localId === req.params.id ? { ...o, status: 'Canceled' } : o
            ));
            writeLocalWaterOrders(localOrders);
            return res.json({ success: true });
        }
        await WaterOrder.findByIdAndUpdate(req.params.id, { status: 'Canceled' });
        res.json({ success: true });
    } catch (err) {
        const localOrders = readLocalWaterOrders().map(o => (
            o._id === req.params.id || o.localId === req.params.id ? { ...o, status: 'Canceled' } : o
        ));
        writeLocalWaterOrders(localOrders);
        res.json({ success: true, localFallback: true });
    }
});

// Serve Frontend
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
