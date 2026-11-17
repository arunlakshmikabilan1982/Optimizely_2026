const express = require("express");
const { body } = require("express-validator");

const {
    register,
    login,
    getProfile
} = require("../controllers/LoginController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// Registration
router.post(
    "/register",
    [
        body("firstName")
            .trim()
            .notEmpty()
            .withMessage("First name is required"),

        body("lastName")
            .trim()
            .notEmpty()
            .withMessage("Last name is required"),

        body("email")
            .trim()
            .isEmail()
            .withMessage("Enter a valid email"),

        body("password")
            .isLength({ min: 8 })
            .withMessage("Password must contain at least 8 characters"),

        body("phoneNumber")
            .trim()
            .matches(/^\+?[0-9]{10,15}$/)
            .withMessage("Enter a valid phone number")
    ],
    register
);

// Login
router.post(
    "/login",
    [
        body("email")
            .trim()
            .isEmail()
            .withMessage("Enter a valid email"),

        body("password")
            .notEmpty()
            .withMessage("Password is required")
    ],
    login
);

// Get profile
router.get("/me", authMiddleware, getProfile);

module.exports = router;