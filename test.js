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

const bot = new TelegramBot(token, {polling: true});
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
		ctx.proxyToServerRequestOptions.agent = _agent;
		ctx.proxyToServerRequestOptions.agent = _lagent[ai];
		ai = ai == 0 ? 1 : 0;
		if(ctx.clientToProxyRequest.headers["version1"] !=undefined){
			lastVersion1 = ctx.clientToProxyRequest.headers["version1"];
		}
        var pback = ctx.clientToProxyRequest.url;

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
			await getUniqueListBy(tmp_cookies, 'cookie').forEach(async function(element)
			{
				profileId = list_config.map(function(o) { return o.cookie }).indexOf(element.cookie);
				console.log("profileId STATUS:", profileId, element["cookie"]);
				if (profileId === -1){
					try{
						//console.log("sendGetUserId request");
						if(!matchProfile[listCookie[element["cookie"]]]){
							sendGetUserId({ headers: element, proxy: _cproxy}).then((result) => { //, proxy: _cproxy
								if (result){
									list_config[result] = { headers: element, proxy: _cproxy} //, proxy: _cproxy
									matchProfile[result] = true;
									console.log("sendGetUserId ok init", result);
								}
							})
						}else{
							//console.log(list_config);
							//console.log(listCookie[element["cookie"]]);
							list_config[listCookie[element["cookie"]]] = { headers: element, proxy: _cproxy} //
							//console.log("sendGetUserId ok bypass", list_config[_EVIP].headers["version1"]);
						}
					}catch{
						console.log("sendGetUserId error");
					}
				}
			});
			await axios.get("http://control.charles/session/clear", configProxy);
		}catch(e){console.log("sendCharles err", e)}
	}
}

let listCookie = []
const sendGetUserId = async (_config) => {
	try{
		_config["user-agent"] = "Dart/2.16 (dart:io)"
		resp = await axios.get("https://apilb.stepn.com/run/userbasic", _config);
		list = JSON.parse(JSON.stringify(resp.data));
		if(list.code == 0){
			listCookie[_config.headers["cookie"]] = list.data.email;
			listTokenShoes.cookie[list.data.email] = _config.headers["cookie"];
			fs.writeFileSync('_listTokenShoes.txt', JSON.stringify(listTokenShoes,null,2));
			return list.data.email
		}
	}catch(e){
		console.log("sendGetUserId sub error",e);
	}
	
	return false
}

const getBaglist = async (_sid) => {
	var global = list_config[_sid];
	if(global == undefined || listTokenShoes.cookie[_sid] == undefined) return;

	global.headers.cookie = listTokenShoes.cookie[_sid];
	global.headers.version1 = lastVersion1;
	console.log(global, listTokenShoes.cookie[_sid]);
	var resp02 = await axios.get("https://apilb.stepn.com/run/shoelist", global);
	var list02 = JSON.parse(JSON.stringify(resp02.data));
	return list02
}


function getUniqueListBy(arr, key) {
    return [...new Map(arr.map(item => [item[key], item])).values()]
}

let priceRac = 1;
let priceRacBSC = 1;
let priceBSCWalker = 1;
let priceBSCRunner = 1;
let priceBSCJogger = 1;
let priceBSCUncom0 = 1;
let intervalTelegram = 11;
const updateMint0 = async () => {
	console.log("start updateMint0");
	await sleep(3000)
	while(1){
		const mconfig = list_config[_EVIP_BSC];
		
		if(mconfig == undefined) {
			await sleep(500)
			continue
		}
		try{
			try{
				priceRac = await checkPrice("https://apilb.stepn.com/run/orderlist?order=2001&type=600&bread=1004&chain=103&refresh=true", mconfig);
				await sleep(Math.floor(Math.random() * (2000 - 1000) + 1000))
			}catch{}
			
			try{
				priceRacBSC = await checkPrice("https://apilb.stepn.com/run/orderlist?order=2001&type=600&quality=1&chain=104&refresh=true", mconfig);
				await sleep(Math.floor(Math.random() * (2000 - 1000) + 1000))
			}catch{}

			try{
				priceBSCWalker = await checkPrice("https://apilb.stepn.com/run/orderlist?order=2001&type=601&quality=1&bread=1001&chain=104&refresh=true", mconfig);
				await sleep(Math.floor(Math.random() * (2000 - 1000) + 1000))
			}catch{}
			
			try{
				priceBSCRunner = await checkPrice("https://apilb.stepn.com/run/orderlist?order=2001&type=603&quality=1&bread=1001&chain=104&refresh=true", mconfig);
				await sleep(Math.floor(Math.random() * (2000 - 1000) + 1000))
			}catch{}
			
			try{
				priceBSCJogger = await checkPrice("https://apilb.stepn.com/run/orderlist?order=2001&type=602&quality=1&bread=1001&chain=104&refresh=true", mconfig);
				await sleep(Math.floor(Math.random() * (2000 - 1000) + 1000))
			}catch{}
			try{
				priceBSCUncom0 = await checkPrice("https://apilb.stepn.com/run/orderlist?order=2001&type=601&quality=2&bread=1001&chain=104&refresh=true", mconfig);
				await sleep(Math.floor(Math.random() * (2000 - 1000) + 1000))
			}catch{}
			intervalTelegram++
			if(intervalTelegram>10){
				intervalTelegram = 0;
				bot.sendMessage('626894099', `#CHECK racSOL: ${priceRac}| racBSC: ${priceRacBSC} \n priceBSCWalker: ${priceBSCWalker}, priceBSCRunner: ${priceBSCRunner} \n priceBSCJogger: ${priceBSCJogger} priceBSCUncom0: ${priceBSCUncom0}`, {parse_mode: 'HTML'});
			}
			await sleep(Math.floor(Math.random() * (25000 - 10000) + 10000))
		}catch(err){
			console.log("updateMint0 err",err);
			await sleep(Math.floor(Math.random() * (25000 - 10000) + 10000))
		}
	}
};

const checkPrice = async (link, _config) => {
	var xconfig = _config;
	xconfig.headers.version1 = lastVersion1;
	var resp02 = await axios.get(link, xconfig);
	var list02 = JSON.parse(JSON.stringify(resp02.data));
	if(list02.code == 0){
		const bId = list02.data[0];
		return bId.sellPrice/1000000;
	}
};

const checkTypes = (dataId) => {
	if(dataId >= 100050 && dataId<=100072){
		return "SW"
	}
	if(dataId >= 100073 && dataId<=100096){
		return "SJ"
	}
	if(dataId >= 100097 && dataId<=100120){
		return "SR"
	}
	if(dataId > 100120 && dataId < 100150){
		return "ST"
	}
	if(dataId>=6110000 && dataId<=6113015){
		return "BW"
	}
	if(dataId>=6120000 && dataId<=6123015){
		return "BJ"
	}
	if(dataId>=6130000 && dataId<=6133015){
		return "BR"
	}
	if(dataId>=6140000 && dataId<=6143015){
		return "BT"
	}
}

const checkMints = (number) => {
	if(number == 0){
		return "MINT0"
	}
	if(number == 1){
		return "DEEE1"
	}
	if(number > 1){
		return "BASE"
	}
}
//RUNNER CHEAP : 38
//RUNNER MINT0 : 45
//RUNNER MINT1 : 48
const U_MINT0WALKER = 2.5 //40.5
const U_MINT0JOGGER = 4 //42
const U_MINT0ALL = 7 //45
const U_MINT0RUNNER = 0.5 //38.5

//PRICERAC: 8.1
//RUNNER0: 10.66
//RUNNER1: 11
const C_MINT0WALKER = 0.1 //8.2
const C_MINT0JOGGER = 0.2 //8.3
const C_MINT0ALL = 2 //10.1
const C_MINT0RUNNER = -0.5 //7.6

//FEE MINT0 => MINT1: 0.8BNB

const C_MINT1WALKER = 1.5 //9.6
const C_MINT1JOGGER = 1.9 //10
const C_MINT1ALL = 2.5 //10.6
const C_MINT1RUNNER = 1 //9.1

let list_config = [];
let listf = [];
////////////////////////////////////////////////
// const listShoes_B = async () => {
	// while(1){
		// var mconfig = list_config[tokenBuyMint()];
		// if(mconfig != undefined) {
			// mconfig.headers.version1 = lastVersion1;
			// mconfig.proxy= { host: "127.0.0.1", port: 10001 }
			// await sleep(Math.floor(Math.random() * (2000 - 1000) + 1000))
			// try{
				// var resp = await axios.get("https://apilb.stepn.com/run/orderlist?order=1002&type=600&chain=104&refresh=true", mconfig);
				// await listShoesB(resp.data, "X-ListShoe");
			// }catch(err){
				// console.log("socket err");
				// await sleep(10000)
			// }
		// }else{
			// await sleep(1000)
		// }
		
	// }
// };

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
const listShoesB = async (_content, typeC) => {
	try{
		var list = JSON.parse(JSON.stringify(_content));
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
		console.log(e.message);
	}
};
const buyShoes = async (OrderId, price, _config, _chain) => {
	try{
		const resp = await axios.get(`https://apilb.stepn.com/run/buyprop?orderID=${OrderId}&price=${price}`, list_config[tokenBuyMint(_chain)]);
		if(resp.data.code == 0){
			updateBuyMint(lastBuyer, _chain);
		}
		return JSON.stringify(resp.data)
	}catch{console.log("buyShoes err")}
	return JSON.stringify({})
};

keyQueue.process(3, async (job, done) => {
	const data = job.data;
	try {
		
		console.log('Sheet operation done');
		done();
		
		return;
	} catch (error) {
		console.log('Sheet operation error', error);
		console.log();
		throw new Error('retry')
	}
});

const _EVIP = "hongminh018@cenog.info"
const _EVIP_BSC = "hongminh20@cenog.info"

let buyR = false;
const checkShoes = async (bId, price, _chain) => {
	const type = checkTypes(bId.dataID);
	if(type == undefined) return;
	//const typeMints = checkMints(bId.mint);
	var chain = type[0] == "B" ? 2 : 1;
	if(chain == 2){ //BNB
		console.log(type);
		if(Number(bId.otd)>=10000 && Number(bId.otd)<=20000){
			if(price<10){
				const x = await buyShoes(bId.id, bId.sellPrice, chain);
				bot.sendMessage('626894099', `#B_BUY_GENESIS ${type} | (${price})  - ${bId.otd} ${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
				bot.sendMessage('626894099', x, {parse_mode: 'HTML'});
			}else{
				sendDetailShoesCommon(bId.id, bId.propID, `GENESISB`, bId.sellPrice, bId, chain, false)
			}
			return;
		}
		if(Number(bId.otd)>20000 && Number(bId.otd)<=30000){
			if(price<10){
				sendDetailShoesCommon(bId.id, bId.propID, `AIRDROPB`, bId.sellPrice, bId, chain, false)
			}
			return;
		}
		if(bId.level >12 && price<15){ //tim giầy mới bỏ runner
			console.log("checked");
			sendDetailShoesCommon(bId.id, bId.propID, `BNB_LEVEL`, bId.sellPrice, bId, chain, false)
			return;z
		}
	}else{
		if(Number(bId.otd)<=10001){
			if(price<50){
				const x = await buyShoes(bId.id, bId.sellPrice, chain);
				bot.sendMessage('626894099', `#S_BUY_GENESISS ${type} | (${price})  - ${bId.otd} ${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
				bot.sendMessage('626894099', x, {parse_mode: 'HTML'});
			}else{
				bot.sendMessage('626894099', `#S_FOUND_GENESISS ${type} | (${price}) - ${bId.otd} ${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
			}
		}
		if(price < priceRac+1 && bId.level >20){
			const x = await buyShoes(bId.id, bId.sellPrice, chain);
			bot.sendMessage('626894099', x, {parse_mode: 'HTML'});
			bot.sendMessage('626894099', `#S_BUY_LEVEL HIGH ${bId.level} (${price}) - ${bId.otd}` , {parse_mode: 'HTML'});
			return;
		}
		if(bId.level >15){ //tim giầy mới bỏ runner
			if(price < priceRac+1){
				sendDetailShoesCommon(bId.id, bId.propID, `SOL_LEVEL`, bId.sellPrice, bId, chain, false)
			}
		}
	}

};

const ButtonBuy = (bId, chain)=>{
	return `|<a href='https://telegram.me/${botName}?start=${bId.id}x${bId.sellPrice}x${chain}'>Buy</a>`;
}

const Roundless = (number)=>{
	return parseInt(number / 10, 10) * 10;
}

let listTokenShoes = {}
let lastBuyer;
try {
  listTokenShoes = JSON.parse(fs.readFileSync('_listTokenShoes.txt', 'utf8'));
} catch(e){console.log(e)}
console.log(listTokenShoes);
const tokenBuyMint = (_chain) => {
	// return _EVIP_BSC;
	if(_chain == 2){
		for (const [key, value] of Object.entries(listTokenShoes.buybsc)) {
			if(value>0){
				lastBuyer = key;
				return key;
			}
		}
	}else{
		for (const [key, value] of Object.entries(listTokenShoes.buy)) {
			if(value>0){
				lastBuyer = key;
				return key;
			}
		}
	}

	//bot.sendMessage('626894099', `#HET ACC MUA R!`, {parse_mode: 'HTML'});
	return ""
};
const statusBuyMint = async () => {
	while(1){
		keyQueue.empty();
		listf.length = 0;
		console.log("lastBuyer", lastBuyer, tokenBuyMint(1), tokenBuyMint(2));
		await sleep(1000*60*10);
	}
	return ""
};

const updateBuyMint = (key, _chain) => {
	if(chain ==2){
		listTokenShoes.buybsc[key] = listTokenShoes.buy[key]-1;
	}else{
		listTokenShoes.buy[key] = listTokenShoes.buy[key]-1;
	}
	fs.writeFileSync('_listTokenShoes.txt', JSON.stringify(listTokenShoes,null,0));
	lastBuyer = null;
};
const sendDetailShoesCommon = async (_OrderId, _Id, _type, _price, _bId, _chain, _buy) => {
	try{
		const obj = {OrderId:_OrderId, Id: _Id, type: _type, price: _price, bid: _bId, chain: _chain, buy: _buy }
		const OrderId = obj.OrderId;
		const Id  = obj.Id
		const type  = obj.type
		const price  = obj.price
		const buy  = obj.buy
		const bId  = obj.bid
		const chain = obj.chain

		if(list_config[tokenBuyMint(chain)]== undefined){
			 throw new Error('retry')
		}
		var resp = await axios.get("https://apilb.stepn.com/run/orderdata?orderId=" + OrderId, list_config[tokenBuyMint(chain)]);
		var list = JSON.parse(JSON.stringify(resp.data));
		console.log("sendDetailShoesCommonBull-"+chain, list.code, price/1000000, type,list_config[tokenBuyMint(chain)]);
		if(list.code == 0){
			const aRes = Roundless(list.data.attrs[3]) + Roundless(list.data.attrs[7]);
			const aBase = Roundless(list.data.attrs[0])+Roundless(list.data.attrs[3]);
			const aLuckComfort = Roundless(list.data.attrs[5])+Roundless(list.data.attrs[6]);
			const total = list.data.attrs[0] + list.data.attrs[1] + list.data.attrs[3]
			const subtal = aBase;
			const sprice = price/1000000;
			const hole = list.data.holes.map(function(o) { return o.type })
			const rate = subtal/sprice;
			const hEff = hole.filter(function(ele){ return ele == 1 });
			const typex = checkTypes(bId.dataID);
			if(chain == 2){
				// if(bId.quality>1 && bId.mint == 0 && (typex == "BJ" || typex == "BW") && sprice< priceBSCUncom0-3){
					// const x = await buyShoes(bId.id, bId.sellPrice, chain);
					// bot.sendMessage('626894099', "#Uncommon cheap" + x, {parse_mode: 'HTML'});
				// }
				if(type == "BNB_LEVEL"){
					console.log("check");
					if(aLuckComfort==0 && aBase>=120 && aRes<=140 && sprice <=5){
						if(typex == "BJ" || typex == "BT"){
							const x = await buyShoes(bId.id, bId.sellPrice, chain);
							bot.sendMessage('626894099', x, {parse_mode: 'HTML'});
						}
						bot.sendMessage('626894099', `#B_BUY_${type} - ${typex} - (${sprice}) + ` + `[${aLuckComfort}|${aBase}|${aRes}]` + list.data.level + " | " + list.data.breed +`${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
					}else{
						bot.sendMessage('626894099', `#B_FOUND_${type} - ${typex} - (${sprice}) + ` + `[${aLuckComfort}|${aBase}|${aRes}] ` + list.data.level + " | " + list.data.breed + `${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
					}

					return;
				}
				if(bId.level > 15){
					bot.sendMessage('626894099', `#B_FOUND_${type} - ${typex} - (${sprice}) + ` + `[${aLuckComfort}|${aBase}|${aRes}]` + " | " + total + " | " + subtal + " | " + list.data.level + " | " + list.data.breed + " | " + rate + "|"+ JSON.stringify(hole) + " | " + hEff.length + `${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
					return;
				}
				if(type == "AIRDROPB" || type == "GENESISB"){
					bot.sendMessage('626894099', `#B_FOUND_${type} - ${typex} - (${sprice}) + ` + `[${aLuckComfort}|${aBase}|${aRes}]` + " | " + total + " | " + subtal + " | " + list.data.level + " | " + list.data.breed + " | " + rate + "|"+ JSON.stringify(hole) + " | " + hEff.length + `${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
					return;
				}
			}else{
				if(type == "SOL_LEVEL"){
					if(aLuckComfort==0 && aBase>=120 && aRes<=200){
						if(typex == "SJ" || typex == "SW" || typex == "BT"){
							bot.sendMessage('626894099', `#S_FOUND_${type} - ${typex} - (${sprice}) + ` + `[${aLuckComfort}|${aBase}|${aRes}]` + " | " + total + " | " + subtal + " | " + list.data.level + " | " + list.data.breed + " | " + rate + "|"+ JSON.stringify(hole) + " | " + hEff.length + `${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
						}
					}
				}
				if (buy){
					// if(type == "Common SOLRAC"){
						// var resp = await axios.get(`https://apilb.stepn.com/run/buyprop?orderID=${OrderId}&price=${price}`, list_config[_EVIP_BSC]);
						// if(resp.data.code == 0){
							// updateBuyMint(lastBuyer);
						// }
						// var buyRes = JSON.parse(JSON.stringify(resp.data));
						// bot.sendMessage('626894099', `#S_BUY_${type} - (${sprice}) + ` + JSON.stringify(list.data.attrs) + " | " + total + " | " + subtal + " | " + list.data.level + " | " + list.data.breed + " | " + rate + "|"+ JSON.stringify(hole) + " | " + hEff.length + `${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
					// }
				}
				else{
					bot.sendMessage('626894099', `#S_FOUND_${type} - ${typex} - (${sprice}) |${bId.otd}|+ ` + JSON.stringify(list.data.attrs) + " | " + total + " | " + subtal + " | " + list.data.level + " | " + list.data.breed + " | " + rate + "|"+ JSON.stringify(hole) + " | " + hEff.length + `${ButtonBuy(bId, chain)}`, {parse_mode: 'HTML'});
				}
			}
			
		}
		// await keyQueue.add(obj, {
			// removeOnComplete: true,
			// attempts: 5, // If job fails it will retry till 5 times
			// backoff: 3000 // static 10 sec delay between retry
		// });
		
		
	}catch(e){console.log("sendDetailShoesCommon err",e)}
	
	return false;
};

let list_upgradepending = [];
const sendUpgrades = async () => {
	await sleep(5000);
	console.log("**** start sendUpgrades");
	sendUpgradesPer("goodmanb@cenog.info");

}
//https://104.18.10.119GET /run/baglist HTTP/1.1
let list_upgraded = []
let list_leveling = []
const sendUpgradesPer = async (sid) => {
	console.log(`**** start sendUpgradesPer ${sid}`);
	await sleep(10000)
	console.log(`**** OK sendUpgradesPer ${sid}`);
	let _Listid = []
	while(1){
		try{
			const xx = (await getBaglist(sid));
			console.log(xx);
			if(xx.code == 0){
				for(var x = 0; x < xx.data.length; x++){
					_Listid.push(xx.data[x].id);
				}
				
			}
		}catch{}
		if(_Listid.length>0) {
			break;
		}
		await sleep(4000);
	}
	console.log(sid, _Listid);
	let levelingtime = 0;
	while(1){
		let leveling = 0;
		try {
			const mconfig = list_config[sid]; //hongminh
			if(mconfig === undefined){
				await sleep(5000)
				continue
			}
			
			for (const ele of _Listid){
				const id = ele[0];
				const _level = ele[1];
				const _addpoint = ele[2];
				if(list_upgraded.includes(id)) continue
				resp = await axios.get(`https://apilb.stepn.com/run/shoedata?id=${id}&isShowD=true`, mconfig);
				list = JSON.parse(JSON.stringify(resp.data));
				if (list.code == 0){
					if (list.data.level >= _level){
						list_upgraded.push(id)
						console.log(`level ${level}`, id);
					}else{
						if(list.data.remain>0 && list.data.endTime==0 && _addpoint){
							const rPoint = await axios.get(`https://apilb.stepn.com/run/shoeupdate?id=${id}&type=8&v1=1&v2=${list.data.remain}`, mconfig);
							const rPointRes = JSON.stringify(rPoint.data);
							bot.sendMessage('626894099', `#addPoint failed: ${sid} ${rPointRes}`);
						}
						if(list.data.endTime>0){
							leveling++;
							levelingtime = list.data.endTime - Math.floor(Date.now());
						}else if(list.data.price == 0 && list.data.level <= _level-1 && !list_upgradepending.includes(id)){
							axios.get(`https://apilb.stepn.com/run/shoeupdate?id=${id}&type=1&getinfo=false`, mconfig).then(async (result) => {
								list = JSON.parse(JSON.stringify(result.data));
									if(list.code != 0){
										list_upgradepending.push(id);
										bot.sendMessage('626894099', `#upgrade failed: ${sid} ${list.code} (${list.msg})`);
										await sleep(60000*5);
										list_upgradepending = list_upgradepending.filter(function(ele){ 
											return ele != id; 
										});
									}else{
										bot.sendMessage('626894099', `#upgrade result: ${sid} ${list.code} (${list.msg})`);
									}
								});
						}
					}
				}
			}
		}catch{}
		if (leveling==0){
			bot.sendMessage('626894099', `#finish result: ${sid}: Hoang thành`);
		}
		if (leveling>0){
			console.log(`*** WAITING ${sid}: ${levelingtime}`)
			bot.sendMessage('626894099', `#waitting result: ${sid}: ${levelingtime}`);
			await sleep(levelingtime)
		}else{
			await sleep(10000)
		}
	}
}

bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"
   
  const orderID = resp.split('x')[0]
  const price = resp.split('x')[1]
  const chain = resp.split('x')[2]
  const mconfig = list_config[tokenBuyMint(chain)];
  list_config.map(function(o) { return o.cookie })
  try{
	  var respB = await axios.get(`https://apilb.stepn.com/run/buyprop?orderID=${orderID}&price=${price}`, mconfig);
	  if(respB.data.code == 0){
		updateBuyMint(lastBuyer, chain);
	  }
	  bot.sendMessage(chatId, JSON.stringify(respB.data))
  }catch(e){
	  bot.sendMessage(chatId, e.message)
  }
});
bot.onText(/\/check/, async (msg, match) => {
	console.log()
});
const start = async () => {
	statusBuyMint();
	proxy.listen({
		port: 8082
	});
	sendCharles();
	//sendUpgrades();
	//listShoes_B();
	//updateRac();
	updateMint0();
	
	//sendGetRequest();
};

start()