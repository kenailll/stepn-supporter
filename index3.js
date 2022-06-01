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

const stepn = require('./api_requests')
const adb = require('./nox_adb')

const keyQueue = new Queue('ProcessKeyStepn');
keyQueue.empty();


axios.defaults.timeout = 7000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

var stepn_api = new stepn.STEPN();

const configProxy = {
	headers: {'Cache-Control': 'max-age=9999'},
	proxy: {
		host: "127.0.0.1",
		port: 1000
	},
	timeout: 1000 * 5
};

proxy.use(Proxy.wildcard);

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
	ctx.use(Proxy.gunzip);

	if(ctx.clientToProxyRequest.headers["version1"] != undefined){
		stepn_api.version1 = ctx.clientToProxyRequest.headers["version1"];
		console.log('new version', stepn_api.version1);
	}

	//stepn-api test
	//////////////////////////////////////////////////
	if(ctx.clientToProxyRequest.url.includes('login')){
		loginUrl = ctx.clientToProxyRequest.url;
		
		if(!stepn_api.isLogin && !stepn_api.firstTime){
			(async ()=>{
				await stepn_api.login(loginUrl);
			})()
		}
		ctx.proxyToClientResponse.end("Block")
		return;
	}
	/////////////////////////////////////////////////////
	return;
    //return callback();
});

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
		}catch(e){console.log("sendCharles err", e)}
	}
	await sleep(500)
}

const start = async () => {
	proxy.listen({
		port: 8082
	});
	sendCharles();
};


(async()=>{
	start()
	var account = {
		email: 'hungphong@cenog.info',
		password: '123123',
		private: 'UK2SRYP6X2ZFAO7Z'
	}

	//init accounts
	stepn_api._init(account.email, account.private);

	//login
	if(stepn_api.account_data.cookie != undefined && stepn_api.account_data.cookie != ''){
		console.log('old cookie', stepn_api.account_data.cookie)
		let res = await stepn_api.userbasic();
		if(res.code == 0){
			stepn_api.isLogin = true;
		}
	} 

	stepn_api.firstTime = false;

	while(!stepn_api.isLogin){
		await adb.noxLogin(account.email, account.password);
		await sleep(5000);
		console.log('new cookie', stepn_api.account_data.cookie)
	}

	//do some actions here
	await stepn_api.withdrawNFTs();
})()
