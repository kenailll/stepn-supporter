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

require("./config/")

const noxQueue = require("./queueService/noxQueue");
const keyQueue = require("./queueService/stepnQueue");
const sheetQueue = require("./queueService/sheetQueue");

sheetQueue.empty();
noxQueue.empty();
keyQueue.empty();

for (const status of ['active', 'completed', 'delayed', 'failed', 'wait']) {
	sheetQueue.clean(100, status);
	noxQueue.clean(100, status);
	keyQueue.clean(100, status);
}

var thread = 2;
////////////////////////////////////////////////

(async () => {
	const doc = new GoogleSpreadsheet(_config.spread_sheet);
	await doc.useServiceAccountAuth({
		client_email: _config.spread_sheet_auth_email,
		private_key: _config.spread_sheet_auth_key,
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
	proxy.listen({
		port: 8082
	});
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
		if (ctx.clientToProxyRequest.url.includes('appconfig')) {
			ctx.proxyToClientResponse.end("Block")
			return;
		}
		/////////////////////////////////////////////////////
		return;
		//return callback();
	});
	
	for (let account of accounts) {
		console.log('Add', account)
		await keyQueue.add(account, {
			removeOnComplete: true
		});
		await utils.sleep(3000);
	}
})()
