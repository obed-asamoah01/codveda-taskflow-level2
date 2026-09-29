const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User credentials and authorization role for TaskFlow accounts.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'A name is required.'], trim: true },
    email: { type: String, required: [true, 'An email address is required.'], unique: true, lowercase: true, trim: true },
    // Passwords are stored only as bcrypt hashes and excluded from normal queries.
    password: { type: String, required: [true, 'A password is required.'], select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

// Hash a new or changed password before it reaches MongoDB.
// Uses the modern promise-based hook style (no next callback) supported by Mongoose 7+.
// Mongoose awaits the returned Promise automatically, so throwing will abort the save.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare a supplied password against this user's stored bcrypt hash.
userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
