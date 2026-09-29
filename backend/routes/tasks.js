const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const validationResponse = (error) => Object.fromEntries(
  Object.entries(error.errors).map(([field, detail]) => [field, detail.message])
);

const handleError = (res, error) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation failed.', errors: validationResponse(error) });
  }
  return res.status(500).json({ message: 'An unexpected error occurred.' });
};

const isOwner = (task, userId) => task.user.toString() === userId;

// Create a task.
router.post('/', async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, user: req.user.id });
    return res.status(201).json(task);
  } catch (error) {
    return handleError(res, error);
  }
});

// Get all tasks, newest first.
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json(tasks);
  } catch (error) {
    return handleError(res, error);
  }
});

// Get one task by its MongoDB id.
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Task not found.' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    if (!isOwner(task, req.user.id)) return res.status(403).json({ message: 'You do not own this task.' });
    return res.status(200).json(task);
  } catch (error) {
    return handleError(res, error);
  }
});

// Update one task and validate the new values.
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Task not found.' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    if (!isOwner(task, req.user.id)) return res.status(403).json({ message: 'You do not own this task.' });
    const updates = { ...req.body };
    delete updates.user;
    Object.assign(task, updates);
    await task.save();
    return res.status(200).json(task);
  } catch (error) {
    return handleError(res, error);
  }
});

// Delete one task.
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Task not found.' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    if (!isOwner(task, req.user.id)) return res.status(403).json({ message: 'You do not own this task.' });
    await task.deleteOne();
    return res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
