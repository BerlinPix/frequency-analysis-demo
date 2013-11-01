var express = require('express');
var server = express();
server.configure(function(){
  server.use(express.static(__dirname + '/public'));
});

var port = 3000;
server.listen(port);
console.log('server listen to port: ' + port);