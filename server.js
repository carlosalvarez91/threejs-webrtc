/*
 *
 * This uses code from a THREE.js Multiplayer boilerplate made by Or Fleisher:
 * https://github.com/juniorxsound/THREE.Multiplayer
 * And a WEBRTC chat app made by Mikołaj Wargowski:
 * https://github.com/Miczeq22/simple-chat-app
 *
 * Aidan Nelson, April 2020
 *
 *
 */

// express will run our server
const express = require("express");
const app = express();
app.use(express.static("public"));

// HTTP will expose our server to the web
const http = require("http").createServer(app);

// decide on which port we will use
const port = process.env.PORT || 8080;

//Server
const server = app.listen(port);
console.log("Server is running on http://localhost:" + port);

/////SOCKET.IO///////
const io = require("socket.io")().listen(server);

// an object where we will store innformation about active clients
let peers = {};

setupSocketServer();

function setupSocketServer() {
  // Set up each socket connection
  io.on("connection", (socket) => {
    console.log(
      "Peer joined with ID",
      socket.id,
      ". There are " +
      io.engine.clientsCount +
      " peer(s) connected."
    );

    socket.on("addUsername" , (data, callback)=>{
      const username = data['userName']
      const isStudent = data['isStudent']
      //Add a new client indexed by their socket id
      peers[socket.id] = {
        username,
        position: [0, 0.5, 0],
        rotation: [0, 0, 0, 1], // stored as XYZW values of Quaternion
        isStudent,
        handRaised:false,
        disableMove:false
      };

      newUser()
      onMove()
      onRaiseHand()
      receiveReaction()
      emitPositons()
      onSignal()
      onDisconnect()
      onDrawPath()
      onFocus()
      callback(peers);
    })

    function onRaiseHand(){
      socket.on("onRaiseHand" , (id)=>{
          try{
            peers[id].handRaised = true
            io.emit("onHandRaised", id);
          }catch(err){
            console.error(err)
          }
      })
    }

    function receiveReaction(){
      socket.on("receiveReaction" , (data)=>{
        const {id, reaction} = data;
        io.emit("spreadReaction", {id, reaction});
      })
    }

    function newUser(){
      io.emit(
        "newUser",
        {socketId: socket.id, username: peers[socket.id].username}
      );
    }
    function onMove(){
      // whenever the client moves, update their movements in the clients object
      socket.on("move", (data) => {
        //console.log("==> "+socket.id+" : "+peers[socket.id].disableMove)
        if (peers[socket.id] && !peers[socket.id].disableMove) {
          peers[socket.id].position = data[0];
          peers[socket.id].rotation = data[1];
        }
      });
    }

    function emitPositons() {
      setInterval(function () {
        // update all clients of positions
        io.sockets.emit("positions", peers);
      }, 10);
    }

    function onSignal(){
    // Relay simple-peer signals back and forth
    socket.on("signal", (to, from, data) => {
      if (to in peers) {
        io.to(to).emit("signal", to, from, data);
      } else {
        console.log("Peer not found!");
      }
    });
    }

    function onDisconnect(){
    //Handle the disconnection
    socket.on("disconnect", () => {
      //Delete this client from the object
      delete peers[socket.id];
      io.sockets.emit(
        "userDisconnected",
        io.engine.clientsCount,
        socket.id,
        Object.keys(peers)
      );
      console.log(
        "User " +
        socket.id +
        " diconnected, there are " +
        io.engine.clientsCount +
        " clients connected"
      );
    });
    }

    function onDrawPath(){
    //Handle the drawing of paths
    socket.on("drawPath", (data) => {
      io.sockets.emit("peerDrawPath", data);
    });
    }

    function onFocus(){
      // Handle the focus mode event
      socket.on("focusMode", () => {
        io.sockets.emit("focused");
      });
    }
  });
}
