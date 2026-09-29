const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'A task title is required.'], trim: true },
    description: { type: String, trim: true },
    completed: { type: Boolean, default: false },
    // Every task belongs to exactly one authenticated user.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Supports efficient "my tasks" queries made by the protected task routes.
taskSchema.index({ user: 1 });

module.exports = mongoose.model('Task', taskSchema);
