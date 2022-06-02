var Proxy = require('http-mitm-proxy');
const axios = require('axios').default;

var proxy = Proxy();
var fs = require('fs');
var url = require('url');
var Queue = require('bull')
var net = require('net')
var path = require('path');

const stepn = require('./api_requests')
const adb = require('./nox_adb');
const { moveUnlockedJobsToWait } = require('bull/lib/scripts');

var stepn_apis = [];
const account_path = 'C:/Users/phonnn/Desktop/stepn-sniffer/accounts.json'

const noxQueue = new Queue('ProcessNox');
const keyQueue = new Queue('ProcessStepn');

noxQueue.empty();
keyQueue.empty();
noxQueue.clean(0, 'completed');
keyQueue.clean(0, 'completed');
axios.defaults.timeout = 7000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

var inQueue = {};

//queue setup
var thread = 2;
keyQueue.process(thread, async (job, done) => {
	const data = job.data;
	var index = undefined;

	//choose free STEPN object
	var stepn_api = stepn_apis.find(obj => {
		if(!obj.running || obj.email == data.email){
			obj.running = true;
			return obj
		}		
	});

	if(stepn_api != undefined){
		try {
			index = stepn_apis.indexOf(stepn_api);
			
			//init accounts
			stepn_api._init(data.email, data.private);
			console.log(`Thread: ${index} -- ${stepn_api.email} -- Init`)
	
			//login
			if(stepn_api.account_data.cookie != undefined && stepn_api.account_data.cookie != ''){
				let res = await stepn_api.userbasic();
				if(res.code == 0){
					stepn_api.isLogin = true;
				}
			} 
	
			stepn_api.firstTime = false;
	
			if(!stepn_api.isLogin){
				if(inQueue[data.email] == undefined){
					inQueue[data.email] = 1;
					console.log(`Thread: ${index} -- ${stepn_api.email} -- Add Nox`);
	
					await noxQueue.add({email: data.email, password: data.password, thread: index}, {
						removeOnComplete: true
					});
				}
	
				await sleep(20000);
			}
	
			if(!stepn_api.isLogin){
				throw new Error('Login failed');
			}
	
			//do some actions here
			// let res = await stepn_api.withdrawNFTs();
			// console.log(`Thread: ${index} -- ${stepn_api.email} -- Action --`, res)
			// if(res.code == 102001){
			// 	throw 'Cookie expried';
			// }
			console.log(`Thread: ${index} -- ${stepn_api.email} -- Action -- OKKKK`)
			stepn_api.running = false;
			done();
		} catch (error) {
			console.log(`Thread: ${index} -- ${stepn_api.email} -- Error -- ${error}`)
			done(error);
		}
	} else {
		done();
		console.log('Add new', data);
		await keyQueue.add(data, {
			removeOnComplete: true,
			attempts: 5, // If job fails it will retry till 5 times
			backoff: 10000 // static 10 sec delay between retry
		});
	}
});

keyQueue.on('completed', function (job, result) {
	let data = job.data
	var stepn_api = stepn_apis.find(obj => obj.email == data.email);

	if(stepn_api != undefined){
		stepn_api.running = false;
	}
})

noxQueue.process(1, async (job, done) => {
	const data = job.data;
	try {
		if(stepn_apis[data.thread].email == data.email && !stepn_apis[data.thread].isLogin){
			await adb.noxLogin(data.email, data.password);
			inQueue[data.email] = undefined;
		}
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
//
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
	
	var accounts = JSON.parse(fs.readFileSync(account_path, 'utf-8'));

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
