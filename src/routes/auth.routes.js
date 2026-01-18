const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword
} = require('../controllers/auth.controller');

const { protect } = require('../middleware/auth');
const {
  registerValidator,
  loginValidator,
  updateDetailsValidator,
  updatePasswordValidator
} = require('../validators/auth.validator');

const router = express.Router();

// Public routes
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetailsValidator, updateDetails);
router.put('/updatepassword', protect, updatePasswordValidator, updatePassword);

module.exports = router;