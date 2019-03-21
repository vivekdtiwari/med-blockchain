const MChain = require('./mchain');
const WebSocket = require('ws');

function MNode(port) {
  let mSockets = [];
  let mServer;
  let _port = port;
  let chain = new MChain();

  const REQUEST_CHAIN = "REQUEST_CHAIN";
  const REQUEST_BLOCK = "REQUEST_BLOCK";
  const BLOCK = "BLOCK";
  const CHAIN = "CHAIN";

  const init = () => {
    chain.init();

    mServer = new WebSocket.Server({port: _port});

    mServer.on('connection', (connection) => {
      console.log('connection in');
      initConnection(connection);
    });

    mServer.on('error', (msg) => {
      console.log("handling shit", msg);
    });
  }

  const messageHandler = (connection) => {
    connection.on('message', (data) => {
      const msg = JSON.parse(data);
      switch (msg.event) {
        case REQUEST_CHAIN:
          connection.send(JSON.stringify({event: CHAIN, message: chain.getChain() }))
          break;
        case REQUEST_BLOCK:
          requestLatestBlock(connection);
          break;
        case BLOCK:
          processRecievedBlock(msg.message);
          break;
        case CHAIN:
          processRecievedChain(msg.message);
          break;
        default:
          console.log("unknown message");

      }
    })
  }

  const processRecievedChain = (blocks) => {
    let newChain = blocks.sort((block1,block2) => (block1.index - block2.index));

    if(newChain.length > chain.getTotalBlocks() && chain.checkNewChainIsValid()) {
      chain.replaceChain(newChain);
      console.log('chain replaced');
    }
  }

  const processRecievedBlock = (blocks) => {
    let currentTopBlock = chain.getLatestBlock();

    if(block.index <= currentTopBlock.index) {
      console.log('no update needed');
      return;
    }

    //Is claiming to be the next in chain
    if(block.previousHash == currentTopBlock.hash) {
      //Attempt to add at top of our chain
      chain.addToChain(block);

      console.log('New Block added');
      console.log(chain.getLatestBlock());
    } else {
      //The block is ahead. We are few blocks behind, so request the whole chain
      console.log('requesting chain');
      broadcastMessage(REQUEST_CHAIN,"");
    }
  }

  const requestLatestBlock = (connection) => {
    connection.send(JSON.stringify({event: BLOCK, message: chain.getLatestBlock()}))
  }

  const broadcastMessage = (event, message) => {
    mSockets.forEach(node => node.send(JSON.stringify({event, message})));
  }

  const closeConnection = (connection) => {
    console.log('closing connection');
    mSockets.splice(mSockets.indexOf(connection),1);
  }

  const initConnection = (connection) => {
    console.log('init connection');

    messageHandler(connection);

    requestLatestBlock(connection);

    mSockets.push(connection);

    connection.on('error', () => closeConnection(connection));
    connection.on('close', () => closeConnection(connection));
  }

  const createBlock = (teammember) => {
    let newBlock = chain.createBlock(teammember);
    chain.addToChain(newBlock);
    broadcastMessage(BLOCK, newBlock);
  }

  const getStats = () => {
    return {
      blocks: chain.getTotalBlocks()
    }
  }

  const addPeer = (host,port) => {
    console.log("info",host,port);
    let connection = new WebSocket(`ws://${host}:${port}`);

    connection.on('error', (error) => {
      console.log(error);
    });

    connection.on('open', (msg) => {
      initConnection(msg);
    });
  }

  return {
    init,
    broadcastMessage,
    addPeer,
    createBlock,
    getStats
  }
}

module.exports = MNode;
