require("dotenv").config();
const http = require('http');
const express = require('express');
const cors = require('cors');
let count = 0;

const router = require('./router');

const app = express();
app.use(cors()).use(express.json()).use(express.urlencoded({ extended: true }));

app.use("/", router);
const server = http.createServer(app);

const io = require("socket.io")(server, {
    cors: {
        origin: "*"
    }
});

io.on('connect', async (socket) => {
    socket.on('join', async ({ }, callback) => {
        count = count + 1;
        socket.join("default");
        io.to("default").emit('countUpdate', count);
    });

    socket.on('disconnect', () => {
        count--;
        io.to("default").emit('countUpdate', count);
    })
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));