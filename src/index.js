var http      = require('http');
var express   = require('express');
var url       = require('url');
var proxy     = require('proxy-middleware');
var exec      = require('child_process').exec
var log       = require('./logger');
var conf      = require('./config');
var Docker    = require('dockerode');

var docker       = new Docker();
var routingTable = {};

var app = express();
app.use(log.express);

app.get('/status', function(req, res, next){
  res.json(routingTable); 
});

app.all('*', function(req, res, next){
  var destination = req.hostname.split('.')[0];
  if( routingTable[destination] ){
    var proxyOptions = url.parse('http://localhost/');
    proxyOptions.preserveHost = false;
    proxyOptions.cookieRewrite = true;
    proxyOptions.via  = true;
    
    proxyOptions.hostname = routingTable[destination].address;
    proxyOptions.port = routingTable[destination].port;

    proxy(proxyOptions)(req, res, next);
    // nothing will run after this line
  } else {
    res.status(404).send('not found');
  }
});

app.on('error', function(exc){
  log.error(exc);
});
app.on('uncaughtException', function(exc){
  log.error(exc);
});

app.listen( conf.httpPort, function() {
  log.info('The http server is running on ' + conf.httpPort);
});

function getRoutingTable(){
  docker.listContainers(function (err, containers) {
    containers.forEach(function (containerInfo) {
      var name = containerInfo.Names[0].substring(1);
      var address = containerInfo.Ports[0].IP;
      var port = containerInfo.Ports[0].PublicPort;
      
      if( typeof routingTable[name] === 'undefined' ){
        log.info('Adding new route:', name);
      } else if( routingTable[name].address !== address ||
          routingTable[name].port !== port ){
        log.info('Updating route:', name);
      }

      routingTable[name] = {
        name: name, 
        address: address,
        port: port
      };
    });
  });
}

getRoutingTable();
setInterval(getRoutingTable, conf.updateInterval); // update routing table every 10 seconds

