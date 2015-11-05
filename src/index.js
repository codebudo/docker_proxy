var http      = require('http');
var express   = require('express');
var url       = require('url');
var proxy     = require('proxy-middleware');
var exec      = require('child_process').exec
var log       = require('./logger');
var conf      = require('./config');

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

//http.createServer(app).listen(conf.httpPort);
app.listen( conf.httpPort, function() {
  log.info('The http server is running on ' + conf.httpPort);
});

// Get info from about running containers
function parseCmd(err, stdout, stderr){
  log.warn(stdout);
  if( !err && !stderr ){
    var lines = stdout.split('\n');
  } else {
    log.error( err, stderr);
  }

  lines.map(function(input){
    if( input.length < 1 )
      return;

    var tmp = input.split(',');
    var name = tmp[0];

    tmp = tmp[1].split(':');
    var address = tmp[0];
    
    tmp = tmp[1].split('-');
    var port = tmp[0];

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
}

function getRoutingTable(){
  log.debug('Updating routing table');
  // escaping the escape sequences looks dumb but necessary
  exec('docker ps --no-trunc | tail -n+2 | awk -F \'\\\\s{2,}\' \'{print $7 "," $6}\'', parseCmd);
 
}

getRoutingTable();
setInterval(getRoutingTable, conf.updateInterval); // update routing table every 10 seconds

