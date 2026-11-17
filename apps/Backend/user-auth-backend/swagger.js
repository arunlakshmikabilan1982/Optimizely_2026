const swaggerAutogen = require("swagger-autogen")();

const doc = {
    info: {
        title: "User Authentication API",
        description: "Authentication APIs",
        version: "1.0.0"
    },

    host: "localhost:5000",
    basePath: "/api/auth",
    schemes: ["http"],

    tags: [
        {
            name: "Authentication"
        }
    ]
};

const outputFile = "./swagger-output.json";

const endpointsFiles = [
    "./routes/authRoutes.js"
];

swaggerAutogen(outputFile, endpointsFiles, doc);