var Proxy = require('http-mitm-proxy');
const axios = require('axios').default;
const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');
var proxy = Proxy();
var fs = require('fs');
var url = require('url');
var Queue = require('bull');
var net = require('net');

require('dotenv').config();

const stepn = require('./api_requests');
const adb = require('./nox_adb');
const utils = require('./utils');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

var stepn_apis = [];

const sheetQueue = new Queue('ProcessSheet');
const noxQueue = new Queue('ProcessNox');
const keyQueue = new Queue('ProcessStepn');

sheetQueue.empty();
noxQueue.empty();
keyQueue.empty();
sheetQueue.clean(0, 'completed');
noxQueue.clean(0, 'completed');
keyQueue.clean(0, 'completed');

axios.defaults.timeout = 7000;
var date_now = utils.today();
var inQueue = {};
var rows = [];

//queue setup
var thread = 2;
keyQueue.process(thread, async (job, done) => {
	const data = job.data;
	var index = undefined;

	//choose free STEPN object
	var stepn_api = stepn_apis.find(obj => {
		if (obj.id == undefined) {
			obj.id = job.id;
			obj.running = true;
			return obj
		}

		if (obj.email == data.email && !obj.running) {
			obj.running = true;
			return obj
		}
	});

	if (stepn_api != undefined) {
		try {
			index = stepn_apis.indexOf(stepn_api);

			//init accounts
			stepn_api._init(data.email, data.private, data.cookie);
			console.log(`Thread: ${index} -- ${stepn_api.email} -- ID: ${stepn_api.id} -- Init`)

			//login
			if (stepn_api.account_data.cookie != undefined && stepn_api.account_data.cookie != '') {
				let res = await stepn_api.userbasic();
				if (res.code == 0) {
					stepn_api.isLogin = true;
				} else {
					console.log(`Thread: ${index} -- ${stepn_api.email} -- Cookie expried`)
				}
			}

			stepn_api.firstTime = false;

			if (!stepn_api.isLogin) {
				if (inQueue[data.email] == undefined) {
					inQueue[data.email] = 1;
					console.log(`Thread: ${index} -- ${stepn_api.email} -- Add Nox`);

					await noxQueue.add({ email: data.email, password: data.password, thread: index }, {
						removeOnComplete: true
					});
				}

				await utils.sleep(20000);
			}

			if (!stepn_api.isLogin) {
				throw new Error('Login failed');
			}

			//do some actions here
			//GST withdraw chain 103
			// let GST_res = await stepn_api.withdraw();
			// console.log(`Thread: ${index} -- ${stepn_api.email} -- Action --`, GST_res)

			// if (GST_res.code == 102001) {
			// 	throw 'Cookie expried';
			// }

			//NFT withdraw
			// let NFT_res = await stepn_api.withdrawNFTs();
			// console.log(`Thread: ${index} -- ${stepn_api.email} -- Action --`, NFT_res)

			// if(NFT_res.code == 102001){
			// 	throw 'Cookie expried';
			// }

			console.log(`Thread: ${index} -- ${stepn_api.email} -- Action -- OKKKK`)

			let sheet_data = {
				email: stepn_api.email,
				sol_address: stepn_api.account_data.userbasic.addrs.find(obj => obj.chain == 103).addr,
				bsc_address: stepn_api.account_data.userbasic.addrs.find(obj => obj.chain == 104).addr,
				gst_sol: stepn_api.account_data.userbasic.asset.find(obj => obj.chain == 103 && obj.token == 3000).value,
				gst_bsc: stepn_api.account_data.userbasic.asset.find(obj => obj.chain == 104 && obj.token == 3000).value,
				energy: stepn_api.account_data.userbasic.energy,
				maxEnergy: stepn_api.account_data.userbasic.maxE,
				withdraw: stepn_api.GST_withdraw
			}

			await sheetQueue.add(sheet_data, {
				removeOnComplete: true,
				attempts: 3, // If job fails it will retry till 3 times
				backoff: 10000 // static 10 sec delay between retry
			});

			stepn_api.id = undefined;
			stepn_api.running = false;
			done();
		} catch (error) {
			console.log(`Thread: ${index} -- ${stepn_api.email} -- Error -- ${error}`)
			done(error);
		}
	} else {
		done();
		await keyQueue.add(data, {
			removeOnComplete: true,
			attempts: 5, // If job fails it will retry till 5 times
			backoff: 10000 // static 10 sec delay between retry
		});
	}
});

keyQueue.on('global:failed', function (job_id) {
	var stepn_api = stepn_apis.find(obj => obj.id == job_id);
	if (stepn_api != undefined) {
		stepn_api.id = undefined;
		stepn_api.running = false;
		stepn_api.email = '';
		stepn_api.GST_withdraw = 0;
	}
})

keyQueue.on('failed', function (job_id) {
	var stepn_api = stepn_apis.find(obj => obj.id == job_id);
	if (stepn_api != undefined) {
		stepn_api.running = false;
	}
})

keyQueue.on('completed', function (job, result) {
	var stepn_api = stepn_apis.find(obj => obj.id == job.id);

	if (stepn_api != undefined) {
		stepn_api.id = undefined;
		stepn_api.running = false;
		stepn_api.email = '';
		stepn_api.GST_withdraw = 0;
	}
})

noxQueue.process(1, async (job, done) => {
	const data = job.data;
	try {
		if (stepn_apis[data.thread].email == data.email && !stepn_apis[data.thread].isLogin) {
			await adb.noxLogin(data.email, data.password);
			inQueue[data.email] = undefined;
		}
		done()
	} catch (error) {
		done(error);
	}
});

sheetQueue.process(thread, async (job, done) => {
	const data = job.data;
	try {
		for (var i = 0; i < rows.length; i++) {
			if (data.email == rows[i].Username) {
				rows[i]['SOL Address'] = data.sol_address;
				rows[i]['BSC Address'] = data.bsc_address;
				rows[i].Energy = `${data.energy}/${data.maxEnergy}`;
				rows[i]['GST Balance 103'] = data.gst_sol;
				rows[i]['GST Balance 104'] = data.gst_bsc;
				rows[i][date_now] = data.withdraw;

				await rows[i].save();
				break;
			}
		}
		console.log();
		done();
	} catch (error) {
		console.log('Sheet operation error', error);
		console.log();
		done(error);
	}
});

////////////////////////////////////////////////


const configProxy = {
	headers: { 'Cache-Control': 'max-age=9999' },
	proxy: {
		host: "127.0.0.1",
		port: 1000
	},
	timeout: 1000 * 5
};

const sendCharles = async () => {
	console.log("**** start Charles");
	while (1) {
		try {
			await utils.sleep(1000);
			resp = await axios.get("http://control.charles/session/export-json", configProxy);
			list = JSON.parse(JSON.stringify(resp.data));
			if (list.length == 0) {
				await utils.sleep(3000)
				continue;
			}
			let tmp_cookies = []
			list.forEach(async function (element) {
				try {
					if (element.request.header.headers[0].name != "user-agent" && (element.host == 'apilb.stepn.com' || element.host == 'api.stepn.com')) {
						var temp_headers = {}

						for (var i = 0; i < element.request.header.headers.length; i++) {
							temp_headers[element.request.header.headers[i].name] = element.request.header.headers[i].value;
						}
						tmp_cookies.push(temp_headers);
					}
				} catch { }


			});
		} catch (e) { console.log("sendCharles err", e) }
	}
	await utils.sleep(500)
}

const start = async () => {
	proxy.listen({
		port: 8082
	});
	sendCharles();
};

(async () => {
	const doc = new GoogleSpreadsheet(config.spread_sheet);
	await doc.useServiceAccountAuth({
		client_email: config.spread_sheet_auth_email,
		private_key: config.spread_sheet_auth_key,
	});
	await doc.loadInfo();
	const sheet = doc.sheetsByIndex[2];

	//add new column
	rows = await sheet.getRows();
	var header_row = rows[0]._sheet.headerValues;

	if (header_row.at(-1) != date_now) {
		header_row.push(date_now)
		await sheet.setHeaderRow(header_row);
		rows = await sheet.getRows();
	}

	//get accounts from sheet
	var accounts = [];

	for (let i = 0; i < rows.length; i++) {
		if (rows[i][date_now] == undefined || rows[i][date_now] == 0) {
			accounts.push({
				email: rows[i].Username,
				password: rows[i].Password,
				private: rows[i]['2FA']
			});
		}
	}

	//create stepn API obj
	for (let i = 0; i < thread; i++) {
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
			srvSocket.on('error', () => { });

			socket.on('error', () => { });
		}
	});

	proxy.onRequest(function (ctx, callback) {
		ctx.use(Proxy.gunzip);

		if (ctx.clientToProxyRequest.headers["version1"] != undefined) {
			for (let i = 0; i < thread; i++) {
				stepn_apis[i].version1 = ctx.clientToProxyRequest.headers["version1"];
			}
		}

		//stepn-api test
		//////////////////////////////////////////////////
		if (ctx.clientToProxyRequest.url.includes('login')) {
			loginUrl = ctx.clientToProxyRequest.url;

			let pattern = /&account=(.+)&password/;
			let account = loginUrl.match(pattern)[1].toString().replace('%40', '@');

			for (let i = 0; i < thread; i++) {
				if (!stepn_apis[i].isLogin && !stepn_apis[i].firstTime && stepn_apis[i].email == account) {
					(async () => {
						var login = await stepn_apis[i].login(loginUrl);
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

	for (let account of accounts) {
		console.log('Add', account)
		await keyQueue.add(account, {
			removeOnComplete: true,
			attempts: 5, // If job fails it will retry till 5 times
			backoff: 10000 // static 10 sec delay between retry
		});
		await utils.sleep(3000);
	}
})()
