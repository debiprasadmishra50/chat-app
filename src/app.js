const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const Filter = require("bad-words");

const {
    generateMessage,
    generateLocationMessage,
} = require("./utils/messages");

const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
    res.sendFile("index");
});

io.on("connection", (socket) => {
    console.log("[+] New Socket Connection");

    // socket.emit("message", generateMessage("Welcome Client"));
    // socket.broadcast.emit(
    //     "message",
    //     generateMessage("New User has joined the chatroom")
    // ); // emit event to everybody except the current client

    socket.on("join", ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room });

        if (error) {
            return callback(error);
        }

        socket.join(user.room);

        socket.emit("message", generateMessage("Admin", `Welcome ${username}`));
        // prettier-ignore
        socket.broadcast.to(room).emit("message",generateMessage("Admin",`${username} has joined!`)); // emit event to everybody except the current client in a room
        io.to(user.room).emit("roomData", {
            room: user.room,
            users: getUsersInRoom(user.room),
        });

        callback();
    });

    socket.on("sendMessage", (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter(); // filter bad words
        if (filter.isProfane(message)) {
            return callback("profanity is not allowed!");
        }

        io.to(user.room).emit(
            "message",
            generateMessage(user.username, message)
        );
        callback(); // acknowledgement from server, callback passed from client
    });

    socket.on("sendLocation", ({ lat, lng }, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit(
            "locationMessage",
            generateLocationMessage(
                user.username,
                `https://google.com/maps?q=${lat},${lng}`
            )
        );
        callback();
    });

    socket.on("disconnect", () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit(
                "message",
                generateMessage("Admin", `${user.username} has left!`)
            );

            io.to(user.room).emit("roomData", {
                room: user.room.toUpperCase(),
                users: getUsersInRoom(user.room),
            });
        }
    });
});

const port = process.env.PORT || 8000;
server.listen(port, () => {
    console.log("[+] Server started on port " + port);
});
