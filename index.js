const express = require('express');
const bodyParser = require('body-parser');
const MNode = require('./mnode');

const port = 18070+Math.floor(Math.random()*30);
console.log('starting node on ',port);
console.log(MNode);
let node1 = new MNode(port);

node1.init();

const http_port = 3000+Math.floor(Math.random()*30);

let MHTTP = function () {
  const app = new express();

  app.use(bodyParser.json());

  app.get('/addNode/:port', (req,res) => {
    console.log('add host: ', req.params.port);
    node1.addPeer('localhost',req.params.port);

    res.send();
  });

  app.get('/spawnM/:teammember', (req,res) => {
    let newBlock = node1.createBlock(req.params.teammember);
    console.log('block created');
    res.send();
  });

  app.listen(http_port, () => {
    console.log(`http server running on : ${http_port}`);
  });
}

let httpServer = new MHTTP();
