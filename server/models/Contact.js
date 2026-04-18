// models/Contact.js
import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one contact per (walletAddress, name) combination
contactSchema.index({ walletAddress: 1, name: 1 }, { unique: true });

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
