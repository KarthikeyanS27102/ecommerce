import express from 'express';
import data from './data.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import seedRouter from './routes/seedRoutes.js';
import productRouter from './routes/productRoutes.js';
import userRouter from './routes/userRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import Razorpay from 'razorpay';
import cors from 'cors';
import Order from './models/orderModel.js';
import uploadRouter from './routes/uploadRoutes.js';

// Configure dotenv for environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://karthik27102:dQfSwmlZ4P8gmCuE@test-db.auzyt.mongodb.net/?retryWrites=true&w=majority&appName=test-db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Increase timeout
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.log(`Error connecting to MongoDB: ${err.message}`));


const app = express();
app.use(cors({
  origin: 'https://fluffy-pegasus-e6f398.netlify.app',  // Allow your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Allow all necessary HTTP methods
  credentials: true,  // Include credentials like cookies, authorization headers, etc.
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Razorpay configuration route
app.get('/api/config/razorpay', (req, res) => {
  res.send({ key: process.env.RAZORPAY_KEY_ID });
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Route for creating Razorpay order
app.post('/api/orders/:id/create-razorpay-order', async (req, res) => {
  const order = await Order.findById(req.params.id);
  const payment_capture = 1;
  const currency = 'INR';

  const options = {
    amount: order.totalPrice * 100, // Razorpay works in paise
    currency,
    receipt: `receipt_order_${order._id}`,
    payment_capture,
  };

  try {
    const response = await razorpay.orders.create(options);
    res.json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Some error occurred');
  }
});

// Route for handling order payment
app.put('/api/orders/:id/pay', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.razorpay_payment_id,
      status: 'Paid',
      update_time: Date.now(),
      email_address: req.user.email,
    };
    const updatedOrder = await order.save();
    res.json({ message: 'Order Paid', order: updatedOrder });
  } else {
    res.status(404).send({ message: 'Order Not Found' });
  }
});

// Route for Google API key
app.get('/api/keys/google', (req, res) => {
  res.send({ key: process.env.GOOGLE_API_KEY || '' });
});

// Set up routes
app.use('/api/upload', uploadRouter);
app.use('/api/seed', seedRouter);
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);

// Default route
app.get('/', (req, res) => {
  res.send('Server is ready');
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Serve at http://localhost:${port}`);
});
