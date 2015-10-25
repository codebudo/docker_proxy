var winston        = require('winston');
var morgan         = require('morgan');



var logger = new winston.Logger({
  transports:[
    new winston.transports.Console({
      level: 'verbose',
      handleExceptions: false,
      colorize: true
    })
  ],
  colors:{

  }
});

logger.stream = {
  write: function(message, encoding){
    logger.info(message);
  }
};

logger.express = morgan('combined', { 'stream': logger.stream });

module.exports = logger;
