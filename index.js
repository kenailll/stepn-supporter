var Proxy = require('http-mitm-proxy');
const axios = require('axios').default;

var proxy = Proxy();
var fs = require('fs');
var url = require('url');
var Queue = require('bull')
var net = require('net')

const stepn = require('./api_requests')
const adb = require('./nox_adb')

var stepn_apis = [];

const noxQueue = new Queue('ProcessNox');
const keyQueue = new Queue('ProcessStepn');

noxQueue.empty();
keyQueue.empty();

axios.defaults.timeout = 7000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

//queue setup
var thread = 2;
keyQueue.process(thread, async (job, done) => {
	const data = job.data;
	var stepn_api = undefined;

	try {
		//choose free STEPN object
		stepn_api = stepn_apis.find(obj => {
			if(!obj.running){
				obj.running = true;
				return obj
			}		
		});

		//init accounts
		stepn_api._init(data.email, data.private);
		console.log(`${stepn_api.email} -- Init -- Thread: ${stepn_apis.indexOf(stepn_api)}`)

		//login
		if(stepn_api.account_data.cookie != undefined && stepn_api.account_data.cookie != ''){
			let res = await stepn_api.userbasic();
			if(res.code == 0){
				stepn_api.isLogin = true;
			}
		} 

		stepn_api.firstTime = false;

		if(!stepn_api.isLogin){
			console.log('Add Nox', data.email);
			await noxQueue.add({email: data.email, password: data.password}, {
				removeOnComplete: true,
				attempts: 1
			});

			await sleep(10000);
		}
		
		if(!stepn_api.isLogin){
			throw 'Login failed';
		}

		//do some actions here
		let res = await stepn_api.withdrawNFTs();
		console.log(`${stepn_api.email} -- Action --`, res)

		if(res.code == 102001){
			throw 'Cookie expried';
		}
		
		done();
	} catch (error) {
		console.log(`${stepn_api.email} -- Error -- ${error}`)
		done(error);
	}

	if(stepn_api != undefined){
		stepn_api.running = false;
	}
});

noxQueue.process(1, async (job, done) => {
	const data = job.data;
	try {
		await adb.noxLogin(data.email, data.password);
		done()
	} catch (error) {
		done(error);
	}
});

const configProxy = {
	headers: {'Cache-Control': 'max-age=9999'},
	proxy: {
		host: "127.0.0.1",
		port: 1000
	},
	timeout: 1000 * 5
};

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
	var accounts = JSON.parse(fs.readFileSync(`accounts.json`, 'utf-8'));

	for(let i=0; i<thread; i++){
		let api = new stepn.STEPN();
		stepn_apis.push(api);
	}

	//proxy config
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
			for(let i=0; i<thread; i++){
				stepn_apis[i].version1 = ctx.clientToProxyRequest.headers["version1"];
			}
		}

		//stepn-api test
		//////////////////////////////////////////////////
		if(ctx.clientToProxyRequest.url.includes('login')){
			loginUrl = ctx.clientToProxyRequest.url;

			let pattern = /&account=(.+)&password/;
			let account = loginUrl.match(pattern)[1].toString().replace('%40', '@');

			for(let i=0; i<thread; i++){
				if(!stepn_apis[i].isLogin && !stepn_apis[i].firstTime && stepn_apis[i].email == account){
					(async ()=>{
						await stepn_apis[i].login(loginUrl);
					})();

					break;
				}
			}

			ctx.proxyToClientResponse.end("Block")
			return;
		}
		/////////////////////////////////////////////////////
		return;
		//return callback();
	});

	start()

	for(let account of accounts){
		console.log('Add', account)
		await keyQueue.add(account, {
			removeOnComplete: true,
			attempts: 5, // If job fails it will retry till 5 times
			backoff: 10000 // static 10 sec delay between retry
		});
		await sleep(3000);
	}
})()
