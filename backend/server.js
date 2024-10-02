const express = require('express');
const data = require('./data.js');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const seedRouter = require('./routes/seedRoutes.js');
const productRouter = require('./routes/productRoutes.js');
const userRouter = require('./routes/userRoutes.js');
const orderRouter = require('./routes/orderRoutes.js');
const Razorpay = require('razorpay');
const cors = require('cors');
const Order = require('./models/orderModel.js');
const uploadRouter = require('./routes/uploadRoutes.js');

// Configure dotenv for environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log(`Error connecting to MongoDB: ${err.message}`));

const app = express();
app.use(cors());
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
