const socket = io();

const form = document.querySelector("#message-form");
const msgBox = document.querySelector("#message"); // OR
const sendMessage = document.querySelector("#send-message");
const sendLocation = document.querySelector("#send-location");
const messages = document.querySelector("#messages");

// Templates
let msgTemplate = document.querySelector("#message-template");
let locationTemplate = document.querySelector("#location-template");
let sidebarTemplate = document.querySelector("#sidebar-template");

if (msgTemplate && locationTemplate && sidebarTemplate) {
    msgTemplate = msgTemplate.innerHTML;
    locationTemplate = locationTemplate.innerHTML;
    sidebarTemplate = sidebarTemplate.innerHTML;
}

// Options from query string
const { username, room } = Qs.parse(location.search, {
    ignoreQueryPrefix: true,
});

const autoScroll = () => {
    // new message element
    const newmsg = messages.lastElementChild;

    // Height of last message
    const newmsgStyles = getComputedStyle(newmsg);
    const newmsgMargin = parseInt(newmsgStyles.marginBottom);
    const newmsgHeight = newmsg.offsetHeight + newmsgMargin;

    const visibleHeight = messages.offsetHeight;

    // height of message container
    const containerHeight = messages.scrollHeight;

    //how far it is scrolled
    const scrollOffset = messages.scrollTop + visibleHeight;

    if (containerHeight - newmsgHeight <= scrollOffset) {
        messages.scrollTop = messages.scrollHeight;
    }
};

socket.on("message", (message) => {
    console.log(message);
    if (msgBox && msgTemplate) {
        msgBox.focus();

        const html = Mustache.render(msgTemplate, {
            username: message.username,
            message: message.text,
            createdAt: moment(message.createdAt).format("h:mm a"),
        });

        messages.insertAdjacentHTML("beforeend", html);
        autoScroll();
    }
});

socket.on("locationMessage", (message) => {
    console.log(message);
    if (msgBox && locationTemplate) {
        const html = Mustache.render(locationTemplate, {
            username: message.username,
            url: message.url,
            createdAt: moment(message.createdAt).format("h:mm a"),
        });
        msgBox.focus();

        messages.insertAdjacentHTML("beforeend", html);
        autoScroll();
    }
});

socket.on("roomData", ({ room, users }) => {
    if (sidebarTemplate) {
        const html = Mustache.render(sidebarTemplate, { room, users });

        document.querySelector("#sidebar").innerHTML = html;
    }
});

if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (!msgBox.value) return;

        // disable form after hitting Enter
        sendMessage.setAttribute("disabled", "disabled");
        // const message = e.target.elements.message; // OR

        // callback is acknowledgement to server and client
        socket.emit("sendMessage", msgBox.value, (error) => {
            // enable form
            sendMessage.removeAttribute("disabled");
            msgBox.value = "";
            msgBox.focus();

            if (error) {
                alert(error);
                return console.log(error);
            }

            console.log("Message delivered");
        });
    });
}

if (sendLocation) {
    sendLocation.addEventListener("click", (e) => {
        if (!navigator.geolocation) return alert("Geolocation not supported");

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                sendLocation.setAttribute("disabled", "disabled");

                const { latitude: lat, longitude: lng } = coords;

                socket.emit("sendLocation", { lat, lng }, () => {
                    console.log("Location Shared.");
                    sendLocation.removeAttribute("disabled");
                });
            },
            (err) => {
                console.log(err.message);
            },
            { enableHighAccuracy: true }
        );
    });
}

// emit join event when someone joins and pass the data to server
socket.emit("join", { username, room }, (error) => {
    if (error) {
        alert(error);
        location.assign("/");
    }
});
