import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false, required: true },
    isVendor: { type: Boolean, default: false },
    isDeliveryPersonnel: { type: Boolean, default: false },
    role: { type: String, required: true, default: 'customer' }, // Add the role field
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;
