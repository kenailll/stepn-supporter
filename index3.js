var Proxy = require('http-mitm-proxy');
var HttpsProxyAgent = require('https-proxy-agent');
const axios = require('axios').default;
const TelegramBot = require('node-telegram-bot-api');
const token = '5370533077:AAFOcgVChp7gi_4Wp4tnat257xXj-1WPBWk';
const botName = 'mStepNBSCBot';
const util = require('util');
var proxy = Proxy();
var path = require('path');
var url = require('url');
var fs = require('fs');
var Queue = require('bull')
var net = require('net')
const stepn_api = require('./api_requests')
const keyQueue = new Queue('ProcessKeyStepn');
keyQueue.empty();


var {
    URLSearchParams
} = require('url');
axios.defaults.timeout = 7000;
const configProxy = {
	headers: {'Cache-Control': 'max-age=9999'},
	proxy: {
		host: "127.0.0.1",
		port: 1000
	},
	timeout: 1000 * 5
};
let firstToken = false;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

var chunks = [];
const _host = "127.0.0.1"
const _port = 10002
const _cproxy = { host: _host, port: _port };
const _agent = new HttpsProxyAgent("http://127.0.0.1:10001");
const _lagent = [new HttpsProxyAgent("http://127.0.0.1:10001"), new HttpsProxyAgent("http://127.0.0.1:10002")];
proxy.use(Proxy.wildcard);

proxy.onError(function(ctx, err) {
    //console.error('proxy error:', err);
});
let ai = 0;
let lastVersion1 = null;

proxy.onConnect(function (req, socket, head, callback) {
  const serverUrl = url.parse(`https://${req.url}`);
  //console.log("onConnect", serverUrl);
  //return callback();
  if (serverUrl.host == '104.18.11.119:443' || serverUrl.host == '104.18.10.119:443') {
	return callback();
  } else {
	const srvSocket = net.connect(serverUrl.port, serverUrl.hostname, () => {
	  socket.write('HTTP/1.1 200 Connection Established\r\n' + 'Proxy-agent: Node-Proxy\r\n' + '\r\n');
	  srvSocket.pipe(socket);
	  socket.pipe(srvSocket);
	});
	srvSocket.on('error', () => {});

	socket.on('error', () => {});
  }
});
proxy.onRequest(function(ctx, callback) {
    {
        ctx.use(Proxy.gunzip);

		if(ctx.clientToProxyRequest.headers["version1"] !=undefined){
			lastVersion1 = ctx.clientToProxyRequest.headers["version1"];
		}
        var pback = ctx.clientToProxyRequest.url;

		//stepn-api test
		//////////////////////////////////////////////////
		if(ctx.clientToProxyRequest.url.includes('login')){
			loginUrl = 'https://' + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url;
			stepn_api.login(loginUrl, 'UK2SRYP6X2ZFAO7Z', ctx.clientToProxyRequest.headers, function (account, private, headers){
				stepn_api.withdrawNFTs(account, private, headers)
			})

			// stepn_api.login(loginUrl, 'UK2SRYP6X2ZFAO7Z', ctx.clientToProxyRequest.headers, function (account, private, headers){
			// 	stepn_api.withdraw(private, headers)
			// })
		}
        /////////////////////////////////////////////////////
		var params = new URLSearchParams(url.parse(pback).query);
        params.sort();
        console.log(url.parse(pback).pathname);

        ctx.onResponseData(function(ctx, chunk, callback) {
            chunks.push(chunk);
            return callback(null, chunk);
        });
    }

    ctx.onResponseEnd(function(ctx, callback) {
		//console.log(ctx.clientToProxyRequest.url);
		if(ctx.clientToProxyRequest.url.indexOf("orderlist")>0){
			listShoes((Buffer.concat(chunks)).toString(), "X-CTX");
		}

        chunks = [];
        return callback();
    });
    return callback();
});

//////////////////////////////////
let matchProfile = [];
const sendCharles = async () => {
	console.log("**** start Charles");
	while(1){
		
		try{
			await sleep(1000);
			resp = await axios.get("http://control.charles/session/export-json", configProxy);
			list = JSON.parse(JSON.stringify(resp.data));
			if (list.length == 0){
				await sleep(3000)
				continue;
			}
			let tmp_cookies = []
			list.forEach(async function(element) 
			{ 
				try{
					if(element.request.header.headers[0].name != "user-agent" && (element.host == 'apilb.stepn.com'|| element.host == 'api.stepn.com')){
						var temp_headers = {}

						for(var i = 0; i<element.request.header.headers.length; i++){
							temp_headers[element.request.header.headers[i].name] = element.request.header.headers[i].value;
						}
						tmp_cookies.push(temp_headers);
					}
				}catch{}
				
				
			});

			// await axios.get("http://control.charles/session/clear", configProxy);
		}catch(e){console.log("sendCharles err", e)}
	}
}

const listShoes = async (_content, typeC) => {
	try{
		var list = JSON.parse(_content);
		if(list.code == 0 && list.data.length > 0){
			console.log(typeC,list.data[0].id, list.data.length);
			for(var i = 0; i <list.data.length; i++){
				const bId = list.data[i];
				if(!listf.includes(bId.id)){
					listf.push(bId.id);
					const price = bId.sellPrice/1000000;
					checkShoes(bId, price, 2);
				}
			}
		}
	}catch(e){
		//console.log(e.message);
	}
};


const start = async () => {
	proxy.listen({
		port: 8082
	});
	sendCharles();

};

start()