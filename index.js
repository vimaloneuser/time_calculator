require("dotenv").config();
const http = require('http');
const express = require('express');
const cors = require('cors');

const router = require('./router');


const app = express();
app.use(cors()).use(express.json()).use(express.urlencoded({ extended: true }));

app.use("/", router);
const server = http.createServer(app);

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));